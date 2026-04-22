#!/usr/bin/env bash
set -Eeuo pipefail

# ════════════════════════════════════════════════════════════════
# IPTV-ORG EPG FAST MULTI-SITE EPG GRABBER
# ════════════════════════════════════════════════════════════════

REPO_URL="https://github.com/iptv-org/epg"

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="$BASE_DIR/epg"
OUTPUT_DIR="$BASE_DIR/sites"
LOG_DIR="$OUTPUT_DIR/logs"

GENERATE_SCRIPT="$BASE_DIR/content.py"
CONTENT_JSON="$OUTPUT_DIR/content.json"
SITES_MD="$WORK_DIR/SITES.md"

PROXY_URL="${PROXY_URL:-}"

PARALLEL="${PARALLEL:-auto}"
DELAY="${DELAY:-700}"
TIMEOUT="${TIMEOUT:-12000}"
MAX_CONN="${MAX_CONN:-8}"

MAX_RETRIES="${MAX_RETRIES:-10}"
RETRY_SLEEP="${RETRY_SLEEP:-5}"
KEEP_REPO="${KEEP_REPO:-0}"

mkdir -p "$OUTPUT_DIR" "$LOG_DIR"

LOCK_FILE="$LOG_DIR/.console.lock"

# ───────────────────────────────────────────────────────────────
# Atomic logger
# ───────────────────────────────────────────────────────────────
_write_log() {
  local level="$1"
  local icon="$2"
  shift 2
  local msg="$*"
  local line="[$(date '+%F %T')] $icon $msg"

  (
    flock -x 9
    printf '%s\n' "$line"
  ) 9>>"$LOCK_FILE"
}

log()  { _write_log INFO "ℹ️ " "$*"; }
ok()   { _write_log OK   "✅" "$*"; }
warn() { _write_log WARN "⚠️ " "$*"; }
err()  { _write_log ERR  "❌" "$*"; }

fmt_time() {
  local s="${1:-0}"
  local h=$((s/3600))
  local m=$(((s%3600)/60))
  local sec=$((s%60))
  if (( h > 0 )); then
    printf "%02dh %02dm %02ds" "$h" "$m" "$sec"
  elif (( m > 0 )); then
    printf "%02dm %02ds" "$m" "$sec"
  else
    printf "%02ds" "$sec"
  fi
}

trace_error() {
  local code=$?
  err "Script crashed (exit $code)"
  exit "$code"
}
trap trace_error ERR

cleanup() {
  [[ "$KEEP_REPO" == "1" ]] && return
  [[ -d "$WORK_DIR" ]] && rm -rf "$WORK_DIR"
}
trap cleanup EXIT

# ───────────────────────────────────────────────────────────────
# Deps
# ───────────────────────────────────────────────────────────────
for cmd in git npm python3 grep sed sort wc xargs nproc awk date mktemp flock; do
  command -v "$cmd" >/dev/null || {
    echo "Missing command: $cmd"
    exit 1
  }
done

# ───────────────────────────────────────────────────────────────
# Counters
# ───────────────────────────────────────────────────────────────
OK_FILE="$(mktemp)"
FAIL_FILE="$(mktemp)"
: > "$OK_FILE"
: > "$FAIL_FILE"

inc_ok()   { echo 1 >> "$OK_FILE"; }
inc_fail() { echo 1 >> "$FAIL_FILE"; }

count_lines() {
  wc -l < "$1" | tr -d ' '
}

# ───────────────────────────────────────────────────────────────
# Auto workers
# ───────────────────────────────────────────────────────────────
detect_workers() {
  local cpu mem_mb ram w

  cpu="$(nproc)"
  mem_mb="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)"

  ram=$((mem_mb / 450))
  w=$((cpu * 2))

  (( w > ram )) && w="$ram"
  (( w < 2 )) && w=2
  (( w > 12 )) && w=12

  echo "$w"
}

[[ "$PARALLEL" == "auto" ]] && PARALLEL="$(detect_workers)"

# ───────────────────────────────────────────────────────────────
# Repo
# ───────────────────────────────────────────────────────────────
log "Preparing repository..."

if [[ -d "$WORK_DIR/.git" ]]; then
  git -C "$WORK_DIR" fetch --depth 1 origin master >/dev/null 2>&1 || true
  git -C "$WORK_DIR" reset --hard origin/master >/dev/null 2>&1 || true
else
  git clone --depth 1 "$REPO_URL" "$WORK_DIR" >/dev/null 2>&1
fi

cd "$WORK_DIR"

log "Installing dependencies..."
npm ci --silent >/dev/null 2>&1

# ───────────────────────────────────────────────────────────────
# Sites
# ───────────────────────────────────────────────────────────────
mapfile -t ONLINE_SITES < <(
  grep '🟢' "$SITES_MD" |
  sed -n 's#.*href="sites/\([^"]*\)".*#\1#p' |
  sort -u
)

SITES=()
for s in "${ONLINE_SITES[@]}"; do
  [[ -d "$WORK_DIR/sites/$s" ]] && SITES+=("$s")
done

TOTAL="${#SITES[@]}"
[[ "$TOTAL" -eq 0 ]] && { err "No sites found"; exit 1; }

log "Sites=$TOTAL Workers=$PARALLEL"

# ───────────────────────────────────────────────────────────────
# Detect errors
# ───────────────────────────────────────────────────────────────
is_retryable_log() {
  grep -Eiq \
  '500|502|503|504|429|timeout|timed out|ECONNRESET|ETIMEDOUT|rate limit|network error|socket hang up|service unavailable' \
  "$1"
}

is_geo_blocked_log() {
  grep -Eiq \
  'geo|forbidden|not available in your region|country not supported|access denied|ip blocked|403' \
  "$1"
}

# ───────────────────────────────────────────────────────────────
# Worker
# ───────────────────────────────────────────────────────────────
run_site() {
  local site="$1"
  cd "$WORK_DIR"

  local out="$OUTPUT_DIR/${site}.xml"
  local logfile="$LOG_DIR/${site}.log"

  local start now dur
  local attempt=1

  start=$(date +%s)

  while (( attempt <= MAX_RETRIES )); do
    rm -f "$out"

    log "📺 $site attempt $attempt/$MAX_RETRIES"

    CMD=(
      npm run grab --
      --sites="$site"
      --output="$out"
      --delay="$DELAY"
      --timeout="$TIMEOUT"
      --maxConnections="$MAX_CONN"
    )

    [[ -n "$PROXY_URL" ]] && CMD+=(--proxy="$PROXY_URL")

    if "${CMD[@]}" > "$logfile" 2>&1 && [[ -s "$out" ]]; then
      now=$(date +%s)
      dur=$((now - start))
      ok "📺 $site done in $(fmt_time "$dur")"
      inc_ok
      return 0
    fi

    if is_geo_blocked_log "$logfile"; then
      err "🌍 $site GEO BLOCKED"
      inc_fail
      return 1
    fi

    if is_retryable_log "$logfile"; then
      if (( attempt < MAX_RETRIES )); then
        warn "🔁 $site retry $attempt/$MAX_RETRIES"
        sleep "$RETRY_SLEEP"
      else
        err "❌ $site max retries reached"
        inc_fail
      fi
    else
      err "❌ $site hard failure"
      inc_fail
      return 1
    fi

    attempt=$((attempt + 1))
  done

  return 1
}

# export for xargs shells
export WORK_DIR OUTPUT_DIR LOG_DIR PROXY_URL LOCK_FILE
export DELAY TIMEOUT MAX_CONN MAX_RETRIES RETRY_SLEEP
export OK_FILE FAIL_FILE

export -f _write_log log ok warn err fmt_time
export -f inc_ok inc_fail count_lines
export -f is_retryable_log is_geo_blocked_log
export -f run_site

# ───────────────────────────────────────────────────────────────
# Execute
# ───────────────────────────────────────────────────────────────
START_ALL=$(date +%s)

printf "%s\n" "${SITES[@]}" \
| xargs -I{} -P "$PARALLEL" bash -c 'run_site "$@"' _ {}

END_ALL=$(date +%s)

OK_COUNT="$(count_lines "$OK_FILE")"
FAIL_COUNT="$(count_lines "$FAIL_FILE")"

rm -f "$OK_FILE" "$FAIL_FILE"

# ───────────────────────────────────────────────────────────────
# Generate JSON
# ───────────────────────────────────────────────────────────────
log "Generating content.json..."
python3 "$GENERATE_SCRIPT" "$OUTPUT_DIR" "$CONTENT_JSON"

# ───────────────────────────────────────────────────────────────
# Summary
# ───────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
printf "🕒 Runtime     : %s\n" "$(fmt_time $((END_ALL - START_ALL)))"
printf "📺 Sites       : %d\n" "$TOTAL"
printf "✅ OK/SITES    : %d/%d\n" "$OK_COUNT" "$TOTAL"
printf "❌ Failed      : %d\n" "$FAIL_COUNT"
printf "⚙️ Workers     : %s\n" "$PARALLEL"
printf "📁 Output      : %s\n" "$OUTPUT_DIR"
printf "📝 Logs        : %s\n" "$LOG_DIR"
printf "📄 JSON        : %s\n" "$CONTENT_JSON"
echo "══════════════════════════════════════════════"
