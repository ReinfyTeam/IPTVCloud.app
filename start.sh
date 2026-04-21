#!/usr/bin/env bash
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
REPO_URL="https://github.com/iptv-org/epg"
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="$BASE_DIR/epg"
OUTPUT_BASE="$BASE_DIR/sites"

# Auto-detect channels.xml properly
CHANNELS_XML="${1:-}"

if [[ -z "$CHANNELS_XML" ]]; then
  if [[ -f "$BASE_DIR/channels.xml" ]]; then
    CHANNELS_XML="$BASE_DIR/channels.xml"
  elif [[ -f "./channels.xml" ]]; then
    CHANNELS_XML="./channels.xml"
  else
    CHANNELS_XML=""
  fi
fi

CONTENT_JSON="$OUTPUT_BASE/content.json"
PARSE_SCRIPT="$BASE_DIR/parse_xml.py"
GENERATE_SCRIPT="$BASE_DIR/content.py"

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()  { echo -e "${RED}[ERR]${NC}   $*" >&2; }
info() { echo -e "${CYAN}[SITE]${NC}  $*"; }

# ── Cleanup ───────────────────────────────────────────────────────────────────
cleanup() {
  if [[ -d "$WORK_DIR" ]]; then
    log "Cleaning up EPG repo..."
    rm -rf "$WORK_DIR"
  fi
}
trap cleanup EXIT

# ── Dependencies ──────────────────────────────────────────────────────────────
for cmd in git npm python3; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    err "Missing required command: $cmd"
    exit 1
  fi
done

for script in "$PARSE_SCRIPT" "$GENERATE_SCRIPT"; do
  if [[ ! -f "$script" ]]; then
    err "Required script missing: $script"
    exit 1
  fi
done

# ── Validate XML ──────────────────────────────────────────────────────────────
if [[ -z "$CHANNELS_XML" || ! -f "$CHANNELS_XML" ]]; then
  err "channels.xml not found."
  echo ""
  echo "Accepted locations:"
  echo "  $BASE_DIR/channels.xml"
  echo "  ./channels.xml"
  echo ""
  echo "Usage:"
  echo "  ./start.sh"
  echo "  ./start.sh /path/to/channels.xml"
  exit 1
fi

CHANNELS_XML="$(realpath "$CHANNELS_XML")"
log "Using channels file: $CHANNELS_XML"

# ── Parse Sites ───────────────────────────────────────────────────────────────
log "Parsing sites..."

mapfile -t SITES < <(python3 "$PARSE_SCRIPT" "$CHANNELS_XML")

if [[ ${#SITES[@]} -eq 0 ]]; then
  err "No sites found in XML."
  exit 1
fi

log "Found ${#SITES[@]} site(s)"
for s in "${SITES[@]}"; do
  info "$s"
done

# ── Clone Repo ────────────────────────────────────────────────────────────────
rm -rf "$WORK_DIR"

log "Cloning repository..."
git clone --depth 1 "$REPO_URL" "$WORK_DIR"

cd "$WORK_DIR"

log "Installing dependencies..."
npm install --silent --prefer-offline

mkdir -p "$WORK_DIR/guides"
mkdir -p "$OUTPUT_BASE"

# ── Process Sites ─────────────────────────────────────────────────────────────
PASS=0
FAIL=0

for SITE in "${SITES[@]}"; do
  SAFE="${SITE//[^a-zA-Z0-9._-]/_}"
  DEST_DIR="$OUTPUT_BASE/$SITE"
  DEST_FILE="$DEST_DIR/guides.xml"

  mkdir -p "$DEST_DIR"

  info "Processing $SITE"

  rm -f "$WORK_DIR/guides/"*.xml 2>/dev/null || true

  if npm run grab -- --sites="$SITE" >"/tmp/epg_${SAFE}.log" 2>&1; then
    GENERATED="$(find "$WORK_DIR/guides" -maxdepth 1 -name '*.xml' | head -1)"

    if [[ -n "$GENERATED" && -f "$GENERATED" ]]; then
      mv "$GENERATED" "$DEST_FILE"
      BYTES=$(wc -c < "$DEST_FILE")
      PROGS=$(grep -c '<programme' "$DEST_FILE" || true)

      log "Saved $DEST_FILE ($BYTES bytes / $PROGS programmes)"
      ((PASS++))
    else
      warn "No XML produced for $SITE"
      ((FAIL++))
    fi
  else
    err "Grab failed for $SITE"
    ((FAIL++))
  fi
done

# ── Generate content.json ─────────────────────────────────────────────────────
log "Generating content.json..."
python3 "$GENERATE_SCRIPT" "$OUTPUT_BASE" "$CONTENT_JSON"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════"
printf "Passed : %d\n" "$PASS"
printf "Failed : %d\n" "$FAIL"
echo "Output : $OUTPUT_BASE"
echo "JSON   : $CONTENT_JSON"
echo "══════════════════════════════════════"