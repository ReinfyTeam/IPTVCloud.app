#!/usr/bin/env bash
set -euo pipefail

# ════════════════════════════════════════════════════════════════
# IPTV-ORG EPG FAST MULTI-SITE EPG GRABBER
# Optimized for speed / CI / GitHub Actions
# ════════════════════════════════════════════════════════════════

SCRIPT_START_TIME=$(date +%s)

# ── Config ───────────────────────────────────────────────────── 
REPO_URL="https://github.com/iptv-org/epg"

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="$BASE_DIR/epg"
OUTPUT_DIR="$BASE_DIR/sites"
LOG_DIR="$OUTPUT_DIR/logs"

GENERATE_SCRIPT="$BASE_DIR/content.py"
CONTENT_JSON="$OUTPUT_DIR/content.json"
SITES_MD="$WORK_DIR/SITES.md"

# Optional proxy:
# export PROXY_URL="http://127.0.0.1:8080"
PROXY_URL="${PROXY_URL:-}"

# Grab tuning
DELAY="${DELAY:-300}"
TIMEOUT="${TIMEOUT:-5000}"
MAX_CONN="${MAX_CONN:-20}"

# Retry tuning
MAX_RETRIES="${MAX_RETRIES:-10}"         # max attempts per site
RETRY_BACKOFF_BASE="${RETRY_BACKOFF_BASE:-5}"   # base seconds to wait between retries
CONN_BACKOFF_FACTOR="${CONN_BACKOFF_FACTOR:-2}" # divide maxConnections by this on rate-limit
MIN_CONN="${MIN_CONN:-1}"               # floor for maxConnections when backing off

# ── Dynamic Worker Detection ────────────────────────────────────
detect_workers() {
  local cpus mem_gb workers

  # CPU count (cross-platform)
  if command -v nproc >/dev/null 2>&1; then
    cpus=$(nproc)
  elif [[ -f /proc/cpuinfo ]]; then
    cpus=$(grep -c ^processor /proc/cpuinfo)
  else
    cpus=2
  fi

  # Memory in GB
  if [[ -f /proc/meminfo ]]; then
    mem_gb=$(awk '/MemTotal/ { printf "%d", $2/1024/1024 }' /proc/meminfo)
  elif command -v free >/dev/null 2>&1; then
    mem_gb=$(free -g | awk '/^Mem:/ { print $2 }')
  else
    mem_gb=4
  fi

  # GitHub Actions runners:
  #   Standard:  2 vCPU,  7 GB  → 6 workers
  #   Large:     4 vCPU, 16 GB  → 12 workers
  #   XLarge:    8 vCPU, 32 GB  → 20 workers
  # Formula: workers = min(cpu*3, mem_gb*1.5) capped at 32
  local cpu_based=$(( cpus * 3 ))
  local mem_based=$(( mem_gb * 3 / 2 ))
  workers=$(( cpu_based < mem_based ? cpu_based : mem_based ))
  [[ $workers -lt 1  ]] && workers=1
  [[ $workers -gt 32 ]] && workers=32

  echo "$workers"
}

PARALLEL="${PARALLEL:-$(detect_workers)}"

# ── Colors ─────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

log()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()   { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()    { echo -e "${RED}[ERR]${NC}   $*" >&2; }
site()   { echo -e "${CYAN}[SITE]${NC}  $*"; }
skipped(){ echo -e "${MAGENTA}[SKIP]${NC}  $*"; }

# ── Elapsed time helper ─────────────────────────────────────────
elapsed_since() {
  local start=$1
  local now
  now=$(date +%s)
  local secs=$(( now - start ))
  printf "%dm%02ds" $(( secs / 60 )) $(( secs % 60 ))
}

# ── Cleanup ────────────────────────────────────────────────────
cleanup() {
  if [[ "${KEEP_REPO:-0}" != "1" ]]; then
    if [[ -d "$WORK_DIR" ]]; then
      log "Cleaning repo..."
      rm -rf "$WORK_DIR"
    fi
  fi
}
trap cleanup EXIT

# ── Dependency Check ───────────────────────────────────────────
for cmd in git npm python3 grep sed sort wc xargs curl; do
  command -v "$cmd" >/dev/null 2>&1 || {
    err "Missing command: $cmd"
    exit 1
  }
done

# ── Prepare ────────────────────────────────────────────────────
mkdir -p "$OUTPUT_DIR"
mkdir -p "$LOG_DIR"

# ── Clone / Update Repo ────────────────────────────────────────
if [[ -d "$WORK_DIR/.git" ]]; then
  log "Updating existing repo..."
  git -C "$WORK_DIR" fetch --depth 1 origin master >/dev/null 2>&1 || true
  git -C "$WORK_DIR" reset --hard origin/master >/dev/null 2>&1 || true
else
  log "Cloning iptv-org/epg..."
  git clone --depth 1 "$REPO_URL" "$WORK_DIR"
fi

cd "$WORK_DIR"

# ── Install Dependencies ───────────────────────────────────────
log "Installing npm dependencies..."
npm ci --silent

# ── Read Online Sites ──────────────────────────────────────────
log "Reading online providers..."

mapfile -t ONLINE_SITES < <(
  grep '🟢' "$SITES_MD" |
  sed -n 's#.*href="sites/\([^"]*\)".*🟢.*#\1#p' |
  sort -u
)

if [[ ${#ONLINE_SITES[@]} -eq 0 ]]; then
  err "No online sites found."
  exit 1
fi

# ── Extract EPG URL per site ───────────────────────────────────
# Reads the config.js / channels.xml inside each site folder
extract_site_url() {
  local site_dir="$WORK_DIR/sites/$1"
  local url=""

  # Try site config files in order of priority
  for f in "$site_dir/config.js" "$site_dir/index.js" "$site_dir/site.js"; do
    if [[ -f "$f" ]]; then
      url=$(grep -oP '(?<=url:\s['"'"'"`])[^'"'"'"`]+' "$f" 2>/dev/null | head -1 || true)
      [[ -n "$url" ]] && break
    fi
  done

  # Fallback: check for a base URL pattern in any .js
  if [[ -z "$url" ]]; then
    url=$(grep -rhoP 'https?://[^\s'"'"'"`,)]+' "$site_dir/"*.js 2>/dev/null | head -1 || true)
  fi

  echo "${url:-unknown}"
}

# ── Pre-flight geo-block / reachability check ──────────────────
# Returns: ok | geo | err404 | err500 | ratelimit | unknown
probe_url() {
  local url="$1"
  [[ "$url" == "unknown" ]] && echo "unknown" && return

  local http_code
  http_code=$(curl -sSo /dev/null -w "%{http_code}" \
    --max-time 8 \
    --connect-timeout 5 \
    -A "Mozilla/5.0 (compatible; EPG-Grabber/1.0)" \
    ${PROXY_URL:+--proxy "$PROXY_URL"} \
    "$url" 2>/dev/null || echo "000")

  case "$http_code" in
    200|206)             echo "ok" ;;
    301|302|303|307|308) echo "ok" ;;  # redirects → probably fine
    403)                 echo "geo" ;; # often geo-block / forbidden
    404)                 echo "err404" ;;
    429)                 echo "ratelimit" ;;
    451)                 echo "geo" ;;  # HTTP 451 = legal/geo block
    5[0-9][0-9])         echo "err5xx:$http_code" ;;
    000)                 echo "unreachable" ;;
    *)                   echo "http:$http_code" ;;
  esac
}

# ── Keep Valid Site Folders ────────────────────────────────────
SITES=()
declare -A SITE_URL_MAP

for SITE_NAME in "${ONLINE_SITES[@]}"; do
  if [[ -d "$WORK_DIR/sites/$SITE_NAME" ]]; then
    SITES+=("$SITE_NAME")
    SITE_URL_MAP["$SITE_NAME"]=$(extract_site_url "$SITE_NAME")
  fi
done

TOTAL="${#SITES[@]}"

if [[ "$TOTAL" -eq 0 ]]; then
  err "No valid site folders found."
  exit 1
fi

log "Found $TOTAL valid online sites"
log "Dynamic workers: ${BOLD}$PARALLEL${NC} (CPU: $(nproc 2>/dev/null || echo '?'), RAM: $(awk '/MemTotal/{printf "%dGB",$2/1024/1024}' /proc/meminfo 2>/dev/null || echo '?'))"

# ── Export for Parallel Workers ────────────────────────────────
export WORK_DIR OUTPUT_DIR LOG_DIR PROXY_URL DELAY TIMEOUT MAX_CONN SCRIPT_START_TIME \
       MAX_RETRIES RETRY_BACKOFF_BASE CONN_BACKOFF_FACTOR MIN_CONN

# ── Shared counters via temp files ─────────────────────────────
COUNTER_DIR=$(mktemp -d)
echo 0 > "$COUNTER_DIR/ok"
echo 0 > "$COUNTER_DIR/fail"
echo 0 > "$COUNTER_DIR/skip"
export COUNTER_DIR

# ── Error classifier (reads a log file, prints reason token) ───
classify_log() {
  local log="$1"
  if grep -qiE "(429|rate.?limit|too many requests)" "$log" 2>/dev/null; then
    echo "RATELIMIT"
  elif grep -qiE "(403|451|geo.?block|not available in your (country|region)|access denied)" \
         "$log" 2>/dev/null; then
    echo "GEO"
  elif grep -qiE "(404|not found)" "$log" 2>/dev/null; then
    echo "404"
  elif grep -qiE "(500|502|503|504|bad gateway|service unavailable)" "$log" 2>/dev/null; then
    echo "5XX"
  else
    echo "ERROR"
  fi
}
export -f classify_log

# ── Worker Function (with retry + adaptive maxConnections) ─────
#
#  Retry strategy per attempt:
#    RATELIMIT → halve maxConnections (floor MIN_CONN),
#                exponential back-off sleep,
#                retry up to MAX_RETRIES
#    GEO / 404 → no retry, bail immediately
#    5XX / ERR → linear back-off, retry up to MAX_RETRIES
#    EMPTY     → short wait, retry up to MAX_RETRIES
#
#  Result token format (pipe-delimited):
#    PASS|name|bytes|progs|elapsed|attempts|final_conn|url
#    SKIP|name|reason|elapsed|attempts|url
#    FAIL|name|reason|elapsed|attempts|final_conn|url
# ──────────────────────────────────────────────────────────────
run_site() {
  local SITE_NAME="$1"
  local SITE_URL="$2"

  cd "$WORK_DIR"

  local OUTPUT_FILE="$OUTPUT_DIR/${SITE_NAME}.xml"
  local LOG_FILE="$LOG_DIR/${SITE_NAME}.log"
  local RETRY_LOG_DIR="$LOG_DIR/${SITE_NAME}_retries"
  mkdir -p "$RETRY_LOG_DIR"

  local SITE_START
  SITE_START=$(date +%s)

  # Per-site mutable connection count — starts at global MAX_CONN
  local cur_conn="$MAX_CONN"
  local attempt=0
  local last_reason="ERROR"

  while [[ $attempt -lt $MAX_RETRIES ]]; do
    attempt=$(( attempt + 1 ))
    local attempt_log="$RETRY_LOG_DIR/attempt_${attempt}.log"

    local CMD=(
      npm run grab --
      --sites="$SITE_NAME"
      --output="$OUTPUT_FILE"
      --delay="$DELAY"
      --timeout="$TIMEOUT"
      --maxConnections="$cur_conn"
    )
    [[ -n "$PROXY_URL" ]] && CMD+=(--proxy="$PROXY_URL")

    # ── Run grab ──────────────────────────────────────────────
    local exit_ok=0
    "${CMD[@]}" > "$attempt_log" 2>&1 || exit_ok=1
    cp "$attempt_log" "$LOG_FILE"   # always keep latest log as canonical

    local elapsed=$(( $(date +%s) - SITE_START ))

    # ── Classify what happened ────────────────────────────────
    local reason
    reason=$(classify_log "$attempt_log")

    # Check for geo-block even on exit 0
    if [[ "$reason" == "GEO" ]]; then
      echo "SKIP|$SITE_NAME|GEO|${elapsed}s|${attempt}|$SITE_URL"
      return
    fi

    # 404 → pointless to retry
    if [[ "$reason" == "404" ]]; then
      echo "FAIL|$SITE_NAME|404|${elapsed}s|${attempt}|${cur_conn}|$SITE_URL"
      return
    fi

    # Success path (exit 0 AND non-empty output AND no error in log)
    if [[ $exit_ok -eq 0 && -s "$OUTPUT_FILE" && "$reason" == "ERROR" ]]; then
      # "ERROR" here means classify_log found nothing bad → clean run
      local BYTES PROGS
      BYTES=$(wc -c < "$OUTPUT_FILE")
      PROGS=$(grep -c '<programme' "$OUTPUT_FILE" 2>/dev/null || true)
      echo "PASS|$SITE_NAME|$BYTES|$PROGS|${elapsed}s|${attempt}|${cur_conn}|$SITE_URL"
      return
    fi

    last_reason="$reason"

    # ── Retry decision + back-off ─────────────────────────────
    if [[ $attempt -ge $MAX_RETRIES ]]; then
      break
    fi

    local sleep_secs backoff_msg

    case "$reason" in
      RATELIMIT)
        # Halve connections, floor at MIN_CONN
        local new_conn=$(( cur_conn / CONN_BACKOFF_FACTOR ))
        [[ $new_conn -lt $MIN_CONN ]] && new_conn=$MIN_CONN
        cur_conn=$new_conn
        # Exponential back-off: base * 2^(attempt-1), capped at 120s
        sleep_secs=$(( RETRY_BACKOFF_BASE * ( 1 << (attempt - 1) ) ))
        [[ $sleep_secs -gt 120 ]] && sleep_secs=120
        backoff_msg="rate-limited → conn=${cur_conn}, wait ${sleep_secs}s"
        ;;
      5XX)
        # Linear back-off, keep connections
        sleep_secs=$(( RETRY_BACKOFF_BASE * attempt ))
        [[ $sleep_secs -gt 60 ]] && sleep_secs=60
        backoff_msg="5xx error → wait ${sleep_secs}s"
        ;;
      EMPTY)
        sleep_secs=$(( RETRY_BACKOFF_BASE ))
        backoff_msg="empty output → wait ${sleep_secs}s"
        ;;
      *)
        sleep_secs=$(( RETRY_BACKOFF_BASE * attempt ))
        [[ $sleep_secs -gt 60 ]] && sleep_secs=60
        backoff_msg="error → wait ${sleep_secs}s"
        ;;
    esac

    # Emit a live RETRY line so the parent can print progress
    echo "RETRY|$SITE_NAME|${attempt}|${MAX_RETRIES}|${last_reason}|${cur_conn}|${backoff_msg}"

    sleep "$sleep_secs"
  done

  # All retries exhausted
  local elapsed=$(( $(date +%s) - SITE_START ))
  echo "FAIL|$SITE_NAME|${last_reason}|${elapsed}s|${attempt}|${cur_conn}|$SITE_URL"
}

export -f run_site

# ── Geo-block pre-check (parallel, fast) ──────────────────────
log "Pre-checking site reachability (geo/404/rate-limit detection)..."

PRECHECK_FILE="$OUTPUT_DIR/precheck.tmp"
> "$PRECHECK_FILE"

precheck_site() {
  local site_name="$1"
  local url="$2"
  local status
  status=$(probe_url "$url")
  echo "$site_name|$url|$status"
}
export -f precheck_site
export -f probe_url

PRECHECK_INPUT=$(mktemp)
for s in "${SITES[@]}"; do
  echo "$s|${SITE_URL_MAP[$s]}"
done > "$PRECHECK_INPUT"

# Run pre-checks at 2x worker count (they're just HTTP HEAD requests)
awk -F'|' '{print $1, $2}' "$PRECHECK_INPUT" \
| xargs -n2 -P $(( PARALLEL * 2 )) bash -c 'precheck_site "$@"' _ \
>> "$PRECHECK_FILE"

rm -f "$PRECHECK_INPUT"

# Parse pre-check; build final run list + skip list
declare -a RUN_SITES=()
declare -a SKIPPED_GEO=()
declare -a SKIPPED_404=()
declare -a SKIPPED_5XX=()
declare -a WARNED_RATELIMIT=()

while IFS='|' read -r sname surl sstatus; do
  case "$sstatus" in
    geo|http:403|http:451)
      SKIPPED_GEO+=("$sname ($surl)")
      skipped "$sname → geo-blocked (${sstatus}), skipping"
      ;;
    err404|http:404)
      SKIPPED_404+=("$sname ($surl)")
      skipped "$sname → 404 not found ($surl), skipping"
      ;;
    err5xx:*|ratelimit)
      # Don't skip; just warn — may recover
      WARNED_RATELIMIT+=("$sname ($surl → $sstatus)")
      warn "$sname → $sstatus detected, will still attempt"
      RUN_SITES+=("$sname")
      ;;
    unreachable)
      SKIPPED_5XX+=("$sname ($surl)")
      skipped "$sname → unreachable, skipping"
      ;;
    *)
      RUN_SITES+=("$sname")
      ;;
  esac
done < "$PRECHECK_FILE"

rm -f "$PRECHECK_FILE"

SKIP_COUNT=$(( ${#SKIPPED_GEO[@]} + ${#SKIPPED_404[@]} + ${#SKIPPED_5XX[@]} ))
RUN_COUNT="${#RUN_SITES[@]}"

log "Pre-check done: ${RUN_COUNT} to run, ${SKIP_COUNT} pre-skipped"
echo ""

# ── Parallel Execution ─────────────────────────────────────────
log "Running parallel fetch ($PARALLEL workers) on $RUN_COUNT sites..."
echo ""

RESULTS_FILE="$OUTPUT_DIR/results.tmp"
> "$RESULTS_FILE"

# Build args: "sitename url" per line for xargs
ARGS_FILE=$(mktemp)
for s in "${RUN_SITES[@]}"; do
  echo "$s|${SITE_URL_MAP[$s]:-unknown}"
done > "$ARGS_FILE"

awk -F'|' '{print $1, $2}' "$ARGS_FILE" \
| xargs -n2 -P "$PARALLEL" bash -c 'run_site "$@"' _ \
>> "$RESULTS_FILE"

rm -f "$ARGS_FILE"

# ── Parse Results ──────────────────────────────────────────────
PASS=0
FAIL=0
FAIL_GEO=0
FAIL_404=0
FAIL_RATE=0
FAIL_5XX=0
FAIL_OTHER=0
TOTAL_RETRIES=0

declare -a FAIL_LIST=()

while IFS='|' read -r STATUS SITE_NAME A B C D E F; do
  case "$STATUS" in

    # Live retry progress line — print immediately, don't count
    # Format: RETRY|name|attempt|max|reason|cur_conn|msg
    RETRY)
      printf "${YELLOW}[RETRY]${NC} %-35s  attempt %s/%s  %s  conn→%s  %s\n" \
        "$SITE_NAME" "$A" "$B" "$C" "$D" "$E"
      TOTAL_RETRIES=$(( TOTAL_RETRIES + 1 ))
      ;;

    # PASS|name|bytes|progs|elapsed|attempts|final_conn|url
    PASS)
      PASS=$(( PASS + 1 ))
      local_attempts="${D:-1}"
      local_conn="${E:-$MAX_CONN}"
      local_url="${F:-}"
      retry_tag=""
      [[ "$local_attempts" -gt 1 ]] && retry_tag=" [${local_attempts} attempts, conn=${local_conn}]"
      printf "${GREEN}[OK  %d/%d]${NC}  %-35s  %s bytes / %s progs  (%s)%s\n" \
        "$PASS" "$RUN_COUNT" "$SITE_NAME" "$A" "$B" "$C" "$retry_tag"
      ;;

    # SKIP|name|reason|elapsed|attempts|url
    SKIP)
      FAIL_GEO=$(( FAIL_GEO + 1 ))
      FAIL=$(( FAIL + 1 ))
      FAIL_LIST+=("$SITE_NAME [geo-in-log]")
      printf "${MAGENTA}[SKIP %d/%d]${NC} %-35s  geo-block in log  (%s)  after %s attempt(s)\n" \
        "$(( PASS + FAIL ))" "$RUN_COUNT" "$SITE_NAME" "$C" "$D"
      ;;

    # FAIL|name|reason|elapsed|attempts|final_conn|url
    FAIL)
      FAIL=$(( FAIL + 1 ))
      local_reason="${A:-ERROR}"
      local_attempts="${C:-1}"
      local_conn="${D:-$MAX_CONN}"
      case "$local_reason" in
        GEO)       FAIL_GEO=$(( FAIL_GEO + 1 )) ;;
        404)       FAIL_404=$(( FAIL_404 + 1 )) ;;
        RATELIMIT) FAIL_RATE=$(( FAIL_RATE + 1 )) ;;
        5XX)       FAIL_5XX=$(( FAIL_5XX + 1 )) ;;
        *)         FAIL_OTHER=$(( FAIL_OTHER + 1 )) ;;
      esac
      FAIL_LIST+=("$SITE_NAME [$local_reason, ${local_attempts} attempt(s)]")
      printf "${RED}[FAIL %d/%d]${NC} %-35s  %s  (%s)  %s attempt(s)  conn=%s\n" \
        "$(( PASS + FAIL ))" "$RUN_COUNT" "$SITE_NAME" "$local_reason" "$B" "$local_attempts" "$local_conn"
      ;;
  esac
done < "$RESULTS_FILE"

rm -f "$RESULTS_FILE"

# ── Generate content.json ──────────────────────────────────────
echo ""
log "Generating content.json..."
python3 "$GENERATE_SCRIPT" "$OUTPUT_DIR" "$CONTENT_JSON"

# ── Final elapsed ──────────────────────────────────────────────
TOTAL_ELAPSED=$(elapsed_since "$SCRIPT_START_TIME")

# ── Summary ────────────────────────────────────────────────────
GRAND_FAIL=$(( FAIL + SKIP_COUNT ))

echo ""
echo -e "${BOLD}══════════════════════════════════════════════${NC}"
printf "  ${GREEN}Passed${NC}       : %d / %d\n" "$PASS" "$TOTAL"
printf "  ${RED}Failed${NC}       : %d\n" "$FAIL"
if [[ $FAIL -gt 0 ]]; then
  [[ $FAIL_GEO  -gt 0 ]] && printf "    ├─ geo-blocked : %d\n" "$FAIL_GEO"
  [[ $FAIL_404  -gt 0 ]] && printf "    ├─ 404 not found: %d\n" "$FAIL_404"
  [[ $FAIL_RATE -gt 0 ]] && printf "    ├─ rate-limited : %d\n" "$FAIL_RATE"
  [[ $FAIL_5XX  -gt 0 ]] && printf "    ├─ 5xx errors   : %d\n" "$FAIL_5XX"
  [[ $FAIL_OTHER -gt 0 ]] && printf "    └─ other        : %d\n" "$FAIL_OTHER"
fi
printf "  ${MAGENTA}Pre-skipped${NC}  : %d\n" "$SKIP_COUNT"
if [[ $SKIP_COUNT -gt 0 ]]; then
  [[ ${#SKIPPED_GEO[@]} -gt 0 ]] && printf "    ├─ geo-blocked : %d\n" "${#SKIPPED_GEO[@]}"
  [[ ${#SKIPPED_404[@]} -gt 0 ]] && printf "    ├─ 404         : %d\n" "${#SKIPPED_404[@]}"
  [[ ${#SKIPPED_5XX[@]} -gt 0 ]] && printf "    └─ unreachable : %d\n" "${#SKIPPED_5XX[@]}"
fi
printf "  Total sites  : %d\n" "$TOTAL"
echo -e "${BOLD}──────────────────────────────────────────────${NC}"
printf "  Workers      : %s (dynamic)\n" "$PARALLEL"
printf "  Max retries  : %s per site\n" "$MAX_RETRIES"
printf "  Total retries: %s\n" "$TOTAL_RETRIES"
printf "  Delay        : %sms\n" "$DELAY"
printf "  Timeout      : %sms\n" "$TIMEOUT"
printf "  Connections  : %s (initial, adaptive)\n" "$MAX_CONN"
printf "  Min conn     : %s\n" "$MIN_CONN"
printf "  Backoff base : %ss\n" "$RETRY_BACKOFF_BASE"
printf "  Elapsed      : %s\n" "$TOTAL_ELAPSED"
printf "  Output       : %s\n" "$OUTPUT_DIR"
printf "  JSON         : %s\n" "$CONTENT_JSON"
echo -e "${BOLD}══════════════════════════════════════════════${NC}"

# ── Failed sites list ──────────────────────────────────────────
if [[ ${#FAIL_LIST[@]} -gt 0 ]]; then
  echo ""
  echo -e "${RED}Failed sites:${NC}"
  for f in "${FAIL_LIST[@]}"; do
    echo "  • $f"
  done
fi

# ── Geo-skipped list ───────────────────────────────────────────
if [[ ${#SKIPPED_GEO[@]} -gt 0 ]]; then
  echo ""
  echo -e "${MAGENTA}Geo-blocked (pre-skipped):${NC}"
  for f in "${SKIPPED_GEO[@]}"; do
    echo "  • $f"
  done
fi
