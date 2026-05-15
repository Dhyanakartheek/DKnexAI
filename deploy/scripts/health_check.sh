#!/bin/bash
# ============================================================
# DKnexAI Health Check Script
# Usage: /opt/dknexai/scripts/health_check.sh
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0

check_http() {
    local label=$1
    local url=$2
    local expected=${3:-200}
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 6 "$url" 2>/dev/null)
    if [ "$code" = "$expected" ]; then
        echo -e "  ${GREEN}✓${NC} $label  ${BLUE}→ HTTP $code${NC}"
        ((PASS++))
    else
        echo -e "  ${RED}✗${NC} $label  ${RED}→ HTTP ${code:-TIMEOUT}${NC}"
        ((FAIL++))
    fi
}

check_systemd() {
    local label=$1
    local svc=$2
    local status
    status=$(systemctl is-active "$svc" 2>/dev/null)
    if [ "$status" = "active" ]; then
        local pid
        pid=$(systemctl show -p MainPID --value "$svc")
        echo -e "  ${GREEN}✓${NC} $label  ${BLUE}→ active (pid $pid)${NC}"
        ((PASS++))
    else
        echo -e "  ${RED}✗${NC} $label  ${RED}→ $status${NC}"
        ((FAIL++))
    fi
}

check_port() {
    local label=$1
    local port=$2
    if ss -tlnp | grep -q ":$port "; then
        echo -e "  ${GREEN}✓${NC} $label  ${BLUE}→ :$port listening${NC}"
        ((PASS++))
    else
        echo -e "  ${RED}✗${NC} $label  ${RED}→ :$port NOT listening${NC}"
        ((FAIL++))
    fi
}

echo ""
echo -e "${BOLD}══════════════════════════════════════════════${NC}"
echo -e "${BOLD}  DKnexAI Health Check  —  $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BOLD}══════════════════════════════════════════════${NC}"

echo ""
echo -e "${BOLD}── systemd Services ────────────────────────${NC}"
check_systemd "Agent_chat   [dknex-agent-chat]"   "dknex-agent-chat"
check_systemd "Agent_coding [dknex-agent-coding]" "dknex-agent-coding"
check_systemd "Agent_rag    [dknex-agent-rag]"    "dknex-agent-rag"
check_systemd "Agent_email  [dknex-agent-email]"  "dknex-agent-email"
check_systemd "Backend      [dknex-backend]"       "dknex-backend"
check_systemd "Nginx        [nginx]"               "nginx"
check_systemd "MySQL        [mysql]"               "mysql"

echo ""
echo -e "${BOLD}── Port Listeners ──────────────────────────${NC}"
check_port "Agent_chat"   8000
check_port "Agent_coding" 8001
check_port "Agent_rag"    8002
check_port "Agent_email"  8080
check_port "Backend"      8081
check_port "Nginx"        80
check_port "MySQL"        3306

echo ""
echo -e "${BOLD}── HTTP Endpoints ──────────────────────────${NC}"
check_http "Agent_chat   /health"  "http://127.0.0.1:8000/health"
check_http "Agent_coding /health"  "http://127.0.0.1:8001/health"
check_http "Agent_rag    /"        "http://127.0.0.1:8002/"
check_http "Agent_email  /health"  "http://127.0.0.1:8080/health"
check_http "Backend      /"        "http://127.0.0.1:8081/"
check_http "Nginx        /"        "http://127.0.0.1:80/"

echo ""
echo -e "${BOLD}── System Resources ────────────────────────${NC}"
echo -e "  Disk  : $(df -h /opt/dknexai | awk 'NR==2{print $3" used / "$2" total ("$5" used)"}')"
echo -e "  Mem   : $(free -h | awk '/Mem:/{print $3" used / "$2" total"}')"
echo -e "  Load  : $(uptime | awk -F'load average:' '{print $2}' | xargs)"
echo -e "  Uptime: $(uptime -p)"

echo ""
echo -e "${BOLD}══════════════════════════════════════════════${NC}"
if [ "$FAIL" -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}ALL $PASS CHECKS PASSED ✓${NC}"
else
    echo -e "  ${GREEN}PASSED: $PASS${NC}  ${RED}FAILED: $FAIL${NC}"
fi
echo -e "${BOLD}══════════════════════════════════════════════${NC}"
echo ""

# Exit code useful for monitoring tools
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
