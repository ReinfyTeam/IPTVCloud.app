#!/usr/bin/env bash
set -euo pipefail

# ════════════════════════════════════════════════════════════════
# IPTV-ORG EPG FAST MULTI-SITE XML GRABBER
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
DIM='\033[2m'
WHITE='\033[0;37m'
NC='\033[0m'

log()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()   { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()    { echo -e "${RED}[ERR]${NC}   $*" >&2; }
site()   { echo -e "${CYAN}[SITE]${NC}  $*"; }
skipped(){ echo -e "${MAGENTA}[SKIP]${NC}  $*"; }

# ── Human-readable byte formatter ──────────────────────────────
# Outputs a colored string: green=GB  cyan=MB  white=KB  dim=B
format_bytes() {
  local bytes="${1:-0}"
  local result color
  if   [[ $bytes -ge 1073741824 ]]; then
    result=$(awk "BEGIN{printf \"%.2f GB\", $bytes/1073741824}")
    color='\033[0;32m'    # green
  elif [[ $bytes -ge 1048576 ]]; then
    result=$(awk "BEGIN{printf \"%.2f MB\", $bytes/1048576}")
    color='\033[0;36m'    # cyan
  elif [[ $bytes -ge 1024 ]]; then
    result=$(awk "BEGIN{printf \"%.1f KB\", $bytes/1024}")
    color='\033[0;37m'    # white
  else
    result="${bytes} B"
    color='\033[2m'       # dim
  fi
  printf "${color}%s\033[0m" "$result"
}
export -f format_bytes

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

# ── Extract EPG site info (base domain + URL count) ───────────
# Each site folder may declare many channel URLs via a url() function
# or a static list. We extract:
#   - The base hostname for display / pre-flight probe
#   - A count of unique URL patterns declared in the config
extract_site_info() {
  local site_name="$1"
  local site_dir="$WORK_DIR/sites/$site_name"
  local base_url="" url_count=0

  # Collect all https?:// patterns from every .js in the folder
  local all_urls
  all_urls=$(grep -rhoP 'https?://[^\s\'"'"'"`,){}\[\]]+' "$site_dir/"*.js 2>/dev/null \
    | grep -v 'node_modules' \
    | sort -u || true)

  url_count=$(echo "$all_urls" | grep -c 'https\?://' 2>/dev/null || echo 0)

  # Prefer the explicit `url:` field for the base domain
  for f in "$site_dir/config.js" "$site_dir/index.js" "$site_dir/site.js"; do
    if [[ -f "$f" ]]; then
      local candidate
      candidate=$(grep -oP '(?<=url:\s['"'"'"`])[^'"'"'"`]+' "$f" 2>/dev/null | head -1 || true)
      if [[ -n "$candidate" ]]; then
        base_url="$candidate"
        break
      fi
    fi
  done

  # Fallback to first URL found
  if [[ -z "$base_url" && -n "$all_urls" ]]; then
    base_url=$(echo "$all_urls" | head -1)
  fi

  # Extract just the hostname for clean display
  local host
  host=$(echo "$base_url" | grep -oP '(?<=://)([^/]+)' || echo "unknown")

  echo "${host}|${url_count}"
}

# ── Pre-flight geo-block / reachability check ──────────────────
# Only used to detect hard geo-blocks before wasting worker time.
# 404 and unreachable are NOT skipped — the npm grab may use different
# endpoint paths per channel; a base-URL probe is not authoritative.
# Returns: ok | geo | ratelimit | warn:404 | warn:unreachable | warn:5xx | unknown
probe_url() {
  local url="$1"
  [[ "$url" == "unknown" ]] && echo "unknown" && return

  # Ensure we probe just the base (scheme+host) to avoid 404 false-positives
  # from channel-specific paths that don't exist at root
  local base
  base=$(echo "$url" | grep -oP '^https?://[^/]+' || echo "$url")

  local http_code
  http_code=$(curl -sSo /dev/null -w "%{http_code}" \
    --max-time 8 \
    --connect-timeout 5 \
    -A "Mozilla/5.0 (compatible; EPG-Grabber/1.0)" \
    ${PROXY_URL:+--proxy "$PROXY_URL"} \
    "$base" 2>/dev/null || echo "000")

  case "$http_code" in
    200|206|301|302|303|307|308) echo "ok" ;;
    403)                         echo "geo" ;;   # blocked before even trying
    451)                         echo "geo" ;;   # legal/geo block
    429)                         echo "ratelimit" ;;
    404)                         echo "warn:404" ;;   # warn only — grab still runs
    5[0-9][0-9])                 echo "warn:5xx:$http_code" ;;
    000)                         echo "warn:unreachable" ;;
    *)                           echo "ok" ;;    # unknown → assume ok, let grab decide
  esac
}

# ── Keep Valid Site Folders ────────────────────────────────────
SITES=()
declare -A SITE_HOST_MAP    # base hostname for probe / display
declare -A SITE_URLCOUNT_MAP  # number of unique URL patterns in config

for SITE_NAME in "${ONLINE_SITES[@]}"; do
  if [[ -d "$WORK_DIR/sites/$SITE_NAME" ]]; then
    SITES+=("$SITE_NAME")
    IFS='|' read -r _host _count < <(extract_site_info "$SITE_NAME")
    SITE_HOST_MAP["$SITE_NAME"]="${_host:-unknown}"
    SITE_URLCOUNT_MAP["$SITE_NAME"]="${_count:-0}"
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

# ── Multi-URL aware log classifier ─────────────────────────────
# Each npm grab fetches many URLs (one per channel). The log contains
# one result line per URL. We count occurrences of each error class
# across ALL URLs in the log, then return the dominant reason.
#
# Decision rules (in priority order):
#   GEO       — any geo signal → bail, no retry
#   RATELIMIT — any 429/rate-limit lines → back off and retry
#   5XX       — majority of errors are 5xx → retry
#   404       — ALL non-empty responses are 404 → fail (pointless to retry)
#               but if only SOME are 404 (partial) → treat as partial success
#               or other error and keep retrying
#   ERROR     — fallback
#
# Prints: GEO | RATELIMIT | 5XX | 404 | PARTIAL_404 | ERROR
# Also prints URL stats to stderr for the retry log
classify_log() {
  local log="$1"

  # Count each error class
  local n_geo n_rate n_5xx n_404 n_ok n_total_lines
  n_geo=$(grep -ciE \
    "(403 Forbidden|451|geo.?block|not available in your (country|region)|access denied|region restricted)" \
    "$log" 2>/dev/null || echo 0)
  n_rate=$(grep -ciE \
    "(429|rate.?limit|too many requests|quota exceeded|slow.?down)" \
    "$log" 2>/dev/null || echo 0)
  n_5xx=$(grep -ciE \
    "(HTTP 5[0-9][0-9]|status.*5[0-9][0-9]|500 Internal|502 Bad|503 Service|504 Gateway)" \
    "$log" 2>/dev/null || echo 0)
  n_404=$(grep -ciE \
    "(404 Not Found|HTTP 404|status.*404|no such channel|endpoint not found)" \
    "$log" 2>/dev/null || echo 0)
  # Rough success-line count (lines that look like downloaded programme data)
  n_ok=$(grep -ciE \
    "(programme|<channel|fetched|downloaded|status.*200|HTTP 200)" \
    "$log" 2>/dev/null || echo 0)

  # Write URL-level stats into the log for post-mortem inspection
  printf "[CLASSIFY] geo=%d rate=%d 5xx=%d 404=%d ok=%d\n" \
    "$n_geo" "$n_rate" "$n_5xx" "$n_404" "$n_ok" >> "$log"

  # Priority decision
  if [[ $n_geo -gt 0 ]]; then
    echo "GEO"; return
  fi

  if [[ $n_rate -gt 0 ]]; then
    echo "RATELIMIT"; return
  fi

  if [[ $n_5xx -gt 0 ]]; then
    echo "5XX"; return
  fi

  if [[ $n_404 -gt 0 ]]; then
    # Only call it a hard 404 if there are zero successful responses
    if [[ $n_ok -eq 0 ]]; then
      echo "404"; return
    else
      # Some URLs 404'd but others succeeded — partial, treat as recoverable
      echo "PARTIAL_404"; return
    fi
  fi

  echo "ERROR"
}
export -f classify_log

# ── Per-URL log parser ─────────────────────────────────────────
# Reads the npm grab log for one attempt and emits URLLOG tokens:
#   URLLOG|site|ok|url|progs|bytes
#   URLLOG|site|fail|url|reason
#   URLLOG|site|loaded|N   ← "N channels loaded" summary line
#
# The iptv-org/epg grab tool logs in several known formats:
#   ✓  https://...  (N programs)
#   ✗  https://...  (HTTP 404)
#   [fetching] https://...
#   Loaded: N channels
# We also handle plain "ok"/"error" word markers and bare URLs with
# adjacent HTTP status codes on the same line.
parse_url_log() {
  local site_name="$1"
  local log_file="$2"
  [[ ! -f "$log_file" ]] && return

  local line url status progs reason code

  while IFS= read -r line; do
    # ── "N channel(s) loaded" summary ─────────────────────
    if echo "$line" | grep -qiE '[0-9]+ channel(s)? loaded'; then
      local n
      n=$(echo "$line" | grep -oP '[0-9]+(?= channel)' || echo 0)
      echo "URLLOG|${site_name}|loaded|${n}"
      continue
    fi

    # ── Lines that contain a URL ───────────────────────────
    url=$(echo "$line" | grep -oP 'https?://[^\s\'"'"'",)]+' | head -1 || true)
    [[ -z "$url" ]] && continue

    # Programme count on the same line
    progs=$(echo "$line" | grep -oP '(?i)(\d+)\s*(prog(ram(me)?s?)?|item|event)' \
            | grep -oP '^\d+' | head -1 || echo "0")

    # Byte count on the same line (e.g. "downloaded 14392 bytes")
    local line_bytes
    line_bytes=$(echo "$line" | grep -oP '(?i)(\d+)\s*byte' \
                 | grep -oP '^\d+' | head -1 || echo "0")

    # HTTP error codes on the line
    code=$(echo "$line" | grep -oP '\b(4\d\d|5\d\d)\b' | head -1 || true)

    # Determine OK vs FAIL from explicit markers first, then HTTP code
    if echo "$line" | grep -qP '(?i)(✓|✔|\[ok\]|\bsuccess\b|\bfetched\b|\bdownloaded\b)'; then
      echo "URLLOG|${site_name}|ok|${url}|${progs}|${line_bytes}"
    elif echo "$line" | grep -qP '(?i)(✗|✘|\[err(or)?\]|\bfailed\b|\bno data\b)'; then
      reason="${code:-ERR}"
      echo "URLLOG|${site_name}|fail|${url}|${reason}"
    elif [[ -n "$code" ]]; then
      echo "URLLOG|${site_name}|fail|${url}|HTTP_${code}"
    elif echo "$line" | grep -qiE '(rate.?limit|too many|quota|geo.?block|forbidden|access denied)'; then
      reason=$(echo "$line" | grep -oiP '(rate.?limit|too many requests|quota exceeded|geo.?block|forbidden|access denied)' \
               | head -1 | tr '[:lower:]' '[:upper:]' | tr ' ' '_')
      echo "URLLOG|${site_name}|fail|${url}|${reason}"
    else
      # URL on line with no clear status → treat as a "fetching" notice
      echo "URLLOG|${site_name}|fetch|${url}|0|0"
    fi

  done < "$log_file"
}
export -f parse_url_log
#
#  Args: SITE_NAME  SITE_HOST  URL_COUNT
#
#  Retry strategy per classified reason:
#    GEO        → bail immediately, no retry ever
#    RATELIMIT  → halve maxConnections (floor MIN_CONN),
#                 exponential back-off, retry up to MAX_RETRIES
#    5XX        → linear back-off, retry
#    404        → only bail if ALL channel URLs returned 404 (n_ok=0)
#                 if partial (some channels ok), keep retrying
#    PARTIAL_404→ some 404s but output non-empty → accept as partial pass
#    EMPTY/ERR  → linear back-off, retry
#
#  Result token (pipe-delimited):
#    PASS|name|bytes|progs|elapsed|attempts|final_conn|host|url_count[|partial]
#    SKIP|name|GEO|elapsed|attempts|host
#    FAIL|name|reason|elapsed|attempts|final_conn|host
# ──────────────────────────────────────────────────────────────
run_site() {
  local SITE_NAME="$1"
  local SITE_HOST="$2"
  local URL_COUNT="${3:-0}"

  cd "$WORK_DIR"

  local OUTPUT_FILE="$OUTPUT_DIR/${SITE_NAME}.xml"
  local LOG_FILE="$LOG_DIR/${SITE_NAME}.log"
  local RETRY_LOG_DIR="$LOG_DIR/${SITE_NAME}_retries"
  mkdir -p "$RETRY_LOG_DIR"

  local SITE_START
  SITE_START=$(date +%s)

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

    # ── Run grab ────────────────────────────────────────────
    local grab_ok=1
    "${CMD[@]}" > "$attempt_log" 2>&1 && grab_ok=0
    cp "$attempt_log" "$LOG_FILE"

    local elapsed=$(( $(date +%s) - SITE_START ))

    # ── Classify across all URL lines in the log ─────────────
    local reason
    reason=$(classify_log "$attempt_log")

    # Emit per-URL detail lines from this attempt's log
    parse_url_log "$SITE_NAME" "$attempt_log"

    # GEO → bail immediately, never retry
    if [[ "$reason" == "GEO" ]]; then
      echo "SKIP|$SITE_NAME|GEO|${elapsed}s|${attempt}|$SITE_HOST"
      return
    fi

    # Hard 404 = every single channel URL returned 404, output is empty
    # Don't retry — the endpoint simply doesn't exist
    if [[ "$reason" == "404" ]]; then
      echo "FAIL|$SITE_NAME|404_ALL|${elapsed}s|${attempt}|${cur_conn}|$SITE_HOST"
      return
    fi

    # PARTIAL_404 + non-empty output → accept as partial success
    if [[ "$reason" == "PARTIAL_404" && -s "$OUTPUT_FILE" ]]; then
      local BYTES PROGS
      BYTES=$(wc -c < "$OUTPUT_FILE")
      PROGS=$(grep -c '<programme' "$OUTPUT_FILE" 2>/dev/null || true)
      echo "DOWNLOADED|$SITE_NAME|$BYTES|$PROGS|${elapsed}s|partial"
      echo "PASS|$SITE_NAME|$BYTES|$PROGS|${elapsed}s|${attempt}|${cur_conn}|${SITE_HOST}|${URL_COUNT}|partial"
      return
    fi

    # Clean success: grab ok AND output has data AND no actionable errors
    if [[ $grab_ok -eq 0 && -s "$OUTPUT_FILE" && \
          ( "$reason" == "ERROR" || "$reason" == "PARTIAL_404" ) ]]; then
      local BYTES PROGS
      BYTES=$(wc -c < "$OUTPUT_FILE")
      PROGS=$(grep -c '<programme' "$OUTPUT_FILE" 2>/dev/null || true)
      echo "DOWNLOADED|$SITE_NAME|$BYTES|$PROGS|${elapsed}s|full"
      echo "PASS|$SITE_NAME|$BYTES|$PROGS|${elapsed}s|${attempt}|${cur_conn}|${SITE_HOST}|${URL_COUNT}"
      return
    fi

    last_reason="$reason"
    [[ $attempt -ge $MAX_RETRIES ]] && break

    # ── Back-off strategy ────────────────────────────────────
    local sleep_secs backoff_msg

    case "$reason" in
      RATELIMIT)
        local new_conn=$(( cur_conn / CONN_BACKOFF_FACTOR ))
        [[ $new_conn -lt $MIN_CONN ]] && new_conn=$MIN_CONN
        cur_conn=$new_conn
        sleep_secs=$(( RETRY_BACKOFF_BASE * ( 1 << (attempt - 1) ) ))
        [[ $sleep_secs -gt 120 ]] && sleep_secs=120
        backoff_msg="rate-limited → conn=${cur_conn}, wait ${sleep_secs}s"
        ;;
      5XX)
        sleep_secs=$(( RETRY_BACKOFF_BASE * attempt ))
        [[ $sleep_secs -gt 60 ]] && sleep_secs=60
        backoff_msg="5xx → wait ${sleep_secs}s"
        ;;
      PARTIAL_404)
        # Some channels 404 but no output yet — short wait, try again
        sleep_secs=$RETRY_BACKOFF_BASE
        backoff_msg="partial 404s, no output → wait ${sleep_secs}s"
        ;;
      *)
        sleep_secs=$(( RETRY_BACKOFF_BASE * attempt ))
        [[ $sleep_secs -gt 60 ]] && sleep_secs=60
        backoff_msg="error (${reason}) → wait ${sleep_secs}s"
        ;;
    esac

    echo "RETRY|$SITE_NAME|${attempt}|${MAX_RETRIES}|${reason}|${cur_conn}|${backoff_msg}|${URL_COUNT} URLs"
    sleep "$sleep_secs"
  done

  local elapsed=$(( $(date +%s) - SITE_START ))
  echo "FAIL|$SITE_NAME|${last_reason}|${elapsed}s|${attempt}|${cur_conn}|$SITE_HOST"
}

export -f run_site

# ── Geo-block pre-check (parallel, fast) ──────────────────────
# Only hard geo signals (403/451) cause a skip.
# 404, unreachable, 5xx, rate-limit → warn and still attempt;
# the npm grab hits many per-channel URLs that may work fine even
# if the base root URL doesn't respond to a plain GET.
log "Pre-checking site reachability (geo-block detection only)..."

PRECHECK_FILE="$OUTPUT_DIR/precheck.tmp"
> "$PRECHECK_FILE"

precheck_site() {
  local site_name="$1"
  local host="$2"
  local url_count="$3"
  local status
  status=$(probe_url "https://$host")
  echo "$site_name|$host|$url_count|$status"
}
export -f precheck_site
export -f probe_url

PRECHECK_INPUT=$(mktemp)
for s in "${SITES[@]}"; do
  echo "$s|${SITE_HOST_MAP[$s]:-unknown}|${SITE_URLCOUNT_MAP[$s]:-0}"
done > "$PRECHECK_INPUT"

# Pre-checks at 2x workers — they're fast HEAD requests
awk -F'|' '{print $1, $2, $3}' "$PRECHECK_INPUT" \
| xargs -n3 -P $(( PARALLEL * 2 )) bash -c 'precheck_site "$@"' _ \
>> "$PRECHECK_FILE"

rm -f "$PRECHECK_INPUT"

# Parse pre-check — build run list and geo-skip list only
declare -a RUN_SITES=()
declare -a SKIPPED_GEO=()
declare -a WARNED_PRECHECK=()   # everything else: warn but still run

while IFS='|' read -r sname shost surlcount sstatus; do
  case "$sstatus" in
    geo)
      SKIPPED_GEO+=("$sname ($shost)")
      skipped "$sname → geo-blocked (${shost}), skipping"
      ;;
    *)
      # Anything else — warn for non-ok, but always run
      case "$sstatus" in
        warn:404)
          WARNED_PRECHECK+=("$sname [base 404 — channel URLs may still work]")
          warn "$sname → base URL 404 on $shost — will still grab (${surlcount} channel URLs)"
          ;;
        warn:unreachable)
          WARNED_PRECHECK+=("$sname [unreachable — grab will retry]")
          warn "$sname → $shost unreachable — will still attempt"
          ;;
        warn:5xx:*)
          WARNED_PRECHECK+=("$sname [${sstatus}]")
          warn "$sname → $shost returned ${sstatus} — will still attempt"
          ;;
        ratelimit)
          WARNED_PRECHECK+=("$sname [rate-limited at pre-check — grab with backoff]")
          warn "$sname → rate-limited on $shost pre-check — will grab with backoff"
          ;;
      esac
      RUN_SITES+=("$sname")
      ;;
  esac
done < "$PRECHECK_FILE"

rm -f "$PRECHECK_FILE"

SKIP_COUNT="${#SKIPPED_GEO[@]}"
RUN_COUNT="${#RUN_SITES[@]}"

log "Pre-check done: ${GREEN}${RUN_COUNT}${NC} to run, ${RED}${SKIP_COUNT}${NC} geo-skipped"
[[ ${#WARNED_PRECHECK[@]} -gt 0 ]] && \
  warn "${#WARNED_PRECHECK[@]} site(s) had non-fatal pre-check warnings (will still grab)"
echo ""

# ── Parallel Execution ─────────────────────────────────────────
log "Running parallel fetch ($PARALLEL workers) on $RUN_COUNT sites..."
echo ""

RESULTS_FILE="$OUTPUT_DIR/results.tmp"
> "$RESULTS_FILE"

# Pass: sitename host urlcount — 3 args per xargs slot
ARGS_FILE=$(mktemp)
for s in "${RUN_SITES[@]}"; do
  echo "$s|${SITE_HOST_MAP[$s]:-unknown}|${SITE_URLCOUNT_MAP[$s]:-0}"
done > "$ARGS_FILE"

awk -F'|' '{print $1, $2, $3}' "$ARGS_FILE" \
| xargs -n3 -P "$PARALLEL" bash -c 'run_site "$@"' _ \
>> "$RESULTS_FILE"

rm -f "$ARGS_FILE"

# ── Results parser ─────────────────────────────────────────────
PASS=0
FAIL=0
FAIL_GEO=0
FAIL_404=0
FAIL_RATE=0
FAIL_5XX=0
FAIL_OTHER=0
TOTAL_RETRIES=0
PARTIAL_PASS=0
TOTAL_BYTES=0
TOTAL_PROGS=0

declare -a FAIL_LIST=()

# Tracks URL stats for the site currently being printed
_cur_site=""
_cur_ok_urls=0
_cur_fail_urls=0
_cur_fetch_urls=0
_cur_loaded_ch=0

# Flush accumulated URL lines for the current site and reset counters
_flush_url_stats() {
  if [[ -n "$_cur_site" && \
        $(( _cur_ok_urls + _cur_fail_urls + _cur_fetch_urls + _cur_loaded_ch )) -gt 0 ]]; then
    printf "           ${DIM}└─ channels loaded: %s  " "$_cur_loaded_ch"
    [[ $_cur_ok_urls   -gt 0 ]] && printf "${GREEN}✓ %d ok${NC}  " "$_cur_ok_urls"
    [[ $_cur_fail_urls -gt 0 ]] && printf "${RED}✗ %d failed${NC}  " "$_cur_fail_urls"
    [[ $_cur_fetch_urls -gt 0 ]] && printf "${DIM}~ %d pending${NC}" "$_cur_fetch_urls"
    printf "${NC}\n"
  fi
  _cur_site=""
  _cur_ok_urls=0
  _cur_fail_urls=0
  _cur_fetch_urls=0
  _cur_loaded_ch=0
}

while IFS='|' read -r TOKEN F1 F2 F3 F4 F5 F6 F7 F8 F9; do
  case "$TOKEN" in

    # ── URLLOG: per-URL result from one grab attempt ──────────
    # ok   → URLLOG|site|ok|url|progs|bytes
    # fail → URLLOG|site|fail|url|reason
    # fetch→ URLLOG|site|fetch|url|0|0
    # loaded → URLLOG|site|loaded|N
    URLLOG)
      local_site="$F1"
      local_status="$F2"
      local_url="$F3"
      local_progs="${F4:-0}"
      local_extra="${F5:-}"

      # Start a new site section when site changes
      if [[ "$_cur_site" != "$local_site" ]]; then
        _flush_url_stats
        _cur_site="$local_site"
        printf "           ${DIM}┌─ %s${NC}\n" "$local_site"
      fi

      case "$local_status" in
        ok)
          _cur_ok_urls=$(( _cur_ok_urls + 1 ))
          local sz_str=""
          [[ "${local_extra:-0}" -gt 0 ]] && sz_str="  $(format_bytes "$local_extra")"
          printf "           ${DIM}│${NC}  ${GREEN}✓${NC}  %-65s  ${CYAN}%s progs${NC}%s\n" \
            "$local_url" "$local_progs" "$sz_str"
          ;;
        fail)
          _cur_fail_urls=$(( _cur_fail_urls + 1 ))
          printf "           ${DIM}│${NC}  ${RED}✗${NC}  %-65s  ${RED}%s${NC}\n" \
            "$local_url" "${local_progs:-ERR}"
          ;;
        fetch)
          _cur_fetch_urls=$(( _cur_fetch_urls + 1 ))
          printf "           ${DIM}│${NC}  ${DIM}~${NC}  ${DIM}%-65s${NC}\n" "$local_url"
          ;;
        loaded)
          _cur_loaded_ch="${local_url:-0}"   # 'url' field holds the count here
          ;;
      esac
      ;;

    # ── DOWNLOADED: fired on success before PASS token ────────
    # DOWNLOADED|site|bytes|progs|elapsed|full|partial
    DOWNLOADED)
      local_bytes="${F2:-0}"
      local_progs="${F3:-0}"
      local_elapsed="${F4:-}"
      local_kind="${F5:-full}"
      TOTAL_BYTES=$(( TOTAL_BYTES + local_bytes ))
      TOTAL_PROGS=$(( TOTAL_PROGS + local_progs ))
      local sz
      sz=$(format_bytes "$local_bytes")
      local kind_tag=""
      [[ "$local_kind" == "partial" ]] && kind_tag=" ${YELLOW}(partial)${NC}"
      printf "           ${GREEN}↓ Downloaded:${NC} %s  ${CYAN}%s programmes${NC}  in %s%s\n" \
        "$sz" "$local_progs" "$local_elapsed" "$kind_tag"
      ;;

    # ── RETRY: live backoff notice ─────────────────────────────
    # RETRY|site|attempt|max|reason|conn|msg|url_count
    RETRY)
      _flush_url_stats
      printf "${YELLOW}[RETRY]${NC} %-35s  attempt %s/%s  ${YELLOW}%s${NC}  conn→${CYAN}%s${NC}  %s  ${DIM}(%s)${NC}\n" \
        "$F1" "$F2" "$F3" "$F4" "$F5" "$F6" "$F7"
      TOTAL_RETRIES=$(( TOTAL_RETRIES + 1 ))
      ;;

    # ── PASS: site finished successfully ──────────────────────
    # PASS|site|bytes|progs|elapsed|attempts|conn|host|url_count[|partial]
    PASS)
      _flush_url_stats
      PASS=$(( PASS + 1 ))
      local_bytes="${F2:-0}"
      local_progs="${F3:-0}"
      local_elapsed="${F4:-}"
      local_attempts="${F5:-1}"
      local_conn="${F6:-$MAX_CONN}"
      local_host="${F7:-}"
      local_urlcount="${F8:-0}"
      local_partial="${F9:-}"
      local sz
      sz=$(format_bytes "$local_bytes")
      retry_tag=""
      partial_tag=""
      [[ "$local_attempts" -gt 1 ]] && \
        retry_tag="  ${DIM}[${local_attempts} tries, conn=${local_conn}]${NC}"
      if [[ "$local_partial" == "partial" ]]; then
        partial_tag=" ${YELLOW}~partial${NC}"
        PARTIAL_PASS=$(( PARTIAL_PASS + 1 ))
      fi
      printf "${GREEN}[OK  %d/%d]${NC}%s  %-35s  %s  ${CYAN}%s progs${NC}  %s  ${DIM}%s URLs  %s${NC}%s\n" \
        "$PASS" "$RUN_COUNT" "$partial_tag" "$F1" \
        "$sz" "$local_progs" "$local_elapsed" \
        "$local_urlcount" "$local_host" "$retry_tag"
      ;;

    # ── SKIP: geo-block detected in log post-run ──────────────
    # SKIP|site|GEO|elapsed|attempts|host
    SKIP)
      _flush_url_stats
      FAIL_GEO=$(( FAIL_GEO + 1 ))
      FAIL=$(( FAIL + 1 ))
      FAIL_LIST+=("$F1 [geo-in-log]")
      printf "${MAGENTA}[SKIP %d/%d]${NC} %-35s  ${MAGENTA}geo-block${NC}  %s  after %s attempt(s)\n" \
        "$(( PASS + FAIL ))" "$RUN_COUNT" "$F1" "$F4" "$F5"
      ;;

    # ── FAIL: all retries exhausted ───────────────────────────
    # FAIL|site|reason|elapsed|attempts|conn|host
    FAIL)
      _flush_url_stats
      FAIL=$(( FAIL + 1 ))
      local_reason="${F2:-ERROR}"
      local_elapsed="${F3:-}"
      local_attempts="${F4:-1}"
      local_conn="${F5:-$MAX_CONN}"
      local_host="${F6:-}"
      case "$local_reason" in
        GEO)       FAIL_GEO=$(( FAIL_GEO + 1 )) ;;
        404_ALL)   FAIL_404=$(( FAIL_404 + 1 )) ;;
        RATELIMIT) FAIL_RATE=$(( FAIL_RATE + 1 )) ;;
        5XX)       FAIL_5XX=$(( FAIL_5XX + 1 )) ;;
        *)         FAIL_OTHER=$(( FAIL_OTHER + 1 )) ;;
      esac
      FAIL_LIST+=("$F1 [$local_reason, ${local_attempts} attempt(s)]")
      printf "${RED}[FAIL %d/%d]${NC} %-35s  ${RED}%s${NC}  %s  %s attempt(s)  ${DIM}conn=%s  %s${NC}\n" \
        "$(( PASS + FAIL ))" "$RUN_COUNT" "$F1" \
        "$local_reason" "$local_elapsed" "$local_attempts" "$local_conn" "$local_host"
      ;;

  esac
done < "$RESULTS_FILE"

# flush any trailing URL stats for the last site
_flush_url_stats

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
if [[ $PARTIAL_PASS -gt 0 ]]; then
  printf "    ├─ full    : %d\n" "$(( PASS - PARTIAL_PASS ))"
  printf "    └─ partial : %d  (some channel URLs 404'd)\n" "$PARTIAL_PASS"
fi
printf "  ${RED}Failed${NC}       : %d\n" "$FAIL"
if [[ $FAIL -gt 0 ]]; then
  [[ $FAIL_GEO   -gt 0 ]] && printf "    ├─ geo-blocked  : %d\n" "$FAIL_GEO"
  [[ $FAIL_404   -gt 0 ]] && printf "    ├─ all-404      : %d\n" "$FAIL_404"
  [[ $FAIL_RATE  -gt 0 ]] && printf "    ├─ rate-limited : %d\n" "$FAIL_RATE"
  [[ $FAIL_5XX   -gt 0 ]] && printf "    ├─ 5xx errors   : %d\n" "$FAIL_5XX"
  [[ $FAIL_OTHER -gt 0 ]] && printf "    └─ other        : %d\n" "$FAIL_OTHER"
fi
printf "  ${MAGENTA}Geo-skipped${NC}  : %d  (pre-check hard block)\n" "$SKIP_COUNT"
printf "  Total sites  : %d\n" "$TOTAL"
echo -e "${BOLD}──────────────────────────────────────────────${NC}"
_total_sz=$(format_bytes "$TOTAL_BYTES")
printf "  ${CYAN}Downloaded${NC}   : %s\n" "$_total_sz"
printf "  ${CYAN}Programmes${NC}   : %s\n" "$TOTAL_PROGS"
echo -e "${BOLD}──────────────────────────────────────────────${NC}"
printf "  Workers      : %s (dynamic)\n" "$PARALLEL"
printf "  Max retries  : %s per site\n" "$MAX_RETRIES"
printf "  Total retries: %s\n" "$TOTAL_RETRIES"
printf "  Delay        : %sms\n" "$DELAY"
printf "  Timeout      : %sms\n" "$TIMEOUT"
printf "  Connections  : %s → %s min (adaptive)\n" "$MAX_CONN" "$MIN_CONN"
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

# ── Pre-check warning list ─────────────────────────────────────
if [[ ${#WARNED_PRECHECK[@]} -gt 0 ]]; then
  echo ""
  echo -e "${YELLOW}Pre-check warnings (still grabbed):${NC}"
  for f in "${WARNED_PRECHECK[@]}"; do
    echo "  • $f"
  done
fi
