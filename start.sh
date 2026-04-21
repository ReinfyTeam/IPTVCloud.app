#!/usr/bin/env bash
set -euo pipefail

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

# Parallel workers (adjust to server power)
PARALLEL="${PARALLEL:-6}"

# Grab tuning
DELAY="${DELAY:-300}"
TIMEOUT="${TIMEOUT:-5000}"
MAX_CONN="${MAX_CONN:-20}"

# ── Colors ─────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()  { echo -e "${RED}[ERR]${NC}   $*" >&2; }
site() { echo -e "${CYAN}[SITE]${NC}  $*"; }

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
for cmd in git npm python3 grep sed sort wc xargs; do
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

# ── Keep Valid Site Folders ────────────────────────────────────
SITES=()

for SITE_NAME in "${ONLINE_SITES[@]}"; do
  if [[ -d "$WORK_DIR/sites/$SITE_NAME" ]]; then
    SITES+=("$SITE_NAME")
  fi
done

TOTAL="${#SITES[@]}"

if [[ "$TOTAL" -eq 0 ]]; then
  err "No valid site folders found."
  exit 1
fi

log "Found $TOTAL valid online sites"

# ── Export for Parallel Workers ────────────────────────────────
export WORK_DIR OUTPUT_DIR LOG_DIR PROXY_URL DELAY TIMEOUT MAX_CONN

# ── Worker Function ────────────────────────────────────────────
run_site() {
  SITE_NAME="$1"

  cd "$WORK_DIR"

  OUTPUT_FILE="$OUTPUT_DIR/${SITE_NAME}.xml"
  LOG_FILE="$LOG_DIR/${SITE_NAME}.log"

  CMD=(
    npm run grab --
    --sites="$SITE_NAME"
    --output="$OUTPUT_FILE"
    --delay="$DELAY"
    --timeout="$TIMEOUT"
    --maxConnections="$MAX_CONN"
  )

  if [[ -n "$PROXY_URL" ]]; then
    CMD+=(--proxy="$PROXY_URL")
  fi

  if "${CMD[@]}" > "$LOG_FILE" 2>&1; then
    if [[ -s "$OUTPUT_FILE" ]]; then
      BYTES=$(wc -c < "$OUTPUT_FILE")
      PROGS=$(grep -c '<programme' "$OUTPUT_FILE" 2>/dev/null || true)
      echo "PASS|$SITE_NAME|$BYTES|$PROGS"
    else
      echo "FAIL|$SITE_NAME|EMPTY"
    fi
  else
    echo "FAIL|$SITE_NAME|ERROR"
  fi
}

export -f run_site

# ── Parallel Execution ─────────────────────────────────────────
log "Running parallel fetch ($PARALLEL workers)..."

RESULTS_FILE="$OUTPUT_DIR/results.tmp"

printf "%s\n" "${SITES[@]}" \
| xargs -I{} -P "$PARALLEL" bash -c 'run_site "$@"' _ {} \
> "$RESULTS_FILE"

# ── Parse Results ──────────────────────────────────────────────
PASS=0
FAIL=0

while IFS='|' read -r STATUS SITE_NAME A B; do
  if [[ "$STATUS" == "PASS" ]]; then
    PASS=$((PASS + 1))
    echo -e "${GREEN}[OK]${NC}   $SITE_NAME (${A} bytes / ${B} programmes)"
  else
    FAIL=$((FAIL + 1))
    echo -e "${RED}[FAIL]${NC} $SITE_NAME"
  fi
done < "$RESULTS_FILE"

rm -f "$RESULTS_FILE"

# ── Generate content.json ──────────────────────────────────────
echo ""
log "Generating content.json..."

python3 "$GENERATE_SCRIPT" "$OUTPUT_DIR" "$CONTENT_JSON"

# ── Summary ────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
printf "Passed     : %d\n" "$PASS"
printf "Failed     : %d\n" "$FAIL"
printf "Total      : %d\n" "$TOTAL"
printf "Workers    : %s\n" "$PARALLEL"
printf "Delay      : %sms\n" "$DELAY"
printf "Timeout    : %sms\n" "$TIMEOUT"
printf "Connections: %s\n" "$MAX_CONN"
printf "Output     : %s\n" "$OUTPUT_DIR"
printf "JSON       : %s\n" "$CONTENT_JSON"
echo "══════════════════════════════════════════════"
