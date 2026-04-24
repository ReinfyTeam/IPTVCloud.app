#!/usr/bin/env bash
set -Eeuo pipefail

# ════════════════════════════════════════════════════════════════
# IPTV-ORG EPG TV XML SCRAPER — parallel grabber with retries
# ════════════════════════════════════════════════════════════════
#
# Per-site logs:        ./logs/<site>.log    (with summary header)
# One worker per site:  prevents slow sites from stalling fast ones
# Retries:              up to MAX_RETRIES on FAIL/TIMEOUT/EMPTY
# Empty sites:          XML + dir removed, never written to ./sites
# Clean shutdown:       Ctrl+C kills every child (npm, tsx, node)
#
# Tunables (env vars):
#   PARALLEL          outer site workers              (default: 12)
#   MAX_CONNECTIONS   in-site concurrent channel pool (default: 5)
#   DELAY             ms between requests             (default: 250)
#   SITE_TIMEOUT      per-attempt wall budget (s)     (default: 1200)
#   GRAB_TIMEOUT      per-channel HTTP timeout (ms)   (default: 30000)
#   DAYS              days of EPG to grab             (default: 2)
#   MIN_PROGRAMMES    min progs to count as PASS      (default: 1)
#   MAX_RETRIES       attempts per site               (default: 10)
#   RETRY_DELAY       seconds between retries         (default: 5)
#   GZIP              also write .xml.gz beside .xml  (default: 0)
#   REPO_URL          iptv-org/epg fork to use
# ════════════════════════════════════════════════════════════════

START_TS=$(date +%s)

REPO_URL="${REPO_URL:-https://github.com/iptv-org/epg}"
BASE_DIR="$(pwd)"
WORK_DIR="$BASE_DIR/epg"
OUT_DIR="$BASE_DIR/sites"
LOG_DIR="$BASE_DIR/logs"

PARALLEL="${PARALLEL:-12}"
MAX_CONNECTIONS="${MAX_CONNECTIONS:-5}"
DELAY="${DELAY:-250}"
SITE_TIMEOUT="${SITE_TIMEOUT:-1200}"
GRAB_TIMEOUT="${GRAB_TIMEOUT:-30000}"
DAYS="${DAYS:-2}"
MIN_PROGRAMMES="${MIN_PROGRAMMES:-1}"
MAX_RETRIES="${MAX_RETRIES:-10}"
RETRY_DELAY="${RETRY_DELAY:-5}"
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

# ── ROBUST PROCESS-GROUP CLEANUP ────────────────────────────────
# We launch xargs (and every npm/tsx/node it spawns) in a new
# session via `setsid`, so they all share one process-group ID.
# A single `kill -- -PGID` then takes them all down at once,
# regardless of how many bash/timeout/npm/sh/node levels are
# in between, or whether intermediate parents have already died
# (orphaned grandchildren keep the group, not the parent link).
CLEANUP_DONE=0
TMP=""
WORKER=""
FIFO=""
XARGS_PGID=""
cleanup() {
    [[ "$CLEANUP_DONE" == "1" ]] && return
    CLEANUP_DONE=1

    if [[ -n "$XARGS_PGID" ]] && kill -0 "-$XARGS_PGID" 2>/dev/null; then
        printf "\n[%s] %b⏹%b  shutdown — terminating workers...\n" \
            "$(date +%H:%M:%S)" "$YELLOW" "$NC"
        kill -TERM -- "-$XARGS_PGID" 2>/dev/null || true
        # Give Node/npm a brief moment to exit cleanly, then SIGKILL
        for _ in 1 2 3 4 5 6; do
            sleep 0.5
            kill -0 -- "-$XARGS_PGID" 2>/dev/null || break
        done
        kill -KILL -- "-$XARGS_PGID" 2>/dev/null || true
    fi

    [[ -n "$TMP"    && -f "$TMP"    ]] && rm -f "$TMP"
    [[ -n "$WORKER" && -f "$WORKER" ]] && rm -f "$WORKER"
    [[ -n "$FIFO"   && -p "$FIFO"   ]] && rm -f "$FIFO"
}
trap cleanup EXIT
trap 'cleanup; exit 130' INT TERM HUP

mkdir -p "$OUT_DIR" "$LOG_DIR"

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
log "Per-attempt cap  : ${SITE_TIMEOUT}s"
log "Retries / site   : up to $MAX_RETRIES"
log "Days of guide    : $DAYS"
log "Min programmes   : $MIN_PROGRAMMES"
log "Logs directory   : $LOG_DIR"
[[ "$GZIP" == "1" ]] && log "Gzip outputs     : enabled"

TMP=$(mktemp)
printf "%s\n" "${SITES[@]}" > "$TMP"

# ── WORKER ──────────────────────────────────────────────────────
WORKER=$(mktemp)
cat > "$WORKER" <<'EOF'
#!/usr/bin/env bash
set -Eeo pipefail

SITE="$1"
ROOT="$2"
SITE_TIMEOUT="$3"
GRAB_TIMEOUT="$4"
MAX_CONNECTIONS="$5"
DAYS="$6"
DELAY="$7"
MIN_PROGRAMMES="$8"
GZIP_FLAG="$9"
MAX_RETRIES="${10}"
RETRY_DELAY="${11}"

# Forward signals to grab subprocess so Ctrl+C kills it cleanly.
NPM_PID=""
worker_term() {
    [[ -n "$NPM_PID" ]] && kill -TERM "$NPM_PID" 2>/dev/null || true
    exit 130
}
trap worker_term INT TERM HUP

LOG_FILE="$ROOT/logs/$SITE.log"
OUT_FILE="$ROOT/sites/$SITE/$SITE.xml"
SITE_DIR="$ROOT/sites/$SITE"
RAW_LOG=$(mktemp)
ATTEMPT_LOG=$(mktemp)

cleanup_worker() {
    rm -f "$RAW_LOG" "$ATTEMPT_LOG" 2>/dev/null || true
}
trap cleanup_worker EXIT

mkdir -p "$SITE_DIR"
cd "$ROOT/epg"

EXTRA_ARGS=()
[[ "$GZIP_FLAG" == "1" ]] && EXTRA_ARGS+=("--gzip")

# ── analyse a raw npm log and emit a summary block ──────────────
write_summary() {
    local site="$1" status="$2" attempts="$3" total_elapsed="$4"
    local outfile="$5" raw="$6" dest="$7"

    # NOTE: every $(pipeline) below ends with `|| true` because
    # `set -o pipefail` would otherwise kill the worker the first
    # time grep finds zero matches (grep -c exits 1 in that case).
    local channels with_data empty_chans progs bytes
    channels=$(grep -cE '^[[:space:]]*ℹ[[:space:]]+\[[0-9]+/[0-9]+\]' "$raw" 2>/dev/null || true)
    with_data=$(grep -cE '\([1-9][0-9]*[[:space:]]programs\)' "$raw" 2>/dev/null || true)
    empty_chans=$(grep -cE '\(0[[:space:]]programs\)' "$raw" 2>/dev/null || true)
    channels=${channels:-0}
    with_data=${with_data:-0}
    empty_chans=${empty_chans:-0}

    progs=0
    bytes=0
    if [[ -s "$outfile" ]]; then
        progs=$(awk 'BEGIN{c=0} /<programme/{c++} END{print c}' "$outfile" 2>/dev/null || echo 0)
        bytes=$(wc -c < "$outfile" 2>/dev/null || echo 0)
        bytes=$(echo "$bytes" | tr -d ' ')
    fi
    [[ "$progs" =~ ^[0-9]+$ ]] || progs=0
    [[ "$bytes" =~ ^[0-9]+$ ]] || bytes=0

    local err_breakdown
    err_breakdown=$( { grep -oE 'status code [0-9]+' "$raw" 2>/dev/null \
                       | sort | uniq -c | sort -rn | head -8; } || true )

    local other_errors
    other_errors=$( { grep -E 'ERR:' "$raw" 2>/dev/null \
                      | grep -vE 'status code [0-9]+' \
                      | sed -E 's/^[[:space:]]*ℹ[[:space:]]+ERR:[[:space:]]*//' \
                      | sort | uniq -c | sort -rn | head -5; } || true )

    local last_err
    last_err=$( { grep -E 'ERR:' "$raw" 2>/dev/null | tail -1 \
                  | sed -E 's/^[[:space:]]*ℹ[[:space:]]+ERR:[[:space:]]*//'; } || true )

    {
        echo "═══════════════════════════════════════════════════════════════"
        echo "  Site            : $site"
        echo "  Status          : $status"
        echo "  Attempts used   : $attempts / $MAX_RETRIES"
        echo "  Total elapsed   : ${total_elapsed}s"
        echo "  Channels        : $channels"
        echo "  With programmes : $with_data"
        echo "  Empty channels  : $empty_chans"
        echo "  Total programs  : $progs"
        echo "  Output size     : $bytes bytes"
        if [[ -n "$err_breakdown" ]]; then
            echo "  HTTP errors     :"
            echo "$err_breakdown" | sed 's/^[[:space:]]*/    /'
        fi
        if [[ -n "$other_errors" ]]; then
            echo "  Other errors    :"
            echo "$other_errors" | sed 's/^[[:space:]]*/    /'
        fi
        if [[ -n "$last_err" ]]; then
            echo "  Last error      : $last_err"
        fi
        echo "  Generated       : $(date '+%Y-%m-%d %H:%M:%S')"
        echo "═══════════════════════════════════════════════════════════════"
        echo
        echo "----- raw npm grab output (last attempt) -----"
        echo
        cat "$raw"
    } > "$dest"
}

# ── retry loop ──────────────────────────────────────────────────
WALL_START=$(date +%s)
ATTEMPT=0
FINAL_STATUS="FAIL"
LAST_RC=0

while [[ $ATTEMPT -lt $MAX_RETRIES ]]; do
    ATTEMPT=$(( ATTEMPT + 1 ))
    : > "$ATTEMPT_LOG"

    {
        echo
        echo "===== attempt $ATTEMPT/$MAX_RETRIES @ $(date '+%H:%M:%S') ====="
    } >> "$RAW_LOG"

    set +e
    timeout --kill-after=30 "$SITE_TIMEOUT" \
        npm run grab -- \
            --sites="$SITE" \
            --output="$ROOT/sites/{site}/{site}.xml" \
            --timeout="$GRAB_TIMEOUT" \
            --maxConnections="$MAX_CONNECTIONS" \
            --delay="$DELAY" \
            --days="$DAYS" \
            "${EXTRA_ARGS[@]}" \
            >> "$ATTEMPT_LOG" 2>&1 &
    NPM_PID=$!
    wait "$NPM_PID"
    LAST_RC=$?
    NPM_PID=""
    set -e

    cat "$ATTEMPT_LOG" >> "$RAW_LOG"

    # Did this attempt produce a usable file?
    if [[ -s "$OUT_FILE" ]]; then
        PROGS=$(awk 'BEGIN{c=0} /<programme/{c++} END{print c}' "$OUT_FILE" 2>/dev/null || echo 0)
        [[ "$PROGS" =~ ^[0-9]+$ ]] || PROGS=0
        if [[ "$PROGS" -ge "$MIN_PROGRAMMES" ]]; then
            FINAL_STATUS="PASS"
            break
        fi
    fi

    # Not a pass — clean up before next try
    rm -f "$OUT_FILE"

    if [[ $ATTEMPT -lt $MAX_RETRIES ]]; then
        sleep "$RETRY_DELAY"
    fi
done

WALL_END=$(date +%s)
ELAPSED=$(( WALL_END - WALL_START ))

# Determine final status if not already PASS
if [[ "$FINAL_STATUS" != "PASS" ]]; then
    if [[ $LAST_RC -eq 124 || $LAST_RC -eq 137 ]]; then
        FINAL_STATUS="TIMEOUT"
    elif grep -q '<programme' "$RAW_LOG" 2>/dev/null \
         || grep -qE '\([0-9]+ programs\)' "$RAW_LOG" 2>/dev/null; then
        FINAL_STATUS="EMPTY"
    else
        FINAL_STATUS="FAIL"
    fi
fi

# Sites with no usable XML must not pollute ./sites/
if [[ "$FINAL_STATUS" != "PASS" ]]; then
    rm -f "$SITE_DIR"/*.xml "$SITE_DIR"/*.xml.gz 2>/dev/null || true
    rmdir "$SITE_DIR" 2>/dev/null || true
fi

write_summary "$SITE" "$FINAL_STATUS" "$ATTEMPT" "$ELAPSED" \
              "$OUT_FILE" "$RAW_LOG" "$LOG_FILE"

case "$FINAL_STATUS" in
    PASS)
        BYTES=$(wc -c < "$OUT_FILE" 2>/dev/null || echo 0)
        BYTES=$(echo "$BYTES" | tr -d ' ')
        PROGS=$(awk 'BEGIN{c=0} /<programme/{c++} END{print c}' "$OUT_FILE" 2>/dev/null || echo 0)
        [[ "$BYTES" =~ ^[0-9]+$ ]] || BYTES=0
        [[ "$PROGS" =~ ^[0-9]+$ ]] || PROGS=0
        echo "PASS|$SITE|$BYTES|$PROGS|$ELAPSED|$ATTEMPT"
        ;;
    *)
        echo "$FINAL_STATUS|$SITE|$ELAPSED|$ATTEMPT"
        ;;
esac
EOF
chmod +x "$WORKER"

# ── DRIVE WORKERS ───────────────────────────────────────────────
DONE=0
PASS=0
EMPTY=0
TIMEOUT=0
FAIL=0
declare -A FINISHED

# ── LAUNCH WORKER POOL IN ITS OWN PROCESS GROUP ────────────────
FIFO=$(mktemp -u)
mkfifo "$FIFO"
setsid bash -c "
    xargs -d '\n' -n1 -P '$PAR' -I{} \
        bash '$WORKER' '{}' '$BASE_DIR' '$SITE_TIMEOUT' '$GRAB_TIMEOUT' \
                       '$MAX_CONNECTIONS' '$DAYS' '$DELAY' \
                       '$MIN_PROGRAMMES' '$GZIP' \
                       '$MAX_RETRIES' '$RETRY_DELAY' \
        < '$TMP' > '$FIFO'
" &
XARGS_PGID=$!

while IFS='|' read -r TYPE A B C D E; do
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
            ATT=$(fnum "$E")
            printf "${GREEN}[OK %d/%d]${NC} %-35s %10s %8s progs %5ds  (try %s)\n" \
                "$DONE" "$TOTAL" "$SITE" "$SIZE" "$P" "$T" "$ATT"
            ;;
        EMPTY)
            EMPTY=$(( EMPTY + 1 ))
            T=$(fnum "$B")
            ATT=$(fnum "$C")
            printf "${YELLOW}[EMPTY %d/%d]${NC} %-35s no programmes after %ds  (tried %s)\n" \
                "$DONE" "$TOTAL" "$SITE" "$T" "$ATT"
            ;;
        TIMEOUT)
            TIMEOUT=$(( TIMEOUT + 1 ))
            T=$(fnum "$B")
            ATT=$(fnum "$C")
            printf "${YELLOW}[TIMEOUT %d/%d]${NC} %-35s after %ds  (tried %s)\n" \
                "$DONE" "$TOTAL" "$SITE" "$T" "$ATT"
            ;;
        FAIL)
            FAIL=$(( FAIL + 1 ))
            T=$(fnum "$B")
            ATT=$(fnum "$C")
            printf "${RED}[FAIL %d/%d]${NC} %-35s after %ds  (tried %s)\n" \
                "$DONE" "$TOTAL" "$SITE" "$T" "$ATT"
            ;;
    esac
done < "$FIFO"

# Wait for the worker pool to finish (or be killed by cleanup).
wait "$XARGS_PGID" 2>/dev/null || true
rm -f "$FIFO"
XARGS_PGID=""

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
echo -e "${YELLOW}Timeout :${NC} $TIMEOUT"
echo -e "${RED}Failed  :${NC} $FAIL"
echo -e "${CYAN}Total   :${NC} $TOTAL"
echo -e "${YELLOW}Time    :${NC} ${TOTAL_TIME}s"
echo "Output  : $OUT_DIR"
echo "Logs    : $LOG_DIR"
echo "═══════════════════════════════════════"
