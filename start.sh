#!/usr/bin/env bash
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
REPO_URL="https://github.com/iptv-org/epg"
WORK_DIR="$(pwd)/epg"
OUTPUT_BASE="$(pwd)/sites"
CHANNELS_XML="${1:-channels.xml}"
CONTENT_JSON="$OUTPUT_BASE/content.json"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARSE_SCRIPT="$SCRIPT_DIR/parse_xml.py"
GENERATE_SCRIPT="$SCRIPT_DIR/content.py"

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()  { echo -e "${RED}[ERR]${NC}   $*" >&2; }
info() { echo -e "${CYAN}[SITE]${NC}  $*"; }

# ── Cleanup trap (fires on exit, error, or Ctrl+C) ────────────────────────────
cleanup() {
  if [[ -d "$WORK_DIR" ]]; then
    log "Cleaning up EPG repo: $WORK_DIR …"
    rm -rf "$WORK_DIR"
    log "  ✔  Repo removed."
  fi
}
trap cleanup EXIT

# ── Validate deps ─────────────────────────────────────────────────────────────
for cmd in git npm python3; do
  if ! command -v "$cmd" &>/dev/null; then
    err "Missing required command: $cmd"
    exit 1
  fi
done

for script in "$PARSE_SCRIPT" "$GENERATE_SCRIPT"; do
  if [[ ! -f "$script" ]]; then
    err "Required script not found: $script"
    err "Ensure parse_xml.py and content.py are in the same directory as this script."
    exit 1
  fi
done

# ── Validate XML ──────────────────────────────────────────────────────────────
if [[ ! -f "$CHANNELS_XML" ]]; then
  err "Channels XML not found: $CHANNELS_XML"
  err "Usage: $0 [path/to/channels.xml]"
  exit 1
fi

# ── Parse unique sites from XML via parse.py ──────────────────────────────────
log "Parsing sites from: $CHANNELS_XML"

mapfile -t SITES < <(python3 "$PARSE_SCRIPT" "$CHANNELS_XML")

if [[ ${#SITES[@]} -eq 0 ]]; then
  err "No sites found in $CHANNELS_XML"
  exit 1
fi

log "Found ${#SITES[@]} unique site(s):"
for s in "${SITES[@]}"; do info "  → $s"; done
echo ""

# ── Clone repo ────────────────────────────────────────────────────────────────
if [[ -d "$WORK_DIR" ]]; then
  log "Removing existing repo for fresh clone…"
  rm -rf "$WORK_DIR"
fi

log "Cloning $REPO_URL …"
git clone --depth 1 "$REPO_URL" "$WORK_DIR"

log "Installing npm dependencies…"
cd "$WORK_DIR"
npm install --prefer-offline --silent
mkdir -p "$WORK_DIR/guides"
mkdir -p "$OUTPUT_BASE"

# ── Grab + move guides ────────────────────────────────────────────────────────
PASS=0; FAIL=0

for SITE in "${SITES[@]}"; do
  SAFE="${SITE//[^a-zA-Z0-9._-]/_}"
  DEST_DIR="$OUTPUT_BASE/$SITE"
  DEST_FILE="$DEST_DIR/guides.xml"

  mkdir -p "$DEST_DIR"
  info "Grabbing: $SITE"

  # Clear stale XMLs before each run
  rm -f "$WORK_DIR/guides/"*.xml 2>/dev/null || true

  if npm run grab -- --sites="$SITE" >> "/tmp/epg_${SAFE}.log" 2>&1; then

    GENERATED=$(find "$WORK_DIR/guides" -maxdepth 1 -name "*.xml" | head -1)

    if [[ -n "$GENERATED" && -f "$GENERATED" ]]; then
      mv "$GENERATED" "$DEST_FILE"
      BYTES=$(wc -c < "$DEST_FILE")
      PROGS=$(grep -c '<programme' "$DEST_FILE" 2>/dev/null || echo 0)
      log "  ✔  $DEST_FILE  ($BYTES bytes, $PROGS programmes)"
      (( PASS++ )) || true
    else
      warn "  ⚠  Grab ran but produced no XML for: $SITE"
      warn "     Log: /tmp/epg_${SAFE}.log"
      (( FAIL++ )) || true
    fi

  else
    err "  ✗  npm run grab failed for: $SITE"
    err "     Log: /tmp/epg_${SAFE}.log"
    (( FAIL++ )) || true
  fi

done

# ── Generate content.json ─────────────────────────────────────────────────────
echo ""
log "Generating content.json …"
python3 "$GENERATE_SCRIPT" "$OUTPUT_BASE" "$CONTENT_JSON"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════"
printf "  ${GREEN}✔  Passed${NC}     : %d\n"  "$PASS"
printf "  ${RED}✗  Failed${NC}     : %d\n"  "$FAIL"
echo "  Output root  : $OUTPUT_BASE"
echo "  Content JSON : $CONTENT_JSON"
echo "════════════════════════════════════════════════════"
echo ""
echo "Output layout:"
find "$OUTPUT_BASE" -name "guides.xml" | sort | while read -r f; do
  BYTES=$(wc -c < "$f")
  PROGS=$(grep -c '<programme' "$f" 2>/dev/null || echo 0)
  printf "  %-55s  %7d bytes  %5d programmes\n" "$f" "$BYTES" "$PROGS"
done
echo "  $CONTENT_JSON"