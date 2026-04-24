#!/usr/bin/env bash
set -Eeuo pipefail

# ════════════════════════════════════════════════════════════════
# IPTV-ORG EPG TV XML SCRAPER — parallel grabber
# ════════════════════════════════════════════════════════════════
#
# Why one-site-per-worker (not batched):
#   • Some sites have 1000+ channels (plex.tv, samsung-tvplus.com, ...)
#     mixed with sites that have 1-2 channels. Batching them together
#     makes the slow site eat the whole batch budget and time out.
#   • Per-site granularity also lets us mark a site PASS/FAIL/TIMEOUT
#     accurately and not lose work when one site in a group misbehaves.
#
# Why moderate concurrency:
#   • External EPG endpoints aggressively rate-limit (HTTP 429) when
#     hit too fast. Empirically MAX_CONNECTIONS=5 per worker + a small
#     DELAY keeps almost every site under the throttle threshold.
#
# Tunables (env vars, override on the command line):
#   PARALLEL          outer site workers              (default: 12)
#   MAX_CONNECTIONS   in-site concurrent channel pool (default: 5)
#   DELAY             ms between requests             (default: 250)
#   SITE_TIMEOUT      per-site wall budget (s)        (default: 1200)
#   GRAB_TIMEOUT      per-channel HTTP timeout (ms)   (default: 30000)
#   DAYS              days of EPG to grab             (default: 2)
#   MIN_PROGRAMMES    min progs to count site as PASS (default: 1)
#   GZIP              also write .xml.gz beside .xml  (default: 0)
#   REPO_URL          iptv-org/epg fork to use
# ════════════════════════════════════════════════════════════════

START_TS=$(date +%s)

REPO_URL="${REPO_URL:-https://github.com/iptv-org/epg}"
BASE_DIR="$(pwd)"
WORK_DIR="$BASE_DIR/epg"
OUT_DIR="$BASE_DIR/sites"

PARALLEL="${PARALLEL:-12}"
MAX_CONNECTIONS="${MAX_CONNECTIONS:-5}"
DELAY="${DELAY:-250}"
SITE_TIMEOUT="${SITE_TIMEOUT:-1200}"
GRAB_TIMEOUT="${GRAB_TIMEOUT:-30000}"
DAYS="${DAYS:-2}"
MIN_PROGRAMMES="${MIN_PROGRAMMES:-1}"
GZIP="${GZIP:-0}"

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

fnum() {
    local n="${1:-}"
    [[ "$n" =~ ^[0-9]+$ ]] && echo "$n" || echo 0
}

TMP=""
WORKER=""
cleanup() {
    [[ -n "$TMP" && -f "$TMP" ]] && rm -f "$TMP"
    [[ -n "$WORKER" && -f "$WORKER" ]] && rm -f "$WORKER"
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

PAR=$PARALLEL
[[ $PAR -gt $TOTAL ]] && PAR=$TOTAL

log "Sites detected   : $TOTAL"
log "Outer workers    : $PAR   (PARALLEL=$PARALLEL)"
log "Inner channels   : $MAX_CONNECTIONS concurrent / site"
log "Per-channel HTTP : ${GRAB_TIMEOUT}ms   (delay ${DELAY}ms)"
log "Per-site budget  : ${SITE_TIMEOUT}s"
log "Days of guide    : $DAYS"
log "Min programmes   : $MIN_PROGRAMMES"
[[ "$GZIP" == "1" ]] && log "Gzip outputs     : enabled"

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
MAX_CONNECTIONS="$5"
DAYS="$6"
DELAY="$7"
MIN_PROGRAMMES="$8"
GZIP_FLAG="$9"

START=$(date +%s)
mkdir -p "$ROOT/sites/$SITE"
cd "$ROOT/epg"

OUT_FILE="$ROOT/sites/$SITE/$SITE.xml"
LOG=$(mktemp)
RC=0

EXTRA_ARGS=()
[[ "$GZIP_FLAG" == "1" ]] && EXTRA_ARGS+=("--gzip")

timeout --kill-after=30 "$TIMEOUT" \
    npm run grab -- \
        --sites="$SITE" \
        --output="$ROOT/sites/{site}/{site}.xml" \
        --timeout="$GRAB_TIMEOUT" \
        --maxConnections="$MAX_CONNECTIONS" \
        --delay="$DELAY" \
        --days="$DAYS" \
        "${EXTRA_ARGS[@]}" \
        > "$LOG" 2>&1 \
    || RC=$?
rm -f "$LOG"

NOW=$(date +%s)
ELAPSED=$(( NOW - START ))
[[ -z "$ELAPSED" || ! "$ELAPSED" =~ ^[0-9]+$ ]] && ELAPSED=0

if [[ -s "$OUT_FILE" ]]; then
    BYTES=$(wc -c < "$OUT_FILE" 2>/dev/null | tr -d ' ')
    [[ -z "$BYTES" || ! "$BYTES" =~ ^[0-9]+$ ]] && BYTES=0
    PROGS=$(awk 'BEGIN{c=0} /<programme/{c++} END{print c}' "$OUT_FILE" 2>/dev/null)
    [[ -z "$PROGS" || ! "$PROGS" =~ ^[0-9]+$ ]] && PROGS=0

    if [[ "$PROGS" -ge "$MIN_PROGRAMMES" ]]; then
        echo "PASS|$SITE|$BYTES|$PROGS|$ELAPSED"
    else
        # XML written but empty -> almost always rate-limited / blocked.
        rm -f "$OUT_FILE"
        echo "EMPTY|$SITE|$ELAPSED"
    fi
else
    rm -f "$OUT_FILE"
    if [[ $RC -eq 124 || $RC -eq 137 ]]; then
        echo "TIMEOUT|$SITE|$ELAPSED"
    else
        echo "FAIL|$SITE|$ELAPSED"
    fi
fi
EOF
chmod +x "$WORKER"

# ── DRIVE WORKERS ───────────────────────────────────────────────
DONE=0
PASS=0
EMPTY=0
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
            SIZE=$(fbytes "$(fnum "$B")")
            P=$(fnum "$C")
            T=$(fnum "$D")
            printf "${GREEN}[OK %d/%d]${NC} %-35s %10s %8s progs %5ds\n" \
                "$DONE" "$TOTAL" "$SITE" "$SIZE" "$P" "$T"
            ;;
        EMPTY)
            EMPTY=$(( EMPTY + 1 ))
            T=$(fnum "$B")
            printf "${YELLOW}[EMPTY %d/%d]${NC} %-35s no programmes after %ds (rate-limited?)\n" \
                "$DONE" "$TOTAL" "$SITE" "$T"
            ;;
        FAIL)
            FAIL=$(( FAIL + 1 ))
            T=$(fnum "$B")
            printf "${RED}[FAIL %d/%d]${NC} %-35s after %ds\n" \
                "$DONE" "$TOTAL" "$SITE" "$T"
            ;;
        TIMEOUT)
            FAIL=$(( FAIL + 1 ))
            T=$(fnum "$B")
            printf "${YELLOW}[TIMEOUT %d/%d]${NC} %-35s after %ds\n" \
                "$DONE" "$TOTAL" "$SITE" "$T"
            ;;
    esac
done < <(
    xargs -d '\n' -n1 -P "$PAR" -I{} \
        bash "$WORKER" "{}" "$BASE_DIR" "$SITE_TIMEOUT" "$GRAB_TIMEOUT" \
                       "$MAX_CONNECTIONS" "$DAYS" "$DELAY" \
                       "$MIN_PROGRAMMES" "$GZIP" \
        < "$TMP"
)

# ── POST-PROCESS ────────────────────────────────────────────────
if [[ $PASS -gt 0 ]]; then
    log "Pretty-printing XMLTV files..."
    python3 "$BASE_DIR/xml_prettier.py" "$OUT_DIR" || true

    log "Splitting oversized XMLTV files (>1 MB)..."
    python3 "$BASE_DIR/split_xml.py" "$OUT_DIR" || true

    log "Regenerating content.json index..."
    python3 "$BASE_DIR/content.py" "$OUT_DIR" "$BASE_DIR/content.json" || true
else
    log "No successful grabs — skipping post-processing."
fi

# ── SUMMARY ─────────────────────────────────────────────────────
TOTAL_TIME=$(( $(date +%s) - START_TS ))
echo
echo "═══════════════════════════════════════"
echo -e "${GREEN}Passed  :${NC} $PASS"
echo -e "${YELLOW}Empty   :${NC} $EMPTY"
echo -e "${RED}Failed  :${NC} $FAIL"
echo -e "${CYAN}Total   :${NC} $TOTAL"
echo -e "${YELLOW}Time    :${NC} ${TOTAL_TIME}s"
echo "Output  : $OUT_DIR"
echo "═══════════════════════════════════════"
