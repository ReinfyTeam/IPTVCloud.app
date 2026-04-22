#!/usr/bin/env bash
set -Eeuo pipefail

trap 'echo "❌ Error line $LINENO: $BASH_COMMAND" >&2' ERR

# ════════════════════════════════════════════════════════════════
# IPTV-ORG EPG FAST MULTI-SITE XML GRABBER
# ════════════════════════════════════════════════════════════════

SCRIPT_START_TIME=$(date +%s)

# ── Config ──────────────────────────────────────────────────────
REPO_URL="https://github.com/iptv-org/epg"

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" 
WORK_DIR="$BASE_DIR/epg"
OUTPUT_DIR="$BASE_DIR/sites"
LOG_DIR="$OUTPUT_DIR/logs"

GENERATE_SCRIPT="$BASE_DIR/content.py"
CONTENT_JSON="$OUTPUT_DIR/content.json"
SITES_MD="$WORK_DIR/SITES.md"

PROXY_URL="${PROXY_URL:-}"

DELAY="${DELAY:-0}"
TIMEOUT="${TIMEOUT:-15000}"
MAX_CONN="${MAX_CONN:-50}"
MIN_CONN="${MIN_CONN:-1}"
MAX_RETRIES="${MAX_RETRIES:-3}"
RETRY_BACKOFF_BASE="${RETRY_BACKOFF_BASE:-2}"
BATCH_SIZE="${BATCH_SIZE:-10}"

# ── Dynamic workers ─────────────────────────────────────────────
detect_workers() {
    local cpus mem_gb w
    cpus=$(command -v nproc >/dev/null && nproc || echo 2)
    mem_gb=$(awk '/MemTotal/{printf "%d",$2/1024/1024}' /proc/meminfo 2>/dev/null || echo 4)

    ((cpus < 1)) && cpus=1
    ((mem_gb < 1)) && mem_gb=1

    w=$(( cpus * 3 ))
    (( w > 32 )) && w=32
    (( w < 1 )) && w=1

    echo "$w"
}

PARALLEL="${PARALLEL:-$(detect_workers)}"

# ── Colors ──────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

ts() { date '+%H:%M:%S'; }

log()  { echo -e "[$(ts)] ${GREEN}✅${NC} $*"; }
warn() { echo -e "[$(ts)] ${YELLOW}⚠️${NC} $*"; }
err()  { echo -e "[$(ts)] ${RED}❌${NC} $*" >&2; }

elapsed_since() {
    local s=$(( $(date +%s) - $1 ))
    printf "%dm%02ds" $((s/60)) $((s%60))
}

format_bytes() {
    local b="${1:-0}"

    if (( b >= 1073741824 )); then
        awk "BEGIN{printf \"%.2f GB\",$b/1073741824}"
    elif (( b >= 1048576 )); then
        awk "BEGIN{printf \"%.2f MB\",$b/1048576}"
    elif (( b >= 1024 )); then
        awk "BEGIN{printf \"%.1f KB\",$b/1024}"
    else
        echo "${b} B"
    fi
}

# ── Cleanup ─────────────────────────────────────────────────────
WORKER_SCRIPT=""
cleanup() {
    [[ -n "$WORKER_SCRIPT" && -f "$WORKER_SCRIPT" ]] && rm -f "$WORKER_SCRIPT"
}
trap cleanup EXIT

mkdir -p "$OUTPUT_DIR" "$LOG_DIR"

# ── Dependency check ────────────────────────────────────────────
for cmd in git npm python3 grep sed sort wc xargs awk; do
    command -v "$cmd" >/dev/null || { err "Missing dependency: $cmd"; exit 1; }
done

# ── Clone repo ──────────────────────────────────────────────────
if [[ -d "$WORK_DIR/.git" ]]; then
    log "Updating repo..."
    git -C "$WORK_DIR" fetch --depth 1 origin master >/dev/null 2>&1 || true
    git -C "$WORK_DIR" reset --hard origin/master >/dev/null 2>&1 || true
else
    log "Cloning iptv-org/epg..."
    git clone --depth 1 "$REPO_URL" "$WORK_DIR"
fi

cd "$WORK_DIR"

log "Installing npm packages..."
npm ci --silent

# ── Load online sites ───────────────────────────────────────────
log "Reading online providers..."

mapfile -t ONLINE_SITES < <(
grep '🟢' "$SITES_MD" |
sed -n 's#.*href="sites/\([^"]*\)".*🟢.*#\1#p' |
sort -u
)

SITES=()
for s in "${ONLINE_SITES[@]}"; do
    [[ -d "$WORK_DIR/sites/$s" ]] && SITES+=("$s")
done

TOTAL="${#SITES[@]}"
[[ "$TOTAL" -eq 0 ]] && { err "No sites found"; exit 1; }

BATCH_COUNT=$(( (TOTAL + BATCH_SIZE - 1) / BATCH_SIZE ))

log "Found $TOTAL sites"

# ════════════════════════════════════════════════════════════════
# Worker Script
# ════════════════════════════════════════════════════════════════

WORKER_SCRIPT=$(mktemp /tmp/epg_worker_XXXX.sh)

cat > "$WORKER_SCRIPT" <<'EOF'
#!/usr/bin/env bash
set +e
trap '' PIPE

WORK_DIR="$WORK_DIR"
OUTPUT_DIR="$OUTPUT_DIR"

for site in "$@"; do
    start=$(date +%s)

    npm run grab -- \
        --sites="$site" \
        --output="$OUTPUT_DIR/{site}.xml" \
        --delay="$DELAY" \
        --timeout="$TIMEOUT" \
        --maxConnections="$MAX_CONN" \
        ${PROXY_URL:+--proxy="$PROXY_URL"} \
        >/dev/null 2>&1

    file="$OUTPUT_DIR/$site.xml"

    if [[ -s "$file" ]]; then
        bytes=$(wc -c < "$file")
        progs=$(grep -c '<programme' "$file" 2>/dev/null || echo 0)
        end=$(date +%s)
        sec=$(( end - start ))
        echo "PASS|$site|$bytes|$progs|$sec"
    else
        echo "FAIL|$site|ERROR"
    fi
done
EOF

chmod +x "$WORKER_SCRIPT"

# ════════════════════════════════════════════════════════════════
# Batch file
# ════════════════════════════════════════════════════════════════

BATCH_ARG_FILE=$(mktemp)

for site in "${SITES[@]}"; do
    echo "$site" >> "$BATCH_ARG_FILE"
done

# ════════════════════════════════════════════════════════════════
# Aggregator
# ════════════════════════════════════════════════════════════════

PASS=0
FAIL=0
TOTAL_BYTES=0
TOTAL_PROGS=0

while IFS='|' read -r TOKEN F1 F2 F3 F4; do
    case "$TOKEN" in

        PASS)
            PASS=$((PASS+1))

            site="$F1"
            bytes="${F2:-0}"
            progs="${F3:-0}"
            sec="${F4:-0}"

            TOTAL_BYTES=$((TOTAL_BYTES + bytes))
            TOTAL_PROGS=$((TOTAL_PROGS + progs))

            printf "${GREEN}[OK %d/%d]${NC} %-35s %10s %8s progs %ss\n" \
                "$PASS" "$TOTAL" "$site" "$(format_bytes "$bytes")" "$progs" "$sec"
            ;;

        FAIL)
            FAIL=$((FAIL+1))

            site="$F1"
            reason="${F2:-ERROR}"

            printf "${RED}[FAIL %d/%d]${NC} %-35s %s\n" \
                "$((PASS+FAIL))" "$TOTAL" "$site" "$reason"
            ;;

    esac
done < <(
xargs -d '\n' -n1 -P "$PARALLEL" \
env \
WORK_DIR="$WORK_DIR" \
OUTPUT_DIR="$OUTPUT_DIR" \
DELAY="$DELAY" \
TIMEOUT="$TIMEOUT" \
MAX_CONN="$MAX_CONN" \
PROXY_URL="$PROXY_URL" \
bash "$WORKER_SCRIPT" < "$BATCH_ARG_FILE"
)

# ── Generate JSON ───────────────────────────────────────────────
echo
log "Generating content.json..."
python3 "$GENERATE_SCRIPT" "$OUTPUT_DIR" "$CONTENT_JSON"

TOTAL_ELAPSED=$(elapsed_since "$SCRIPT_START_TIME")

# ── Summary ─────────────────────────────────────────────────────
echo
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
printf "Passed      : %d / %d\n" "$PASS" "$TOTAL"
printf "Failed      : %d\n" "$FAIL"
printf "Downloaded  : %s\n" "$(format_bytes "$TOTAL_BYTES")"
printf "Programmes  : %d\n" "$TOTAL_PROGS"
printf "Workers     : %d\n" "$PARALLEL"
printf "Elapsed     : %s\n" "$TOTAL_ELAPSED"
printf "Output      : %s\n" "$OUTPUT_DIR"
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
