#!/usr/bin/env bash
set -Eeuo pipefail

# ════════════════════════════════════════════════════════════════
# IPTV-ORG EPG TV XML SCRAPER — parallel batch grabber
# ════════════════════════════════════════════════════════════════
#
# Speed-ups vs the old version:
#   • Sites are batched per worker (cuts npm/node spawn overhead from
#     ~232 invocations to PARALLEL invocations).
#   • Per-site channel fetches run concurrently inside `npm run grab`
#     via --maxConnections.
#   • Default outer parallelism scales with CPU count.
#   • Worker process tree is reaped on Ctrl-C.
#
# Tunables (env vars):
#   PARALLEL          outer batch workers           (default: max(8, nproc*2))
#   MAX_CONNECTIONS   inner per-site channel pool   (default: 10)
#   SITE_TIMEOUT      hard timeout per *batch*      (default: 3600s)
#   GRAB_TIMEOUT      per-channel HTTP timeout (ms) (default: 60000)
#   DAYS              days of EPG to grab           (default: 2)
#   REPO_URL          iptv-org/epg fork to use
# ════════════════════════════════════════════════════════════════

START_TS=$(date +%s)

# ── CONFIG ──────────────────────────────────────────────────────
REPO_URL="${REPO_URL:-https://github.com/iptv-org/epg}"
BASE_DIR="$(pwd)"
WORK_DIR="$BASE_DIR/epg"
OUT_DIR="$BASE_DIR/sites"

NPROC=$(nproc 2>/dev/null || echo 4)
DEFAULT_PAR=$(( NPROC * 2 ))
[[ $DEFAULT_PAR -lt 8 ]] && DEFAULT_PAR=8

PARALLEL="${PARALLEL:-$DEFAULT_PAR}"
MAX_CONNECTIONS="${MAX_CONNECTIONS:-10}"
SITE_TIMEOUT="${SITE_TIMEOUT:-3600}"
GRAB_TIMEOUT="${GRAB_TIMEOUT:-60000}"
DAYS="${DAYS:-2}"

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    printf "[%s] %b✅%b %s\n" "$(date +%H:%M:%S)" "$GREEN" "$NC" "$*"
}

fbytes() {
    local b="${1:-0}"
    awk -v b="$b" 'BEGIN{
        if(b>=1073741824) printf "%.2f GB",b/1073741824;
        else if(b>=1048576) printf "%.2f MB",b/1048576;
        else if(b>=1024) printf "%.1f KB",b/1024;
        else printf "%d B",b;
    }'
}

TMP=""
WORKER=""
cleanup() {
    [[ -n "$TMP" && -f "$TMP" ]] && rm -f "$TMP"
    [[ -n "$WORKER" && -f "$WORKER" ]] && rm -f "$WORKER"
    # Reap any straggler npm/node procs we spawned via xargs.
    pkill -P $$ 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT TERM

mkdir -p "$OUT_DIR"

# ── CLONE / UPDATE ──────────────────────────────────────────────
if [[ -d "$WORK_DIR/.git" ]]; then
    log "Updating iptv-org/epg checkout..."
    git -C "$WORK_DIR" pull --quiet --ff-only || true
else
    log "Cloning iptv-org/epg..."
    git clone --depth 1 "$REPO_URL" "$WORK_DIR"
fi

cd "$WORK_DIR"

if [[ ! -d node_modules ]]; then
    log "Installing npm dependencies (one-time)..."
    npm ci --silent --no-audit --no-fund
else
    log "node_modules present, skipping npm install."
fi

# ── LOAD GREEN SITES ────────────────────────────────────────────
mapfile -t SITES < <(
    grep '🟢' SITES.md \
    | sed -n 's#.*href="sites/\([^"]*\)".*🟢.*#\1#p' \
    | sort -u
)

TOTAL="${#SITES[@]}"
if [[ $TOTAL -eq 0 ]]; then
    echo -e "${RED}No green sites detected in SITES.md${NC}" >&2
    exit 1
fi

# Batch sites across PARALLEL workers (round-robin chunking).
BATCHES=$PARALLEL
[[ $BATCHES -gt $TOTAL ]] && BATCHES=$TOTAL
BATCH_SIZE=$(( (TOTAL + BATCHES - 1) / BATCHES ))

log "Sites detected   : $TOTAL"
log "Outer workers    : $BATCHES   (PARALLEL=$PARALLEL)"
log "Batch size       : $BATCH_SIZE sites/worker"
log "Inner channels   : $MAX_CONNECTIONS concurrent per worker"
log "Days of guide    : $DAYS"
log "Per-batch budget : ${SITE_TIMEOUT}s"

TMP=$(mktemp)
i=0
batch=""
batch_n=0
for s in "${SITES[@]}"; do
    if [[ -z "$batch" ]]; then
        batch="$s"
    else
        batch="$batch,$s"
    fi
    batch_n=$(( batch_n + 1 ))
    if [[ $batch_n -ge $BATCH_SIZE ]]; then
        printf "%s\n" "$batch" >> "$TMP"
        batch=""
        batch_n=0
    fi
    i=$(( i + 1 ))
done
[[ -n "$batch" ]] && printf "%s\n" "$batch" >> "$TMP"

# ── WORKER ──────────────────────────────────────────────────────
WORKER=$(mktemp)
cat > "$WORKER" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail

BATCH="$1"
ROOT="$2"
TIMEOUT="$3"
GRAB_TIMEOUT="$4"
MAX_CONNECTIONS="$5"
DAYS="$6"

START=$(date +%s)
mkdir -p "$ROOT/sites"
cd "$ROOT/epg"

LOG=$(mktemp)
RC=0
timeout --kill-after=30 "$TIMEOUT" \
    npm run grab -- \
        --sites="$BATCH" \
        --output="$ROOT/sites/{site}/{site}.xml" \
        --timeout="$GRAB_TIMEOUT" \
        --maxConnections="$MAX_CONNECTIONS" \
        --days="$DAYS" \
        > "$LOG" 2>&1 \
    || RC=$?

ELAPSED=$(( $(date +%s) - START ))
rm -f "$LOG"

IFS=',' read -ra SITES <<< "$BATCH"
for SITE in "${SITES[@]}"; do
    OUT_FILE="$ROOT/sites/$SITE/$SITE.xml"
    if [[ $RC -eq 124 || $RC -eq 137 ]]; then
        rm -f "$OUT_FILE"
        echo "TIMEOUT|$SITE|$ELAPSED"
    elif [[ -s "$OUT_FILE" ]]; then
        BYTES=$(wc -c < "$OUT_FILE" | tr -d ' ')
        PROGS=$(grep -c '<programme' "$OUT_FILE" 2>/dev/null || echo 0)
        echo "PASS|$SITE|$BYTES|$PROGS|$ELAPSED"
    else
        rm -f "$OUT_FILE"
        echo "FAIL|$SITE|$ELAPSED"
    fi
done
EOF
chmod +x "$WORKER"

# ── DRIVE WORKERS ───────────────────────────────────────────────
DONE=0
PASS=0
FAIL=0
declare -A FINISHED

while IFS='|' read -r TYPE A B C D; do
    SITE="$A"
    [[ -z "$SITE" ]] && continue
    [[ -n "${FINISHED[$SITE]:-}" ]] && continue
    FINISHED[$SITE]=1
    DONE=$(( DONE + 1 ))

    case "$TYPE" in
        PASS)
            PASS=$(( PASS + 1 ))
            SIZE=$(fbytes "$B")
            printf "${GREEN}[OK %d/%d]${NC} %-35s %10s %8s progs %6ss\n" \
                "$DONE" "$TOTAL" "$SITE" "$SIZE" "$C" "$D"
            ;;
        FAIL)
            FAIL=$(( FAIL + 1 ))
            printf "${RED}[FAIL %d/%d]${NC} %-35s after %ss\n" \
                "$DONE" "$TOTAL" "$SITE" "$B"
            ;;
        TIMEOUT)
            FAIL=$(( FAIL + 1 ))
            printf "${YELLOW}[TIMEOUT %d/%d]${NC} %-35s after %ss\n" \
                "$DONE" "$TOTAL" "$SITE" "$B"
            ;;
    esac
done < <(
    xargs -d '\n' -n1 -P "$BATCHES" -I{} \
        bash "$WORKER" "{}" "$BASE_DIR" "$SITE_TIMEOUT" \
                       "$GRAB_TIMEOUT" "$MAX_CONNECTIONS" "$DAYS" \
        < "$TMP"
)

# ── POST-PROCESS ────────────────────────────────────────────────
log "Pretty-printing XMLTV files..."
python3 "$BASE_DIR/xml_prettier.py" "$OUT_DIR" || true

log "Splitting oversized XMLTV files (>1 MB)..."
python3 "$BASE_DIR/split_xml.py" "$OUT_DIR" || true

log "Regenerating content.json index..."
python3 "$BASE_DIR/content.py" "$OUT_DIR" "$BASE_DIR/content.json" || true

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
