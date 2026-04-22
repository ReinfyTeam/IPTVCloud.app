#!/usr/bin/env bash
set -Eeuo pipefail

trap 'echo "❌ Error line $LINENO: $BASH_COMMAND" >&2' ERR

# ════════════════════════════════════════════════════════════════
# IPTV-ORG EPG SITE XML GRABBER
# ════════════════════════════════════════════════════════════════

SCRIPT_START=$(date +%s)

# ── Config ──────────────────────────────────────────────────────
REPO_URL="https://github.com/iptv-org/epg"

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="$BASE_DIR/epg"
OUT_DIR="$BASE_DIR/sites"
LOG_DIR="$OUT_DIR/logs"

GENERATE_SCRIPT="$BASE_DIR/content.py"
CONTENT_JSON="$OUT_DIR/content.json"

PROXY_URL="${PROXY_URL:-}"

TIMEOUT="${TIMEOUT:-7000}"
MAX_CONN="${MAX_CONN:-8}"
DELAY="${DELAY:-100}"
MAX_RETRIES="${MAX_RETRIES:-2}"

# auto workers
CPUS=$(command -v nproc >/dev/null && nproc || echo 2)
PARALLEL="${PARALLEL:-$((CPUS*2))}"
(( PARALLEL > 16 )) && PARALLEL=16
(( PARALLEL < 2 )) && PARALLEL=2

# ── Colors ──────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

ts(){ date '+%H:%M:%S'; }

log(){ echo -e "[$(ts)] ${GREEN}✅${NC} $*"; }
warn(){ echo -e "[$(ts)] ${YELLOW}⚠️${NC} $*"; }
err(){ echo -e "[$(ts)] ${RED}❌${NC} $*" >&2; }

fmt_bytes() {
    local b="${1:-0}"
    if (( b > 1073741824 )); then
        awk "BEGIN{printf \"%.2f GB\",$b/1073741824}"
    elif (( b > 1048576 )); then
        awk "BEGIN{printf \"%.2f MB\",$b/1048576}"
    elif (( b > 1024 )); then
        awk "BEGIN{printf \"%.1f KB\",$b/1024}"
    else
        echo "${b} B"
    fi
}

fmt_time() {
    local s="$1"
    printf "%dm%02ds" $((s/60)) $((s%60))
}

mkdir -p "$OUT_DIR" "$LOG_DIR"

# ── Repo ────────────────────────────────────────────────────────
if [[ -d "$WORK_DIR/.git" ]]; then
    log "Updating repo..."
    git -C "$WORK_DIR" fetch --depth 1 origin master >/dev/null 2>&1 || true
    git -C "$WORK_DIR" reset --hard origin/master >/dev/null 2>&1 || true
else
    log "Cloning repo..."
    git clone --depth 1 "$REPO_URL" "$WORK_DIR"
fi

cd "$WORK_DIR"

log "Installing npm deps..."
npm ci --silent

# ── Load online sites ───────────────────────────────────────────
mapfile -t SITES < <(
grep '🟢' SITES.md |
sed -n 's#.*href="sites/\([^"]*\)".*🟢.*#\1#p' |
sort -u
)

TOTAL="${#SITES[@]}"
[[ "$TOTAL" -eq 0 ]] && { err "No sites found"; exit 1; }

log "Sites: $TOTAL"
log "Workers: $PARALLEL"

# ════════════════════════════════════════════════════════════════
# Worker
# ════════════════════════════════════════════════════════════════

WORKER=$(mktemp /tmp/epg_worker_XXXX.sh)

cat > "$WORKER" <<'EOF'
#!/usr/bin/env bash
set +e
trap '' PIPE

site="$1"

start=$(date +%s)

for ((try=1; try<=MAX_RETRIES+1; try++)); do

    npm run grab -- \
      --sites="$site" \
      --output="$OUT_DIR/{site}.xml" \
      --timeout="$TIMEOUT" \
      --maxConnections="$MAX_CONN" \
      --delay="$DELAY" \
      ${PROXY_URL:+--proxy="$PROXY_URL"} \
      >/dev/null 2>&1

    file="$OUT_DIR/$site.xml"

    if [[ -s "$file" ]]; then
        bytes=$(wc -c < "$file")
        progs=$(grep -c '<programme' "$file" 2>/dev/null || echo 0)
        end=$(date +%s)
        sec=$(( end - start ))

        echo "PASS|$site|$bytes|$progs|$sec|$try"
        exit 0
    fi

    sleep $try
done

end=$(date +%s)
sec=$(( end - start ))
echo "FAIL|$site|$sec"
EOF

chmod +x "$WORKER"

# ════════════════════════════════════════════════════════════════
# Input file
# ════════════════════════════════════════════════════════════════

TMP=$(mktemp)
printf "%s\n" "${SITES[@]}" > "$TMP"

# ════════════════════════════════════════════════════════════════
# Run
# ════════════════════════════════════════════════════════════════

PASS=0
FAIL=0
DONE=0
TOTAL_BYTES=0
TOTAL_PROGS=0

SLOW_TMP=$(mktemp)

while IFS='|' read -r T A B C D E; do

    DONE=$((DONE+1))

    case "$T" in

        PASS)
            PASS=$((PASS+1))

            site="$A"
            bytes="$B"
            progs="$C"
            sec="$D"
            tries="$E"

            TOTAL_BYTES=$((TOTAL_BYTES + bytes))
            TOTAL_PROGS=$((TOTAL_PROGS + progs))

            echo "$sec|$site" >> "$SLOW_TMP"

            printf "${GREEN}[OK %d/%d]${NC} %-35s %10s %7s progs %6ss" \
                "$DONE" "$TOTAL" "$site" "$(fmt_bytes "$bytes")" "$progs" "$sec"

            (( tries > 1 )) && printf " ${YELLOW}(tries:%s)${NC}" "$tries"

            echo
            ;;

        FAIL)
            FAIL=$((FAIL+1))

            site="$A"
            sec="$B"

            echo "$sec|$site" >> "$SLOW_TMP"

            printf "${RED}[FAIL %d/%d]${NC} %-35s after %ss\n" \
                "$DONE" "$TOTAL" "$site" "$sec"
            ;;

    esac

done < <(
xargs -d '\n' -n1 -P "$PARALLEL" \
env \
OUT_DIR="$OUT_DIR" \
TIMEOUT="$TIMEOUT" \
MAX_CONN="$MAX_CONN" \
DELAY="$DELAY" \
MAX_RETRIES="$MAX_RETRIES" \
PROXY_URL="$PROXY_URL" \
bash "$WORKER" < "$TMP"
)

# ════════════════════════════════════════════════════════════════
# Generate content.json
# ════════════════════════════════════════════════════════════════

echo
log "Generating content.json..."
python3 "$GENERATE_SCRIPT" "$OUT_DIR" "$CONTENT_JSON"

# ════════════════════════════════════════════════════════════════
# Summary
# ════════════════════════════════════════════════════════════════

TOTAL_TIME=$(( $(date +%s) - SCRIPT_START ))

echo
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
printf "Passed      : %d / %d\n" "$PASS" "$TOTAL"
printf "Failed      : %d\n" "$FAIL"
printf "Downloaded  : %s\n" "$(fmt_bytes "$TOTAL_BYTES")"
printf "Programmes  : %d\n" "$TOTAL_PROGS"
printf "Workers     : %d\n" "$PARALLEL"
printf "Elapsed     : %s\n" "$(fmt_time "$TOTAL_TIME")"
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"

echo
echo -e "${CYAN}Top 10 Slowest Sites${NC}"
sort -rn "$SLOW_TMP" | head -10 | while IFS='|' read -r sec site; do
    printf "  %-35s %ss\n" "$site" "$sec"
done

rm -f "$TMP" "$WORKER" "$SLOW_TMP"
