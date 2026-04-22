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

# ── Colors ─────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m'

ts(){ date '+%Y-%m-%d %H:%M:%S'; }

log(){ echo -e "${GRAY}[$(ts)]${NC} ℹ️  $*"; }
ok(){ echo -e "${GRAY}[$(ts)]${NC} ✅ $*"; }
warn(){ echo -e "${GRAY}[$(ts)]${NC} ⚠️ $*"; }
err(){ echo -e "${GRAY}[$(ts)]${NC} ❌ $*" >&2; }

fmt_time() {
  local s=$1
  printf "%02dh %02dm %02ds" $((s/3600)) $(((s%3600)/60)) $((s%60))
}

# ── Backtrace ──────────────────────────────────────────────────
trap 'err "Crash at ${BASH_SOURCE[0]}:${LINENO}"' ERR

cleanup() {
  [[ "$KEEP_REPO" == "1" ]] && return
  [[ -d "$WORK_DIR" ]] && rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$OUTPUT_DIR" "$LOG_DIR"

# ── Shared counters (IMPORTANT for parallel safety) ────────────
OK_FILE="$(mktemp)"
FAIL_FILE="$(mktemp)"
: > "$OK_FILE"
: > "$FAIL_FILE"

inc_ok(){ echo 1 >> "$OK_FILE"; }
inc_fail(){ echo 1 >> "$FAIL_FILE"; }

count_lines(){ wc -l < "$1" | tr -d ' '; }

# ── Auto workers ───────────────────────────────────────────────
detect_workers() {
  CPU=$(nproc)
  MEM=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
  W=$((CPU*2))
  R=$((MEM/450))
  ((W>R)) && W=$R
  ((W<2)) && W=2
  ((W>12)) && W=12
  echo "$W"
}

[[ "$PARALLEL" == "auto" ]] && PARALLEL=$(detect_workers)

# ── Repo ───────────────────────────────────────────────────────
log "Preparing repo..."

if [[ -d "$WORK_DIR/.git" ]]; then
  git -C "$WORK_DIR" fetch --depth 1 origin master >/dev/null 2>&1 || true
  git -C "$WORK_DIR" reset --hard origin/master >/dev/null 2>&1 || true
else
  git clone --depth 1 "$REPO_URL" "$WORK_DIR" >/dev/null 2>&1
fi

cd "$WORK_DIR"
npm ci --silent >/dev/null 2>&1

# ── Sites ──────────────────────────────────────────────────────
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
[[ "$TOTAL" -eq 0 ]] && { err "No sites"; exit 1; }

log "Sites=$TOTAL Workers=$PARALLEL"

export WORK_DIR OUTPUT_DIR LOG_DIR PROXY_URL
export DELAY TIMEOUT MAX_CONN MAX_RETRIES RETRY_SLEEP
export OK_FILE FAIL_FILE

# ── Error detection ────────────────────────────────────────────
is_retryable_log() {
  grep -Eiq '500|502|503|504|429|timeout|ECONNRESET|ETIMEDOUT|rate limit|network error|socket hang up' "$1"
}

is_geo_blocked_log() {
  grep -Eiq 'geo|forbidden|not available|country not supported|access denied|ip blocked|403' "$1"
}

# ── Worker ─────────────────────────────────────────────────────
run_site() {
  local site="$1"
  cd "$WORK_DIR"

  local out="$OUTPUT_DIR/${site}.xml"
  local log="$LOG_DIR/${site}.log"

  local start=$(date +%s)
  local attempt=1

  while (( attempt <= MAX_RETRIES )); do
    rm -f "$out"

    CMD=(npm run grab -- --sites="$site" --output="$out" --delay="$DELAY" --timeout="$TIMEOUT" --maxConnections="$MAX_CONN")
    [[ -n "$PROXY_URL" ]] && CMD+=(--proxy="$PROXY_URL")

    if "${CMD[@]}" > "$log" 2>&1 && [[ -s "$out" ]]; then
      ok "📺 $site done in $(fmt_time $(( $(date +%s) - start )))"
      inc_ok
      return 0
    fi

    if is_geo_blocked_log "$log"; then
      err "🌍 $site GEO BLOCKED"
      inc_fail
      return 1
    fi

    if is_retryable_log "$log"; then
      (( attempt < MAX_RETRIES )) && sleep "$RETRY_SLEEP"
    else
      err "❌ $site hard fail"
      inc_fail
      return 1
    fi

    ((attempt++))
  done

  inc_fail
  return 1
}

export -f run_site fmt_time inc_ok inc_fail is_retryable_log is_geo_blocked_log ok err

# ── Run ────────────────────────────────────────────────────────
START=$(date +%s)

printf "%s\n" "${SITES[@]}" \
| xargs -I{} -P "$PARALLEL" bash -c 'run_site "$@"' _ {}

END=$(date +%s)

# ── Cleanup counters ───────────────────────────────────────────
OK_COUNT=$(count_lines "$OK_FILE")
FAIL_COUNT=$(count_lines "$FAIL_FILE")

rm -f "$OK_FILE" "$FAIL_FILE"

# ── Generate ───────────────────────────────────────────────────
log "Generating content.json..."
python3 "$GENERATE_SCRIPT" "$OUTPUT_DIR" "$CONTENT_JSON"

# ── Summary ────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
printf "🕒 Runtime     : %s\n" "$(fmt_time $((END-START)))"
printf "📺 Sites       : %d\n" "$TOTAL"
printf "✅ OK/SITES    : %d/%d\n" "$OK_COUNT" "$TOTAL"
printf "❌ Failed      : %d\n" "$FAIL_COUNT"
printf "⚙️ Workers     : %s\n" "$PARALLEL"
printf "📁 Output      : %s\n" "$OUTPUT_DIR"
printf "📝 Logs        : %s\n" "$LOG_DIR"
printf "📄 JSON        : %s\n" "$CONTENT_JSON"
echo "══════════════════════════════════════════════"
