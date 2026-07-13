#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# SAS Garments — Ubuntu 22.04 server bootstrap
#
# Run as root or with sudo on a fresh Ubuntu 22.04 VPS:
#   curl -sSL https://raw.githubusercontent.com/YOU/REPO/main/scripts/setup-server.sh | bash
#
# What it installs:
#   - System updates & essential tools
#   - Node.js 20 LTS (via NodeSource)
#   - PostgreSQL 16
#   - Nginx
#   - Certbot (Let's Encrypt)
#   - PM2
#   - UFW firewall rules
#   - Creates deploy user + app directory
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_USER="${APP_USER:-deploy}"
APP_DIR="${APP_DIR:-/var/www/sas-garments}"
DOMAIN="${DOMAIN:-}"
DB_NAME="${DB_NAME:-sas_garments}"
DB_USER="${DB_USER:-sas_user}"
DB_PASS="${DB_PASS:-$(openssl rand -hex 16)}"

echo "════════════════════════════════════════════"
echo "  SAS Garments — Server Setup"
echo "════════════════════════════════════════════"
echo "  App dir   : $APP_DIR"
echo "  App user  : $APP_USER"
echo "  Domain    : ${DOMAIN:-'(set DOMAIN env var for SSL)'}"
echo ""

# ── 1. System updates ─────────────────────────────────────────────────────────
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get upgrade -yq
apt-get install -yq \
    curl wget git unzip build-essential \
    postgresql-client-16 \
    nginx certbot python3-certbot-nginx \
    ufw fail2ban

# ── 2. Node.js 20 LTS ─────────────────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ "$(node --version)" != v20* ]]; then
    echo "=== Installing Node.js 20 LTS ==="
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -yq nodejs
fi
echo "  Node.js: $(node --version)"
echo "  npm:     $(npm --version)"

# ── 3. PM2 ────────────────────────────────────────────────────────────────────
npm install -g pm2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# ── 4. PostgreSQL 16 ──────────────────────────────────────────────────────────
if ! command -v psql &>/dev/null; then
    echo "=== Installing PostgreSQL 16 ==="
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
        | gpg --dearmor -o /usr/share/keyrings/pgdg-archive-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/pgdg-archive-keyring.gpg] \
        https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
        | tee /etc/apt/sources.list.d/pgdg.list
    apt-get update -qq
    apt-get install -yq postgresql-16
fi

# ── 5. PostgreSQL database + user ─────────────────────────────────────────────
echo "=== Creating PostgreSQL database and user ==="
sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = '${DB_USER}') THEN
    CREATE USER "${DB_USER}" WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}') \gexec

GRANT ALL PRIVILEGES ON DATABASE "${DB_NAME}" TO "${DB_USER}";
SQL

echo "  DB created: postgresql://${DB_USER}:*****@localhost:5432/${DB_NAME}"

# ── 6. Deploy user ────────────────────────────────────────────────────────────
if ! id "$APP_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$APP_USER"
    usermod -aG sudo "$APP_USER"
fi

mkdir -p "$APP_DIR"/{uploads,logs,scripts}
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ── 7. Backup directory + cron ────────────────────────────────────────────────
mkdir -p /var/backups/sas-garments
chown -R "$APP_USER:$APP_USER" /var/backups/sas-garments

CRON_JOB="0 2 * * * ${APP_DIR}/scripts/backup-postgres.sh >> /var/log/sas-garments/backup.log 2>&1"
(crontab -u "$APP_USER" -l 2>/dev/null; echo "$CRON_JOB") | crontab -u "$APP_USER" -
echo "  Backup cron installed (daily at 02:00)"

mkdir -p /var/log/sas-garments
chown "$APP_USER:$APP_USER" /var/log/sas-garments

# ── 8. UFW firewall ───────────────────────────────────────────────────────────
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'
ufw status

# ── 9. Nginx default config ────────────────────────────────────────────────────
rm -f /etc/nginx/sites-enabled/default
systemctl reload nginx

# ── 10. Done ──────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════"
echo "  Setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Deploy code:  cd ${APP_DIR} && git clone <repo> ."
echo "  2. Create .env:  cp .env.example .env && nano .env"
echo "     Set DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
echo "  3. Install deps: npm ci --omit=dev"
echo "  4. Run migrate:  npm run migrate"
echo "  5. Start PM2:    pm2 start ecosystem.config.js"
if [[ -n "$DOMAIN" ]]; then
    echo "  6. Setup SSL:    certbot --nginx -d ${DOMAIN}"
fi
echo "════════════════════════════════════════════"
