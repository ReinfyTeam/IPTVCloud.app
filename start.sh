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
SITE_TIMEOUT="${SITE_TIMEOUT:-3600}"   # 1 hour
GRAB_TIMEOUT="${GRAB_TIMEOUT:-15000}"
BATCH_SIZE="${BATCH_SIZE:-1}"

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

log(){ echo -e "[$(date +%H:%M:%S)] ${GREEN}✅${NC} $*"; }

elapsed() {
    local sec=$(( $(date +%s) - $1 ))
    [[ -z "$sec" ]] && sec=0
    printf "%ss" "$sec"
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
    rm -f "$WORKER"
}
trap cleanup EXIT

mkdir -p "$OUT_DIR"

# ── CLONE ───────────────────────────────────────────────────────
if [[ -d "$WORK_DIR/.git" ]]; then
    log "Updating repo..."
    git -C "$WORK_DIR" pull --quiet || true
else
    log "Cloning repo..."
    git clone --depth 1 "$REPO_URL" "$WORK_DIR"
fi

cd "$WORK_DIR"

log "Installing npm deps..."
npm ci --silent

# ── SITES ───────────────────────────────────────────────────────
mapfile -t SITES < <(
grep '🟢' SITES.md |
sed -n 's#.*href="sites/\([^"]*\)".*🟢.*#\1#p' |
sort -u
)

TOTAL="${#SITES[@]}"
log "Sites: $TOTAL"
log "Workers: $PARALLEL"

TMP=$(mktemp)
printf "%s\n" "${SITES[@]}" > "$TMP"

# ── WORKER ──────────────────────────────────────────────────────
WORKER=$(mktemp)

cat > "$WORKER" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail

SITE="$1"
ROOT="$2"
TIMEOUT="$3"
GRAB_TIMEOUT="$4"

START=$(date +%s)
OUT="$ROOT/sites/${SITE}.xml"

cd "$ROOT/epg"

# HARD 1-HOUR LIMIT
timeout "$TIMEOUT" npm run grab -- \
    --sites="$SITE" \
    --output="$ROOT/sites/{site}.xml" \
    --timeout="$GRAB_TIMEOUT" \
    >/dev/null 2>&1

RC=$?

ELAPSED=$(( $(date +%s) - START ))

if [[ $RC -eq 124 ]]; then
    echo "TIMEOUT|$SITE|$ELAPSED"
    exit 0
fi

if [[ -s "$OUT" ]]; then
    BYTES=$(wc -c < "$OUT" | tr -d ' ')
    PROGS=$(grep -c '<programme' "$OUT" 2>/dev/null || echo 0)
    echo "PASS|$SITE|$BYTES|$PROGS|$ELAPSED"
else
    echo "FAIL|$SITE|$ELAPSED"
fi
EOF

chmod +x "$WORKER"

# ── AGGREGATOR ──────────────────────────────────────────────────
DONE=0
PASS=0
FAIL=0

declare -A FINISHED

while IFS='|' read -r TYPE A B C D; do

    SITE="$A"

    # Prevent duplicates forever
    if [[ -n "${FINISHED[$SITE]:-}" ]]; then
        continue
    fi
    FINISHED[$SITE]=1

    DONE=$((DONE+1))

    case "$TYPE" in

        PASS)
            PASS=$((PASS+1))
            SIZE=$(fbytes "$B")
            printf "${GREEN}[OK %d/%d]${NC} %-35s %10s %8s progs %8ss\n" \
                "$DONE" "$TOTAL" "$SITE" "$SIZE" "$C" "$D"
            ;;

        FAIL)
            FAIL=$((FAIL+1))
            printf "${RED}[FAIL %d/%d]${NC} %-35s after %ss\n" \
                "$DONE" "$TOTAL" "$SITE" "$B"
            ;;

        TIMEOUT)
            FAIL=$((FAIL+1))
            printf "${YELLOW}[TIMEOUT %d/%d]${NC} %-35s after %ss (1h killed)\n" \
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
echo "Passed : $PASS"
echo "Failed : $FAIL"
echo "Total  : $TOTAL"
echo "Time   : ${TOTAL_TIME}s"
echo "Output : $OUT_DIR"
echo "═══════════════════════════════════════"
