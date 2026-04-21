#!/usr/bin/env bash
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
REPO_URL="https://github.com/iptv-org/epg"
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="$BASE_DIR/epg"
OUTPUT_DIR="$BASE_DIR/sites"
GENERATE_SCRIPT="$BASE_DIR/content.py"
CONTENT_JSON="$OUTPUT_DIR/content.json"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()  { echo -e "${RED}[ERR]${NC}   $*" >&2; }
site() { echo -e "${CYAN}[SITE]${NC}  $*"; }

# ── Cleanup ───────────────────────────────────────────────────────────────────
cleanup() {
  if [[ -d "$WORK_DIR" ]]; then
    log "Cleaning up cloned repo..."
    rm -rf "$WORK_DIR"
  fi
}
trap cleanup EXIT

# ── Check dependencies ────────────────────────────────────────────────────────
for cmd in git npm find sed; do
  command -v "$cmd" >/dev/null 2>&1 || {
    err "Missing command: $cmd"
    exit 1
  }
done

# ── Fresh clone ───────────────────────────────────────────────────────────────
rm -rf "$WORK_DIR"
mkdir -p "$OUTPUT_DIR"

log "Cloning iptv-org/epg..."
git clone --depth 1 "$REPO_URL" "$WORK_DIR"

cd "$WORK_DIR"

log "Installing npm dependencies..."
npm install --silent --prefer-offline

# ── Detect all sites/* folders ────────────────────────────────────────────────
log "Scanning sites/ directory..."

mapfile -t SITES < <(
  find sites -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort
)

if [[ ${#SITES[@]} -eq 0 ]]; then
  err "No site folders found in sites/"
  exit 1
fi

log "Found ${#SITES[@]} site(s)"

PASS=0
FAIL=0

# ── Grab each site individually ───────────────────────────────────────────────
for SITE_NAME in "${SITES[@]}"; do
  site "$SITE_NAME"

  mkdir -p "$OUTPUT_DIR/$SITE_NAME"

  OUTPUT_FILE="$OUTPUT_DIR/${SITE_NAME}.xml"
  
  if npm run grab -- \
      --sites="$SITE_NAME" \
      --output="$OUTPUT_FILE" \
      >"/tmp/epg_${SITE_NAME}.log" 2>&1; then

      if [[ -f "$OUTPUT_FILE" ]]; then
        BYTES=$(wc -c < "$OUTPUT_FILE")
        PROGS=$(grep -c '<programme' "$OUTPUT_FILE" 2>/dev/null || true)

        log "✔ Saved $OUTPUT_FILE ($BYTES bytes / $PROGS programmes)"
        ((PASS++))
      else
        warn "Grab succeeded but no XML output for $SITE_NAME"
        ((FAIL++))
      fi
  else
      err "Grab failed: $SITE_NAME"
      err "See log: /tmp/epg_${SITE_NAME}.log"
      ((FAIL++))
  fi
done

# ── Generate content.json ───────────────────────────────────────────────────── 
echo "" 
log "Generating content.json …" 
python3 "$GENERATE_SCRIPT" "$OUTPUT_DIR" "$CONTENT_JSON"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════"
printf "Passed : %d\n" "$PASS"
printf "Failed : %d\n" "$FAIL"
echo "Output : $OUTPUT_DIR"
echo "══════════════════════════════════════"