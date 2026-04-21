#!/usr/bin/env bash
set -euo pipefail 

REPO_URL="https://github.com/iptv-org/epg"

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="$BASE_DIR/epg"
OUTPUT_DIR="$BASE_DIR/sites"
LOG_DIR="$OUTPUT_DIR/logs"

GENERATE_SCRIPT="$BASE_DIR/content.py"
CONTENT_JSON="$OUTPUT_DIR/content.json"
SITES_MD="$WORK_DIR/SITES.md"

PROXY_URL="${PROXY_URL:-}"

PARALLEL="${PARALLEL:-6}"
DELAY="${DELAY:-300}"
TIMEOUT="${TIMEOUT:-5000}"
MAX_CONN="${MAX_CONN:-20}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()  { echo -e "${RED}[ERR]${NC}   $*" >&2; }

cleanup() {
  [[ "${KEEP_REPO:-0}" == "1" ]] && return
  [[ -d "$WORK_DIR" ]] && rm -rf "$WORK_DIR"
}
trap cleanup EXIT

for cmd in git npm python3 grep sed sort wc xargs stdbuf; do
  command -v "$cmd" >/dev/null 2>&1 || {
    err "Missing command: $cmd"
    exit 1
  }
done

mkdir -p "$OUTPUT_DIR" "$LOG_DIR"

# ── Clone / Update ─────────────────────────────────────────────
if [[ -d "$WORK_DIR/.git" ]]; then
  log "Updating repo..."
  git -C "$WORK_DIR" fetch --depth 1 origin master >/dev/null 2>&1 || true
  git -C "$WORK_DIR" reset --hard origin/master >/dev/null 2>&1 || true
else
  log "Cloning repo..."
  git clone --depth 1 "$REPO_URL" "$WORK_DIR"
fi

cd "$WORK_DIR"

log "Installing dependencies..."
npm ci --silent

# ── Read online sites ──────────────────────────────────────────
mapfile -t ONLINE_SITES < <(
  grep '🟢' "$SITES_MD" |
  sed -n 's#.*href="sites/\([^"]*\)".*🟢.*#\1#p' |
  sort -u
)

SITES=()

for SITE_NAME in "${ONLINE_SITES[@]}"; do
  [[ -d "$WORK_DIR/sites/$SITE_NAME" ]] && SITES+=("$SITE_NAME")
done

TOTAL="${#SITES[@]}"

[[ "$TOTAL" -eq 0 ]] && {
  err "No valid sites found."
  exit 1
}

log "Found $TOTAL sites"

export WORK_DIR OUTPUT_DIR LOG_DIR PROXY_URL DELAY TIMEOUT MAX_CONN GREEN YELLOW RED CYAN NC

# ── Worker ─────────────────────────────────────────────────────
run_site() {
  SITE_NAME="$1"

  cd "$WORK_DIR"

  OUTPUT_FILE="$OUTPUT_DIR/${SITE_NAME}.xml"
  LOG_FILE="$LOG_DIR/${SITE_NAME}.log"

  echo -e "${CYAN}[START]${NC} $SITE_NAME"

  CMD=(
    npm run grab --
    --sites="$SITE_NAME"
    --output="$OUTPUT_FILE"
    --delay="$DELAY"
    --timeout="$TIMEOUT"
    --maxConnections="$MAX_CONN"
  )

  [[ -n "$PROXY_URL" ]] && CMD+=(--proxy="$PROXY_URL")

  # LIVE OUTPUT TO CONSOLE + LOG FILE
  if stdbuf -oL -eL "${CMD[@]}" 2>&1 \
    | sed "s/^/[${SITE_NAME}] /" \
    | tee "$LOG_FILE"
  then
    if [[ -s "$OUTPUT_FILE" ]]; then
      BYTES=$(wc -c < "$OUTPUT_FILE")
      PROGS=$(grep -c '<programme' "$OUTPUT_FILE" 2>/dev/null || true)
      echo -e "${GREEN}[DONE]${NC}  $SITE_NAME ($BYTES bytes / $PROGS programmes)"
    else
      echo -e "${YELLOW}[EMPTY]${NC} $SITE_NAME"
    fi
  else
    echo -e "${RED}[FAIL]${NC}  $SITE_NAME"
  fi
}

export -f run_site

# ── Run Parallel ───────────────────────────────────────────────
log "Starting $PARALLEL parallel workers..."

printf "%s\n" "${SITES[@]}" \
| xargs -I{} -P "$PARALLEL" bash -c 'run_site "$@"' _ {}

# ── Generate JSON ──────────────────────────────────────────────
echo ""
log "Generating content.json..."
python3 "$GENERATE_SCRIPT" "$OUTPUT_DIR" "$CONTENT_JSON"

echo ""
echo "══════════════════════════════════════════════"
printf "Sites    : %d\n" "$TOTAL"
printf "Workers  : %s\n" "$PARALLEL"
printf "Output   : %s\n" "$OUTPUT_DIR"
printf "JSON     : %s\n" "$CONTENT_JSON"
echo "══════════════════════════════════════════════"
