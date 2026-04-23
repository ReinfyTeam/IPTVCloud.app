#!/usr/bin/env bash
set -Eeuo pipefail

# ════════════════════════════════════════════════════════════════
# IPTV-ORG EPG TV XML SCRAPER PROGRAMMES
# ════════════════════════════════════════════════════════════════

START_TS=$(date +%s)

# ── CONFIG ──────────────────────────────────────────────────────
REPO_URL="https://github.com/iptv-org/epg"
BASE_DIR="$(pwd)"
WORK_DIR="$BASE_DIR/epg"
OUT_DIR="$BASE_DIR/sites"

PARALLEL="${PARALLEL:-8}"
SITE_TIMEOUT="${SITE_TIMEOUT:-3600}"     # 1 hour max/site
GRAB_TIMEOUT="${GRAB_TIMEOUT:-1000}"

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "[$(date +%H:%M:%S)] ${GREEN}✅${NC} $*"
}

fbytes() {
    local b="${1:-0}"
    awk -v b="$b" '
    BEGIN{
      if(b>=1073741824) printf "%.2f GB",b/1073741824;
      else if(b>=1048576) printf "%.2f MB",b/1048576;
      else if(b>=1024) printf "%.1f KB",b/1024;
      else printf "%d B",b;
    }'
}

cleanup() {
    rm -f "$TMP" "$WORKER"
}
trap cleanup EXIT

mkdir -p "$OUT_DIR"

# ── CLONE / UPDATE ──────────────────────────────────────────────
if [[ -d "$WORK_DIR/.git" ]]; then
    log "Updating repo..."
    git -C "$WORK_DIR" pull --quiet || true
else
    log "Cloning repo..."
    git clone --depth 1 "$REPO_URL" "$WORK_DIR"
fi

cd "$WORK_DIR"

log "Installing npm dependencies..."
npm ci --silent

# ── LOAD GREEN SITES ────────────────────────────────────────────
mapfile -t SITES < <(
grep '🟢' SITES.md |
sed -n 's#.*href="sites/\([^"]*\)".*🟢.*#\1#p' |
sort -u
)

TOTAL="${#SITES[@]}"

log "Sites detected: $TOTAL"
log "Parallel workers: $PARALLEL"

TMP=$(mktemp)
printf "%s\n" "${SITES[@]}" > "$TMP"

# ── WORKER SCRIPT ───────────────────────────────────────────────
WORKER=$(mktemp)

cat > "$WORKER" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail

SITE="$1"
ROOT="$2"
TIMEOUT="$3"
GRAB_TIMEOUT="$4"

START=$(date +%s)

SITE_DIR="$ROOT/sites/$SITE"
OUT_FILE="$SITE_DIR/$SITE.xml"

mkdir -p "$SITE_DIR"

cd "$ROOT/epg"

# Run scraper with hard timeout
timeout "$TIMEOUT" npm run grab -- \
    --sites="$SITE" \
    --output="$ROOT/sites/{site}/{site}.xml" \
    --timeout="$GRAB_TIMEOUT" \
    >/dev/null 2>&1

RC=$?
ELAPSED=$(( $(date +%s) - START ))

if [[ $RC -eq 124 ]]; then
    rm -f "$OUT_FILE"
    echo "TIMEOUT|$SITE|$ELAPSED"
    exit 0
fi

if [[ -s "$OUT_FILE" ]]; then
    BYTES=$(wc -c < "$OUT_FILE" | tr -d ' ')
    PROGS=$(grep -c '<programme' "$OUT_FILE" 2>/dev/null || echo 0)
    echo "PASS|$SITE|$BYTES|$PROGS|$ELAPSED"
else
    rm -f "$OUT_FILE"
    echo "FAIL|$SITE|$ELAPSED"
fi
EOF

chmod +x "$WORKER"

# ── PROCESS RESULTS ─────────────────────────────────────────────
DONE=0
PASS=0
FAIL=0

declare -A FINISHED

while IFS='|' read -r TYPE A B C D; do

    SITE="$A"

    [[ -n "${FINISHED[$SITE]:-}" ]] && continue
    FINISHED[$SITE]=1

    DONE=$((DONE+1))

    case "$TYPE" in
        PASS)
            PASS=$((PASS+1))
            SIZE=$(fbytes "$B")
            printf "${GREEN}[OK %d/%d]${NC} %-35s %10s %8s progs %6ss\n" \
                "$DONE" "$TOTAL" "$SITE" "$SIZE" "$C" "$D"
            ;;

        FAIL)
            FAIL=$((FAIL+1))
            printf "${RED}[FAIL %d/%d]${NC} %-35s after %ss\n" \
                "$DONE" "$TOTAL" "$SITE" "$B"
            ;;

        TIMEOUT)
            FAIL=$((FAIL+1))
            printf "${YELLOW}[TIMEOUT %d/%d]${NC} %-35s after %ss\n" \
                "$DONE" "$TOTAL" "$SITE" "$B"
            ;;
    esac

done < <(
xargs -d '\n' -n1 -P "$PARALLEL" -I{} \
bash "$WORKER" "{}" "$BASE_DIR" "$SITE_TIMEOUT" "$GRAB_TIMEOUT" < "$TMP"
)

# ── SUMMARY ─────────────────────────────────────────────────────
TOTAL_TIME=$(( $(date +%s) - START_TS ))

echo
echo "═══════════════════════════════════════"
echo -e "${GREEN}Passed :${NC} $PASS"
echo -e "${RED}Failed :${NC} $FAIL"
echo -e "${CYAN}Total  :${NC} $TOTAL"
echo -e "${YELLOW}Time   :${NC} ${TOTAL_TIME}s"
echo "Output : $OUT_DIR"
echo "═══════════════════════════════════════"
