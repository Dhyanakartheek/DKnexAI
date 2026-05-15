#!/bin/bash
# ============================================================
# DKnexAI — Master EC2 Deployment Script
# Run as: ubuntu user on a fresh Ubuntu 22.04 EC2 instance
# Usage:  bash /opt/dknexai/deploy/scripts/deploy.sh
#
# BEFORE RUNNING:
#   1. Upload project to /opt/dknexai  (git clone or scp)
#   2. Edit /opt/dknexai/.env with real API keys + DB password
#   3. Edit FRONTEND/src/app/services/agent.service.ts:
#      BASE_URL = 'https://yourdomain.com/api'
# ============================================================

set -e   # Exit on any error
set -u   # Treat unset vars as errors

# ── Colours ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
step() { echo -e "\n${BOLD}${BLUE}━━━ $* ━━━${NC}\n"; }

APP_DIR="/opt/dknexai"
VENV="$APP_DIR/venv"
LOG_BASE="$APP_DIR/logs"

# ─────────────────────────────────────────────────────────────
step "STEP 1 — System Update & Dependencies"
# ─────────────────────────────────────────────────────────────
sudo apt-get update -qq
sudo apt-get upgrade -y -qq
sudo apt-get install -y -qq \
    curl wget git unzip software-properties-common \
    build-essential libssl-dev libffi-dev python3-dev \
    python3.11 python3.11-venv python3.11-dev \
    openjdk-17-jdk maven \
    mysql-server \
    nginx \
    certbot python3-certbot-nginx \
    ufw

# Node.js 20
if ! command -v node &>/dev/null; then
    log "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - -qq
    sudo apt-get install -y -qq nodejs
fi

log "Versions:"
python3.11 --version
java -version 2>&1 | head -1
node --version
mvn --version | head -1

# ─────────────────────────────────────────────────────────────
step "STEP 2 — Folder Structure & Permissions"
# ─────────────────────────────────────────────────────────────
sudo mkdir -p /opt/dknexai
sudo chown -R ubuntu:ubuntu /opt/dknexai

mkdir -p "$LOG_BASE"/{chat,coding,rag,email,backend}
mkdir -p "$APP_DIR/scripts"
chmod +x "$APP_DIR/deploy/scripts/"*.sh 2>/dev/null || true

log "Log directories created."

# ─────────────────────────────────────────────────────────────
step "STEP 3 — MySQL Setup"
# ─────────────────────────────────────────────────────────────
sudo systemctl enable mysql
sudo systemctl start mysql

# Source .env to get DB credentials
if [ -f "$APP_DIR/.env" ]; then
    source <(grep -v '^#' "$APP_DIR/.env" | sed 's/=\(.*\)/="\1"/')
else
    err ".env file not found at $APP_DIR/.env — please create it first!"
fi

log "Creating MySQL database and user..."
sudo mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS dknexai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON dknexai.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
log "MySQL: database 'dknexai' and user '${DB_USER}' ready."

# ─────────────────────────────────────────────────────────────
step "STEP 4 — Python Virtual Environment"
# ─────────────────────────────────────────────────────────────
if [ ! -d "$VENV" ]; then
    python3.11 -m venv "$VENV"
    log "venv created at $VENV"
fi

source "$VENV/bin/activate"
pip install --upgrade pip --quiet
log "Installing Python dependencies (this may take 5-10 minutes)..."
pip install -r "$APP_DIR/requirements-production.txt" --quiet
deactivate
log "Python dependencies installed."

# ─────────────────────────────────────────────────────────────
step "STEP 5 — Per-Agent .env Files"
# ─────────────────────────────────────────────────────────────

# Agent_chat
cat > "$APP_DIR/Agent_chat/.env" <<EOF
GROQ_API_KEY=${GROQ_API_KEY}
GROQ_MODEL=llama-3.3-70b-versatile
TIMEOUT=30
LOG_LEVEL=INFO
EOF

# Agent_coding
cat > "$APP_DIR/Agent_coding/.env" <<EOF
GROQ_API_KEY=${GROQ_API_KEY}
GROQ_MODEL=llama-3.3-70b-versatile
PORT=8001
LOG_LEVEL=INFO
EOF

# Agent_rag
cat > "$APP_DIR/Agent_rag/.env" <<EOF
GROQ_API_KEY=${GROQ_API_KEY}
EOF

# Agent_email
cat > "$APP_DIR/Agent_email/.env" <<EOF
APP_SECRET_KEY=${APP_SECRET_KEY:-$(openssl rand -hex 32)}
APP_HOST=127.0.0.1
APP_PORT=8080
GROQ_API_KEY=${GROQ_API_KEY}
GROQ_MODEL=llama-3.3-70b-versatile
EMAIL_ADDRESS=${EMAIL_ADDRESS:-}
EMAIL_PASSWORD=${EMAIL_PASSWORD:-}
IMAP_SERVER=${IMAP_SERVER:-imap.zoho.com}
IMAP_PORT=993
SMTP_SERVER=${SMTP_SERVER:-smtp.zoho.com}
SMTP_PORT=587
DATABASE_URL=sqlite+aiosqlite:////${APP_DIR}/Agent_email/email_agent.db
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@company.com}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-Admin@Production123!}
EOF

chmod 600 "$APP_DIR/Agent_chat/.env"
chmod 600 "$APP_DIR/Agent_coding/.env"
chmod 600 "$APP_DIR/Agent_rag/.env"
chmod 600 "$APP_DIR/Agent_email/.env"
log "Per-agent .env files created."

# ─────────────────────────────────────────────────────────────
step "STEP 6 — Spring Boot Backend Build"
# ─────────────────────────────────────────────────────────────
cd "$APP_DIR/BACKEND"
log "Building Spring Boot JAR (mvn package)..."
mvn clean package -DskipTests -Dspring.profiles.active=prod -q
JAR=$(ls target/*.jar | head -1)
log "JAR built: $JAR"
cd "$APP_DIR"

# ─────────────────────────────────────────────────────────────
step "STEP 7 — Angular Frontend Build"
# ─────────────────────────────────────────────────────────────
cd "$APP_DIR/FRONTEND"
log "Installing npm packages..."
npm ci --legacy-peer-deps --silent
log "Building Angular for production..."
npm run build -- --configuration production
log "Frontend built. Output:"
ls dist/
cd "$APP_DIR"

# ─────────────────────────────────────────────────────────────
step "STEP 8 — Install systemd Services"
# ─────────────────────────────────────────────────────────────
SYSTEMD_SRC="$APP_DIR/deploy/systemd"

for svc in dknex-agent-chat dknex-agent-coding dknex-agent-rag dknex-agent-email dknex-backend; do
    sudo cp "$SYSTEMD_SRC/$svc.service" "/etc/systemd/system/$svc.service"
    log "Installed: $svc.service"
done

sudo systemctl daemon-reload

for svc in dknex-agent-chat dknex-agent-coding dknex-agent-rag dknex-agent-email dknex-backend; do
    sudo systemctl enable "$svc"
    sudo systemctl restart "$svc"
    log "Started: $svc"
done

# ─────────────────────────────────────────────────────────────
step "STEP 9 — Nginx Configuration"
# ─────────────────────────────────────────────────────────────
sudo cp "$APP_DIR/deploy/nginx/dknexai.conf" /etc/nginx/sites-available/dknexai
sudo ln -sf /etc/nginx/sites-available/dknexai /etc/nginx/sites-enabled/dknexai
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl reload nginx
log "Nginx configured and reloaded."

# ─────────────────────────────────────────────────────────────
step "STEP 10 — Firewall (UFW)"
# ─────────────────────────────────────────────────────────────
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
log "UFW enabled. Only SSH + HTTP/HTTPS are open."

# ─────────────────────────────────────────────────────────────
step "STEP 11 — Log Rotation"
# ─────────────────────────────────────────────────────────────
sudo tee /etc/logrotate.d/dknexai > /dev/null <<'EOF'
/opt/dknexai/logs/*/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF
log "Log rotation configured (14 days)."

# ─────────────────────────────────────────────────────────────
step "STEP 12 — Wait & Health Check"
# ─────────────────────────────────────────────────────────────
log "Waiting 20s for all services to start..."
sleep 20

chmod +x "$APP_DIR/deploy/scripts/health_check.sh"
cp "$APP_DIR/deploy/scripts/health_check.sh" "$APP_DIR/scripts/health_check.sh"
bash "$APP_DIR/scripts/health_check.sh"

# ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}  DEPLOYMENT COMPLETE!                      ${NC}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════════${NC}"
echo -e "  Frontend : http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_EC2_IP')"
echo -e "  API      : http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_EC2_IP')/api/"
echo ""
warn "NEXT: Run SSL setup:"
echo -e "  sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com"
echo ""
