#!/usr/bin/env bash
set -euo pipefail

# ════════════════════════════════════════════════════════════════
# IPTV-ORG EPG FAST MULTI-SITE XML GRABBER
# ════════════════════════════════════════════════════════════════

SCRIPT_START_TIME=$(date +%s)

# ── Config ──────────────────────────────────────────────────────
REPO_URL="https://github.com/iptv-org/epg"

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="$BASE_DIR/epg"
OUTPUT_DIR="$BASE_DIR/sites"
LOG_DIR="$OUTPUT_DIR/logs"

GENERATE_SCRIPT="$BASE_DIR/content.py"
CONTENT_JSON="$OUTPUT_DIR/content.json"
SITES_MD="$WORK_DIR/SITES.md"

PROXY_URL="${PROXY_URL:-}"

# ── Grab tuning (override via env) ──────────────────────────────
DELAY="${DELAY:-0}"
TIMEOUT="${TIMEOUT:-15000}"
MAX_CONN="${MAX_CONN:-50}"
MIN_CONN="${MIN_CONN:-1}"
MAX_RETRIES="${MAX_RETRIES:-3}"
RETRY_BACKOFF_BASE="${RETRY_BACKOFF_BASE:-2}"
BATCH_SIZE="${BATCH_SIZE:-10}"

# ── Dynamic worker count ─────────────────────────────────────────
detect_workers() {
  local cpus mem_gb
  if   command -v nproc &>/dev/null;  then cpus=$(nproc)
  elif [[ -f /proc/cpuinfo ]];        then cpus=$(grep -c ^processor /proc/cpuinfo)
  else                                     cpus=2; fi
  if   [[ -f /proc/meminfo ]]; then
    mem_gb=$(awk '/MemTotal/{printf "%d",$2/1024/1024}' /proc/meminfo)
  elif command -v free &>/dev/null;   then
    mem_gb=$(free -g | awk '/^Mem:/{print $2}')
  else mem_gb=4; fi
  cpus=$(printf '%d'   "${cpus:-2}"   2>/dev/null) || cpus=2
  mem_gb=$(printf '%d' "${mem_gb:-4}" 2>/dev/null) || mem_gb=4
  (( cpus   < 1 )) && cpus=1
  (( mem_gb < 1 )) && mem_gb=1
  local w=$(( cpus * 3 < mem_gb * 3 / 2 ? cpus * 3 : mem_gb * 3 / 2 ))
  (( w < 1  )) && w=1
  (( w > 32 )) && w=32
  echo "$w"
}

PARALLEL="${PARALLEL:-$(detect_workers)}"

# ── Colors ──────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
CYAN='\033[0;36m';  MAGENTA='\033[0;35m'; BOLD='\033[1m'
DIM='\033[2m';      NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC}   $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}   $*"; }
err()  { echo -e "${RED}[ERR]${NC}    $*" >&2; }

format_bytes() {
  local b="${1:-0}" r c
  if   (( b >= 1073741824 )); then r=$(awk "BEGIN{printf \"%.2f GB\",$b/1073741824}"); c='\033[0;32m'
  elif (( b >= 1048576    )); then r=$(awk "BEGIN{printf \"%.2f MB\",$b/1048576}");    c='\033[0;36m'
  elif (( b >= 1024       )); then r=$(awk "BEGIN{printf \"%.1f KB\",$b/1024}");       c='\033[0;37m'
  else r="${b} B"; c='\033[2m'; fi
  printf "${c}%s\033[0m" "$r"
}

elapsed_since() {
  local s=$(( $(date +%s) - $1 ))
  printf "%dm%02ds" $(( s/60 )) $(( s%60 ))
}

# ── Cleanup ─────────────────────────────────────────────────────
WORKER_SCRIPT=""
cleanup() {
  [[ "${KEEP_REPO:-0}" != "1" && -d "$WORK_DIR" ]] && {
    log "Cleaning repo..."
    rm -rf "$WORK_DIR"
  }
  [[ -n "${WORKER_SCRIPT:-}" && -f "$WORKER_SCRIPT" ]] && rm -f "$WORKER_SCRIPT"
}
trap cleanup EXIT

# ── Dependency check ────────────────────────────────────────────
for cmd in git npm python3 grep sed sort wc xargs awk; do
  command -v "$cmd" &>/dev/null || { err "Missing dependency: $cmd"; exit 1; }
done

mkdir -p "$OUTPUT_DIR" "$LOG_DIR"

# ── Clone / update repo ─────────────────────────────────────────
if [[ -d "$WORK_DIR/.git" ]]; then
  log "Updating repo..."
  git -C "$WORK_DIR" fetch --depth 1 origin master &>/dev/null || true
  git -C "$WORK_DIR" reset --hard origin/master    &>/dev/null || true
else
  log "Cloning iptv-org/epg..."
  git clone --depth 1 "$REPO_URL" "$WORK_DIR"
fi

cd "$WORK_DIR"
log "Installing npm dependencies..."
npm ci --silent

# ── Read online sites ───────────────────────────────────────────
log "Reading online providers from SITES.md..."
mapfile -t ONLINE_SITES < <(
  grep '🟢' "$SITES_MD" \
  | sed -n 's#.*href="sites/\([^"]*\)".*🟢.*#\1#p' \
  | sort -u
)
[[ ${#ONLINE_SITES[@]} -eq 0 ]] && { err "No online sites found."; exit 1; }

SITES=()
for name in "${ONLINE_SITES[@]}"; do
  [[ -d "$WORK_DIR/sites/$name" ]] && SITES+=("$name")
done
TOTAL="${#SITES[@]}"
[[ $TOTAL -eq 0 ]] && { err "No valid site folders."; exit 1; }

BATCH_COUNT=$(( (TOTAL + BATCH_SIZE - 1) / BATCH_SIZE ))

log "Found ${BOLD}$TOTAL${NC} sites → ${BOLD}$BATCH_COUNT${NC} batches of up to ${BOLD}$BATCH_SIZE${NC}"
log "Workers: ${BOLD}$PARALLEL${NC}  |  Connections: ${BOLD}$MAX_CONN${NC}  |  Timeout: ${BOLD}${TIMEOUT}ms${NC}  |  Delay: ${BOLD}${DELAY}ms${NC}"
echo ""

# ════════════════════════════════════════════════════════════════
# WORKER SCRIPT
# Written to a temp file; xargs subshells execute it directly.
# All output goes to stdout — no tok files, no flock.
# Individual echo calls are atomic under PIPE_BUF (4 KB) so lines
# from concurrent workers never interleave.
# ════════════════════════════════════════════════════════════════
WORKER_SCRIPT=$(mktemp /tmp/epg_worker_XXXXXX.sh)
chmod +x "$WORKER_SCRIPT"

cat > "$WORKER_SCRIPT" << 'WORKER_EOF'
#!/usr/bin/env bash

elapsed_since() {
  local s=$(( $(date +%s) - $1 ))
  printf "%dm%02ds" $(( s/60 )) $(( s%60 ))
}

# grep -c outputs "0" AND exits 1 on zero matches, so `|| echo 0`
# produces "0\n0". Use `|| true` + ${:-0} to get a clean integer.
classify_log() {
  local log="$1"
  local n_geo n_rate n_5xx n_404 n_ok
  n_geo=$(grep  -ciE "(HTTP 403|403 Forbidden|geo.?block|not available in your (country|region)|access denied|region restricted)" "$log" 2>/dev/null || true); n_geo=${n_geo:-0}
  n_rate=$(grep -ciE "(HTTP 429|429 Too Many|rate.?limit|too many requests|quota exceeded|slow.?down|bad request|400 Bad)"          "$log" 2>/dev/null || true); n_rate=${n_rate:-0}
  n_5xx=$(grep  -ciE "(HTTP 5[0-9][0-9]|500 Internal|502 Bad|503 Service|504 Gateway)"                                             "$log" 2>/dev/null || true); n_5xx=${n_5xx:-0}
  n_404=$(grep  -ciE "(HTTP 404|404 Not Found|no such channel|endpoint not found)"                                                  "$log" 2>/dev/null || true); n_404=${n_404:-0}
  n_ok=$(grep   -ciE "(<programme|<channel|fetched|downloaded|HTTP 200|status.*200)"                                                "$log" 2>/dev/null || true); n_ok=${n_ok:-0}
  printf "[CLASSIFY] geo=%d rate=%d 5xx=%d 404=%d ok=%d\n" \
    "$n_geo" "$n_rate" "$n_5xx" "$n_404" "$n_ok" >> "$log"
  if   (( n_geo  > 0 )); then echo "GEO"
  elif (( n_rate > 0 )); then echo "RATELIMIT"
  elif (( n_5xx  > 0 )); then echo "5XX"
  elif (( n_ok   > 0 )); then echo "OK"
  elif (( n_404  > 0 )); then echo "404_ONLY"
  else                        echo "ERROR"
  fi
}

# Emits URLLOG| tokens to stdout (no tok file arg needed).
parse_url_log() {
  local site_name="$1" log_file="$2"
  [[ ! -f "$log_file" ]] && return
  while IFS= read -r line; do
    if echo "$line" | grep -qiE '[0-9]+ channel(s)? loaded'; then
      local n; n=$(echo "$line" | grep -oP '[0-9]+(?= channel)' || true); n=${n:-0}
      echo "URLLOG|${site_name}|loaded|${n}"
      continue
    fi
    local url; url=$(echo "$line" | grep -oP 'https?://[^\s'"'"'",)]+' | head -1 || true)
    [[ -z "$url" ]] && continue
    local progs; progs=$(echo "$line" | grep -oP '(\d+)\s*(prog(ram(me)?s?)?|item|event)' | grep -oP '^\d+' | head -1 || true); progs=${progs:-0}
    local lbytes; lbytes=$(echo "$line" | grep -oP '(\d+)\s*byte' | grep -oP '^\d+' | head -1 || true); lbytes=${lbytes:-0}
    local code; code=$(echo "$line" | grep -oP '\b(4\d\d|5\d\d)\b' | head -1 || true)
    if   echo "$line" | grep -qP '(?i)(✓|✔|\[ok\]|\bsuccess\b|\bfetched\b|\bdownloaded\b)'; then
      echo "URLLOG|${site_name}|ok|${url}|${progs}|${lbytes}"
    elif echo "$line" | grep -qP '(?i)(✗|✘|\[err(or)?\]|\bfailed\b|\bno data\b)'; then
      echo "URLLOG|${site_name}|fail|${url}|${code:-ERR}"
    elif [[ -n "$code" ]]; then
      echo "URLLOG|${site_name}|fail|${url}|HTTP_${code}"
    elif echo "$line" | grep -qiE '(rate.?limit|too many|quota|geo.?block|forbidden|access denied)'; then
      local reason; reason=$(echo "$line" \
        | grep -oiP '(rate.?limit|too many requests|quota exceeded|geo.?block|forbidden|access denied)' \
        | head -1 | tr '[:lower:]' '[:upper:]' | tr ' ' '_')
      echo "URLLOG|${site_name}|fail|${url}|${reason}"
    else
      echo "URLLOG|${site_name}|fetch|${url}|0|0"
    fi
  done < "$log_file"
}

get_site_host() {
  local s="$1"
  grep -rhoP '(?<=url:\s['"'"'"`])[^'"'"'"`]+' \
    "$WORK_DIR/sites/$s/"*.js 2>/dev/null \
    | head -1 | grep -oP '(?<=://)([^/]+)' \
    || echo "$s"
}

# ── RUN_BATCH ────────────────────────────────────────────────────
# All token lines go to stdout.
run_batch() {
  local batch_sites=("$@")
  [[ ${#batch_sites[@]} -eq 0 ]] && return

  local batch_id="${$}_${RANDOM}"
  local sites_csv; sites_csv=$(IFS=','; echo "${batch_sites[*]}")
  echo "BATCH_START|${batch_id}|${#batch_sites[@]}|${sites_csv}"

  local now; now=$(date +%s)
  for s in "${batch_sites[@]}"; do
    local safe; safe="${s//[^a-zA-Z0-9_]/_}"
    eval "t_start_${safe}=${now}"
    eval "t_conn_${safe}=${MAX_CONN}"
    eval "t_attempts_${safe}=0"
    eval "t_done_${safe}=0"
  done

  local global_round=0

  while true; do
    global_round=$(( global_round + 1 ))

    local pending=()
    for s in "${batch_sites[@]}"; do
      local safe; safe="${s//[^a-zA-Z0-9_]/_}"
      local done_val; done_val=$(eval "echo \${t_done_${safe}}")
      [[ "$done_val" == "0" ]] && pending+=("$s")
    done
    [[ ${#pending[@]} -eq 0 ]] && break

    local all_exhausted=1
    for s in "${pending[@]}"; do
      local safe; safe="${s//[^a-zA-Z0-9_]/_}"
      local att; att=$(eval "echo \${t_attempts_${safe}}")
      (( att < MAX_RETRIES )) && { all_exhausted=0; break; }
    done
    [[ $all_exhausted -eq 1 ]] && break

    for s in "${pending[@]}"; do
      echo "WORKER_START|${s}|$(get_site_host "$s")"
    done

    local min_conn=$MAX_CONN
    for s in "${pending[@]}"; do
      local safe; safe="${s//[^a-zA-Z0-9_]/_}"
      local c; c=$(eval "echo \${t_conn_${safe}}")
      (( c < min_conn )) && min_conn=$c
    done

    local pending_csv; pending_csv=$(IFS=','; echo "${pending[*]}")
    local batch_log="$LOG_DIR/_batch_${batch_id}_r${global_round}.log"

    npm run grab -- \
      --sites="$pending_csv" \
      --output="$OUTPUT_DIR/{site}.xml" \
      --delay="$DELAY" \
      --timeout="$TIMEOUT" \
      --maxConnections="$min_conn" \
      ${PROXY_URL:+--proxy="$PROXY_URL"} \
      > "$batch_log" 2>&1 || true

    local any_needs_retry=0 max_sleep=0

    for s in "${pending[@]}"; do
      local safe; safe="${s//[^a-zA-Z0-9_]/_}"
      local done_val; done_val=$(eval "echo \${t_done_${safe}}")
      [[ "$done_val" == "1" ]] && continue

      eval "t_attempts_${safe}=\$(( \${t_attempts_${safe}} + 1 ))"
      local attempt; attempt=$(eval "echo \${t_attempts_${safe}}")
      local cur_conn; cur_conn=$(eval "echo \${t_conn_${safe}}")
      local t_s; t_s=$(eval "echo \${t_start_${safe}}")
      local elapsed_fmt; elapsed_fmt=$(elapsed_since "$t_s")

      local output_file="$OUTPUT_DIR/${s}.xml"
      local site_log="$LOG_DIR/${s}.log"
      local retry_log="$LOG_DIR/${s}_retries/attempt_${attempt}.log"
      mkdir -p "$LOG_DIR/${s}_retries"

      grep -iE "(${s}|${s//./\\.})" "$batch_log" > "$retry_log" 2>/dev/null || true
      [[ ! -s "$retry_log" ]] && cp "$batch_log" "$retry_log"
      cp "$retry_log" "$site_log"

      local reason; reason=$(classify_log "$retry_log")
      parse_url_log "$s" "$retry_log"

      if [[ "$reason" == "GEO" ]]; then
        eval "t_done_${safe}=1"
        echo "SKIP|${s}|GEO|${elapsed_fmt}|${attempt}|$(get_site_host "$s")"
        continue
      fi

      if [[ -s "$output_file" ]]; then
        eval "t_done_${safe}=1"
        local bytes; bytes=$(wc -c < "$output_file"); bytes=${bytes//[[:space:]]/}; bytes=${bytes:-0}
        local progs; progs=$(grep -c '<programme' "$output_file" 2>/dev/null || true); progs=${progs:-0}
        local host; host=$(get_site_host "$s")
        local partial_flag=""
        grep -qiE "(HTTP 404|404 Not Found)" "$retry_log" 2>/dev/null && partial_flag="|partial"
        echo "PASS|${s}|${bytes}|${progs}|${elapsed_fmt}|${attempt}|${cur_conn}|${host}${partial_flag}"
        continue
      fi

      if (( attempt >= MAX_RETRIES )); then
        eval "t_done_${safe}=1"
        echo "FAIL|${s}|${reason}|${elapsed_fmt}|${attempt}|${cur_conn}|$(get_site_host "$s")"
        continue
      fi

      any_needs_retry=1
      local sleep_secs msg

      case "$reason" in
        RATELIMIT)
          local new_conn=$(( cur_conn - 1 ))
          (( new_conn < MIN_CONN )) && new_conn=$MIN_CONN
          eval "t_conn_${safe}=${new_conn}"
          sleep_secs=$(( RETRY_BACKOFF_BASE * attempt ))
          (( sleep_secs > 30 )) && sleep_secs=30
          msg="rate-limited → conn=${new_conn}, wait ${sleep_secs}s"
          ;;
        5XX)
          sleep_secs=$(( RETRY_BACKOFF_BASE * attempt ))
          (( sleep_secs > 30 )) && sleep_secs=30
          msg="5xx → wait ${sleep_secs}s"
          ;;
        404_ONLY)
          sleep_secs=$RETRY_BACKOFF_BASE
          msg="all-404 (transient?) → wait ${sleep_secs}s"
          ;;
        *)
          sleep_secs=$(( RETRY_BACKOFF_BASE * attempt ))
          (( sleep_secs > 30 )) && sleep_secs=30
          msg="error (${reason}) → wait ${sleep_secs}s"
          ;;
      esac

      (( sleep_secs > max_sleep )) && max_sleep=$sleep_secs
      echo "RETRY|${s}|${attempt}|${MAX_RETRIES}|${reason}|${cur_conn}|${msg}"
    done

    [[ $any_needs_retry -eq 1 && $max_sleep -gt 0 ]] && sleep "$max_sleep"
  done

  # Safety net: anything still undone → FAIL
  for s in "${batch_sites[@]}"; do
    local safe; safe="${s//[^a-zA-Z0-9_]/_}"
    local done_val; done_val=$(eval "echo \${t_done_${safe}}")
    if [[ "$done_val" == "0" ]]; then
      local t_s; t_s=$(eval "echo \${t_start_${safe}}")
      local elapsed_fmt; elapsed_fmt=$(elapsed_since "$t_s")
      local att; att=$(eval "echo \${t_attempts_${safe}}")
      local c; c=$(eval "echo \${t_conn_${safe}}")
      echo "FAIL|${s}|EXHAUSTED|${elapsed_fmt}|${att}|${c}|$(get_site_host "$s")"
    fi
  done
}

run_batch "$@"
WORKER_EOF

# ════════════════════════════════════════════════════════════════
# BUILD BATCH ARG FILE
# ════════════════════════════════════════════════════════════════
BATCH_ARG_FILE=$(mktemp)
trap 'rm -f "$BATCH_ARG_FILE"' EXIT

batch_line=""
count=0
for site in "${SITES[@]}"; do
  batch_line+="${site} "
  count=$(( count + 1 ))
  if (( count % BATCH_SIZE == 0 )); then
    echo "${batch_line% }" >> "$BATCH_ARG_FILE"
    batch_line=""
  fi
done
[[ -n "${batch_line// }" ]] && echo "${batch_line% }" >> "$BATCH_ARG_FILE"

log "Launching ${BOLD}$BATCH_COUNT${NC} batches across ${BOLD}$PARALLEL${NC} workers..."
echo ""

# ════════════════════════════════════════════════════════════════
# AGGREGATOR
# Process substitution `< <(xargs ...)` keeps the while loop in
# the current shell so PASS/FAIL/totals are visible to the summary.
# ════════════════════════════════════════════════════════════════
PASS=0; FAIL=0; PARTIAL_PASS=0
FAIL_GEO=0; FAIL_404=0; FAIL_RATE=0; FAIL_5XX=0; FAIL_OTHER=0
TOTAL_RETRIES=0; TOTAL_BYTES=0; TOTAL_PROGS=0
declare -a FAIL_LIST=() SKIP_LIST=()

_cur_site=""; _cur_ok=0; _cur_fail=0; _cur_fetch=0; _cur_loaded=0

_flush_url_stats() {
  if (( _cur_ok + _cur_fail + _cur_fetch + _cur_loaded > 0 )); then
    printf "           ${DIM}└─ loaded: %s ch  " "$_cur_loaded"
    (( _cur_ok   > 0 )) && printf "${GREEN}✓ %d ok${NC}  "   "$_cur_ok"
    (( _cur_fail > 0 )) && printf "${RED}✗ %d fail${NC}  "  "$_cur_fail"
    (( _cur_fetch > 0)) && printf "${DIM}~ %d pending${NC}" "$_cur_fetch"
    printf "${NC}\n"
  fi
  _cur_site=""; _cur_ok=0; _cur_fail=0; _cur_fetch=0; _cur_loaded=0
}

while IFS='|' read -r TOKEN F1 F2 F3 F4 F5 F6 F7 F8; do
  case "$TOKEN" in

    BATCH_START)
      printf "${DIM}[BATCH]${NC}  %s\n" "$F4"
      ;;

    WORKER_START)
      printf "${DIM}[START]${NC}  %-40s  ${DIM}%s${NC}\n" "$F1" "$F2"
      ;;

    URLLOG)
      local_site="$F1"; local_status="$F2"
      local_url="$F3";  local_extra="${F4:-0}"; local_lbytes="${F5:-0}"
      if [[ "$_cur_site" != "$local_site" ]]; then
        _flush_url_stats; _cur_site="$local_site"
      fi
      case "$local_status" in
        ok)
          _cur_ok=$(( _cur_ok + 1 ))
          local sz_str=""
          (( local_lbytes > 0 )) && sz_str="  $(format_bytes "$local_lbytes")"
          printf "           ${DIM}│${NC} ${GREEN}✓${NC} %-65s  ${CYAN}%s progs${NC}%s\n" \
            "$local_url" "${local_extra:-0}" "$sz_str"
          ;;
        fail)
          _cur_fail=$(( _cur_fail + 1 ))
          if [[ "${local_extra:-}" != "HTTP_404" && "${local_extra:-}" != "404" ]]; then
            printf "           ${DIM}│${NC} ${RED}✗${NC} %-65s  ${RED}%s${NC}\n" \
              "$local_url" "${local_extra:-ERR}"
          fi
          ;;
        fetch)
          _cur_fetch=$(( _cur_fetch + 1 ))
          printf "           ${DIM}│${NC} ${DIM}~${NC} ${DIM}%-65s${NC}\n" "$local_url"
          ;;
        loaded)
          _cur_loaded="${local_url:-0}"
          ;;
      esac
      ;;

    RETRY)
      _flush_url_stats
      TOTAL_RETRIES=$(( TOTAL_RETRIES + 1 ))
      printf "${YELLOW}[RETRY]${NC}  %-40s  attempt ${YELLOW}%s/%s${NC}  ${YELLOW}%s${NC}  conn→${CYAN}%s${NC}  %s\n" \
        "$F1" "$F2" "$F3" "$F4" "$F5" "$F6"
      ;;

    PASS)
      _flush_url_stats
      PASS=$(( PASS + 1 ))
      local_bytes="${F2:-0}";  local_progs="${F3:-0}"
      local_elapsed="${F4:-}"; local_attempts="${F5:-1}"
      local_conn="${F6:-$MAX_CONN}"; local_host="${F7:-}"
      local_partial="${F8:-}"
      TOTAL_BYTES=$(( TOTAL_BYTES + local_bytes ))
      TOTAL_PROGS=$(( TOTAL_PROGS + local_progs ))
      local sz; sz=$(format_bytes "$local_bytes")
      local retry_tag="" partial_tag=""
      (( local_attempts > 1 )) && \
        retry_tag="  ${DIM}[${local_attempts} tries, conn=${local_conn}]${NC}"
      if [[ "$local_partial" == "partial" ]]; then
        partial_tag=" ${YELLOW}~partial${NC}"
        PARTIAL_PASS=$(( PARTIAL_PASS + 1 ))
      fi
      printf "${GREEN}[OK  %d/%d]${NC}%s  %-40s  %s  ${CYAN}%s progs${NC}  %s  ${DIM}%s${NC}%s\n" \
        "$PASS" "$TOTAL" "$partial_tag" "$F1" \
        "$sz" "$local_progs" "$local_elapsed" "$local_host" "$retry_tag"
      ;;

    SKIP)
      _flush_url_stats
      FAIL_GEO=$(( FAIL_GEO + 1 )); FAIL=$(( FAIL + 1 ))
      SKIP_LIST+=("$F1 (${F6:-unknown})")
      printf "${MAGENTA}[SKIP %d/%d]${NC}  %-40s  ${MAGENTA}403 geo-blocked${NC}  %s  %s attempt(s)\n" \
        "$(( PASS + FAIL ))" "$TOTAL" "$F1" "$F4" "$F5"
      ;;

    FAIL)
      _flush_url_stats
      FAIL=$(( FAIL + 1 ))
      local_reason="${F2:-ERROR}"; local_elapsed="${F3:-}"
      local_attempts="${F4:-1}";   local_conn="${F5:-$MAX_CONN}"
      local_host="${F6:-}"
      case "$local_reason" in
        GEO)       FAIL_GEO=$(( FAIL_GEO + 1 )) ;;
        404_ONLY)  FAIL_404=$(( FAIL_404 + 1 )) ;;
        RATELIMIT) FAIL_RATE=$(( FAIL_RATE + 1 )) ;;
        5XX)       FAIL_5XX=$(( FAIL_5XX + 1 )) ;;
        *)         FAIL_OTHER=$(( FAIL_OTHER + 1 )) ;;
      esac
      FAIL_LIST+=("$F1 [${local_reason}, ${local_attempts} tries, ${local_host}]")
      printf "${RED}[FAIL %d/%d]${NC}  %-40s  ${RED}%s${NC}  %s  %s tries  ${DIM}conn=%s  %s${NC}\n" \
        "$(( PASS + FAIL ))" "$TOTAL" "$F1" \
        "$local_reason" "$local_elapsed" "$local_attempts" \
        "$local_conn" "$local_host"
      ;;

  esac
done < <(
  xargs -L1 -P "$PARALLEL" \
    env \
      WORK_DIR="$WORK_DIR" \
      OUTPUT_DIR="$OUTPUT_DIR" \
      LOG_DIR="$LOG_DIR" \
      PROXY_URL="${PROXY_URL:-}" \
      DELAY="$DELAY" \
      TIMEOUT="$TIMEOUT" \
      MAX_CONN="$MAX_CONN" \
      MIN_CONN="$MIN_CONN" \
      MAX_RETRIES="$MAX_RETRIES" \
      RETRY_BACKOFF_BASE="$RETRY_BACKOFF_BASE" \
      SCRIPT_START_TIME="$SCRIPT_START_TIME" \
    bash "$WORKER_SCRIPT" < "$BATCH_ARG_FILE"
)

_flush_url_stats

# ── Generate content.json ───────────────────────────────────────
echo ""
log "Generating content.json..."
python3 "$GENERATE_SCRIPT" "$OUTPUT_DIR" "$CONTENT_JSON"

TOTAL_ELAPSED=$(elapsed_since "$SCRIPT_START_TIME")

# ── Summary ─────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}══════════════════════════════════════════════${NC}"
printf "  ${GREEN}Passed${NC}        : %d / %d\n" "$PASS" "$TOTAL"
if (( PARTIAL_PASS > 0 )); then
  printf "    ├─ full    : %d\n" "$(( PASS - PARTIAL_PASS ))"
  printf "    └─ partial : %d  (some URLs 404, data still produced)\n" "$PARTIAL_PASS"
fi
printf "  ${RED}Failed${NC}        : %d\n" "$FAIL"
if (( FAIL > 0 )); then
  (( FAIL_GEO   > 0 )) && printf "    ├─ geo/403  : %d\n" "$FAIL_GEO"
  (( FAIL_404   > 0 )) && printf "    ├─ all-404  : %d\n" "$FAIL_404"
  (( FAIL_RATE  > 0 )) && printf "    ├─ rate-lim : %d\n" "$FAIL_RATE"
  (( FAIL_5XX   > 0 )) && printf "    ├─ 5xx      : %d\n" "$FAIL_5XX"
  (( FAIL_OTHER > 0 )) && printf "    └─ other    : %d\n" "$FAIL_OTHER"
fi
echo -e "${BOLD}──────────────────────────────────────────────${NC}"
printf "  ${CYAN}Downloaded${NC}    : %s\n" "$(format_bytes "$TOTAL_BYTES")"
printf "  ${CYAN}Programmes${NC}    : %d\n" "$TOTAL_PROGS"
echo -e "${BOLD}──────────────────────────────────────────────${NC}"
printf "  Workers       : %d (dynamic)\n"      "$PARALLEL"
printf "  Batch size    : %d sites/run\n"       "$BATCH_SIZE"
printf "  Batches       : %d\n"                 "$BATCH_COUNT"
printf "  Max retries   : %d / site\n"          "$MAX_RETRIES"
printf "  Total retries : %d\n"                 "$TOTAL_RETRIES"
printf "  Connections   : %d → %d min\n"        "$MAX_CONN" "$MIN_CONN"
printf "  Delay/Timeout : %dms / %dms\n"        "$DELAY" "$TIMEOUT"
printf "  Elapsed       : %s\n"                 "$TOTAL_ELAPSED"
printf "  Output        : %s\n"                 "$OUTPUT_DIR"
printf "  Logs          : %s\n"                 "$LOG_DIR"
echo -e "${BOLD}══════════════════════════════════════════════${NC}"

if (( ${#FAIL_LIST[@]} > 0 )); then
  echo ""; echo -e "${RED}Failed sites:${NC}"
  printf '  • %s\n' "${FAIL_LIST[@]}"
fi
if (( ${#SKIP_LIST[@]} > 0 )); then
  echo ""; echo -e "${MAGENTA}Geo-blocked (403, skipped):${NC}"
  printf '  • %s\n' "${SKIP_LIST[@]}"
fi
