# SAS Garments — Production Deployment Guide

This guide covers deploying the **SAS Garments** multi-tenant POS backend to a fresh Ubuntu 22.04 VPS, with an optional Docker path for local/staging environments.

---

## Table of Contents

1. [Server Requirements](#1-server-requirements)
2. [Automated Server Setup](#2-automated-server-setup)
3. [Manual Server Setup](#3-manual-server-setup)
4. [PostgreSQL Setup](#4-postgresql-setup)
5. [Application Deployment](#5-application-deployment)
6. [Environment Variables](#6-environment-variables)
7. [Running Migrations](#7-running-migrations)
8. [PM2 Process Management](#8-pm2-process-management)
9. [Nginx + HTTPS (Let's Encrypt)](#9-nginx--https-lets-encrypt)
10. [Automated Backups](#10-automated-backups)
11. [Monitoring & Logs](#11-monitoring--logs)
12. [GitHub Secrets (CI/CD)](#12-github-secrets-cicd)
13. [Electron Release Workflow](#13-electron-release-workflow)
14. [Docker (Local / Staging)](#14-docker-local--staging)
15. [First Super Admin Account](#15-first-super-admin-account)
16. [Disaster Recovery](#16-disaster-recovery)
17. [Security Checklist](#17-security-checklist)

---

## 1. Server Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| CPU | 1 vCPU | 2+ vCPU |
| RAM | 1 GB | 2 GB |
| Disk | 20 GB SSD | 40 GB SSD |
| Outbound ports | 80, 443 | 80, 443 |

A static IP and a domain name pointing at it are required for HTTPS.

---

## 2. Automated Server Setup

The script `scripts/setup-server.sh` installs all dependencies, creates the database, sets up PM2, configures the firewall, and adds the daily backup cron automatically:

```bash
# On your local machine — copy the script to the server first:
scp scripts/setup-server.sh user@your-server.com:~/
ssh user@your-server.com

# On the server:
chmod +x setup-server.sh
sudo bash setup-server.sh
```

After the script finishes, jump to [Application Deployment](#5-application-deployment).

---

## 3. Manual Server Setup

### 3.1 System packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential ufw nginx certbot python3-certbot-nginx
```

### 3.2 Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # should print v20.x.x
```

### 3.3 PM2

```bash
sudo npm install -g pm2
pm2 startup systemd   # follow the printed command
```

### 3.4 Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 4. PostgreSQL Setup

### 4.1 Install PostgreSQL 16

```bash
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt install -y postgresql-16
sudo systemctl enable --now postgresql
```

### 4.2 Create database and user

```bash
sudo -u postgres psql <<'SQL'
CREATE USER sas_user WITH PASSWORD 'STRONG_PASSWORD_HERE';
CREATE DATABASE sas_garments OWNER sas_user;
GRANT ALL PRIVILEGES ON DATABASE sas_garments TO sas_user;
SQL
```

### 4.3 Connection string

```
DATABASE_URL=postgres://sas_user:STRONG_PASSWORD_HERE@localhost:5432/sas_garments
```

> For managed databases (Supabase, RDS, etc.) append `?sslmode=require` and set `DB_SSL=true`.

---

## 5. Application Deployment

### 5.1 Create a deploy user (recommended)

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG sudo deploy
# Copy your SSH public key:
sudo -u deploy mkdir -p /home/deploy/.ssh
sudo cp ~/.ssh/authorized_keys /home/deploy/.ssh/
sudo chown -R deploy:deploy /home/deploy/.ssh
```

### 5.2 Clone the repository

```bash
sudo -u deploy git clone https://github.com/shamrozamalik2/sas-garments-releases.git /var/www/sas-garments
cd /var/www/sas-garments
```

### 5.3 Install production dependencies

```bash
npm ci --omit=dev
```

### 5.4 Environment file

```bash
cp .env.example .env
nano .env   # fill in real values (see section 6)
```

### 5.5 Create required directories

```bash
mkdir -p /var/www/sas-garments/uploads
mkdir -p /var/backups/sas-garments
chown -R deploy:deploy /var/www/sas-garments /var/backups/sas-garments
```

---

## 6. Environment Variables

Copy `.env.example` to `.env` and set every variable:

```bash
NODE_ENV=production
PORT=3001

# PostgreSQL
DATABASE_URL=postgres://sas_user:STRONG_PASS@localhost:5432/sas_garments
DB_POOL_MAX=20
DB_SSL=false

# JWT — generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<64-char hex>
JWT_EXPIRES_IN=15m
REFRESH_SECRET=<another 64-char hex>
REFRESH_EXPIRES_DAYS=7

# Super Admin (separate secret)
SUPER_ADMIN_JWT_SECRET=<64-char hex>

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX=300
COOKIE_SECRET=<32-char hex>

# File uploads
UPLOADS_DIR=/var/www/sas-garments/uploads

# CORS (comma-separated, Electron uses null origin)
CORS_ORIGINS=https://your-domain.com

# Domain (for certbot)
DOMAIN=your-domain.com
CERT_EMAIL=admin@your-domain.com

# Initial tenant seed (migration 002, run once)
COMPANY_NAME=SAS Garments
COMPANY_SLUG=sas-garments
COMPANY_EMAIL=info@sasgarments.com
COMPANY_PHONE=+92 300 0000000
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@sasgarments.com
ADMIN_PASSWORD=<strong password>

# Backup
BACKUP_DIR=/var/backups/sas-garments
RETAIN_DAYS=14
```

---

## 7. Running Migrations

Migrations must be run **before** starting the server. They are idempotent — safe to run multiple times.

```bash
cd /var/www/sas-garments
node backend/src/migrate-runner.js
```

Expected output:
```
[migrate] Running migration: 001_initial_schema
[migrate] Running migration: 002_seed_tenant
[migrate] Running migration: 003_super_admin
[migrate] All migrations complete
```

> Migration 002 (`seed_tenant`) reads the `COMPANY_*` and `ADMIN_*` env vars to create the first tenant. Set them before running.

---

## 8. PM2 Process Management

### 8.1 Start the backend

```bash
cd /var/www/sas-garments
pm2 start ecosystem.config.js
pm2 save
```

### 8.2 Common PM2 commands

```bash
pm2 status                              # list processes
pm2 logs sas-garments-backend           # tail logs
pm2 reload sas-garments-backend         # zero-downtime reload
pm2 restart sas-garments-backend        # hard restart
pm2 stop sas-garments-backend           # stop
```

### 8.3 Health check

```bash
curl -s http://localhost:3001/api/health | python3 -m json.tool
```

Expected:
```json
{ "status": "ok", "uptime": 120, "timestamp": "..." }
```

---

## 9. Nginx + HTTPS (Let's Encrypt)

### 9.1 Copy Nginx config

```bash
sudo cp nginx/conf.d/sas-garments.conf /etc/nginx/conf.d/
sudo cp nginx/conf.d/proxy_params.conf  /etc/nginx/conf.d/

# Replace placeholder domain:
sudo sed -i 's/YOUR_DOMAIN.com/your-domain.com/g' /etc/nginx/conf.d/sas-garments.conf

sudo nginx -t && sudo systemctl reload nginx
```

### 9.2 Obtain SSL certificate

```bash
sudo certbot --nginx -d your-domain.com --non-interactive --agree-tos -m admin@your-domain.com
```

Certbot auto-renews via a systemd timer. Verify:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

### 9.3 Test HTTPS

```bash
curl -I https://your-domain.com/api/health
# HTTP/2 200
```

---

## 10. Automated Backups

The script `scripts/backup-postgres.sh` creates a compressed dump and prunes files older than `RETAIN_DAYS` days.

### 10.1 Manual test

```bash
export DATABASE_URL="postgres://sas_user:PASS@localhost:5432/sas_garments"
export BACKUP_DIR=/var/backups/sas-garments
export RETAIN_DAYS=14
bash scripts/backup-postgres.sh
# → /var/backups/sas-garments/sas_garments_20260101_020000.sql.gz
```

### 10.2 Daily cron (2 AM)

```bash
sudo crontab -u deploy -e
# Add:
0 2 * * * /var/www/sas-garments/scripts/backup-postgres.sh >> /var/log/sas-backup.log 2>&1
```

### 10.3 Restore from backup

```bash
bash scripts/restore-postgres.sh /var/backups/sas-garments/sas_garments_20260101_020000.sql.gz
```

> The restore script takes a safety backup first, stops PM2, restores, and restarts.

### 10.4 Off-site backup (recommended)

Add an `rclone` or `aws s3 cp` line to `backup-postgres.sh` after the dump:

```bash
aws s3 cp "$BACKUP_FILE" s3://your-bucket/postgres-backups/
```

---

## 11. Monitoring & Logs

### Application logs (Winston)

```
/var/www/sas-garments/logs/error.log     # errors only, 5 MB × 5 files
/var/www/sas-garments/logs/combined.log  # all levels, 20 MB × 10 files
```

```bash
tail -f /var/www/sas-garments/logs/combined.log | jq .
```

### PM2 logs

```bash
pm2 logs sas-garments-backend --lines 200
```

### Nginx logs

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Postgres logs

```bash
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

---

## 12. GitHub Secrets (CI/CD)

Configure these in `Settings → Secrets → Actions` of your GitHub repository.

### Backend deploy workflow

| Secret | Value |
|--------|-------|
| `VPS_HOST` | Server IP or hostname (e.g. `203.0.113.10`) |
| `VPS_USER` | SSH user (e.g. `deploy`) |
| `VPS_SSH_KEY` | Private key content (`cat ~/.ssh/id_ed25519`) |
| `VPS_PORT` | SSH port (default `22`) |

### Electron release workflow

| Secret | Value |
|--------|-------|
| `GH_TOKEN` | GitHub Personal Access Token with `repo` scope |
| `VITE_API_URL` | Production API URL (`https://your-domain.com`) |
| `VITE_COMPANY_SLUG` | Tenant slug (`sas-garments`) |

### How to generate SSH key pair (if not done)

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_key -N ""
# Copy public key to server:
ssh-copy-id -i ~/.ssh/deploy_key.pub deploy@your-server.com
# Add private key to GitHub Secrets as VPS_SSH_KEY:
cat ~/.ssh/deploy_key
```

### CI/CD trigger conditions

- **Backend deploy**: any push to `main` that touches `backend/**`, `package.json`, or `ecosystem.config.js`
- **Electron release**: any tag matching `v*.*.*` (e.g. `git tag v1.2.0 && git push --tags`)

---

## 13. Electron Release Workflow

### Publish a new release

```bash
# 1. Bump version in package.json
npm version patch    # or minor / major

# 2. Push the tag created by npm version
git push origin main --tags

# 3. GitHub Actions builds the .exe installer and publishes it to GitHub Releases
#    Clients with auto-update enabled will download it automatically within 24h.
```

### Auto-update mechanism

The Electron app uses `electron-updater` with `provider: 'github'`. On launch it calls `autoUpdater.checkForUpdatesAndNotify()`. When a new release is published, the user sees a notification and can install with one click.

### Manual download

GitHub Releases page: `https://github.com/shamrozamalik2/sas-garments-releases/releases`

---

## 14. Docker (Local / Staging)

Use Docker Compose for local development or staging environments.

### 14.1 Start services

```bash
cp .env.example .env    # fill in vars
docker compose up -d postgres backend nginx
```

### 14.2 Run migrations inside Docker

```bash
docker compose exec backend node backend/src/migrate-runner.js
```

### 14.3 Start pgAdmin (optional)

```bash
docker compose --profile tools up -d pgadmin
# Visit http://localhost:5050
```

### 14.4 Start certbot for staging SSL

```bash
docker compose --profile ssl up certbot
```

### 14.5 Useful commands

```bash
docker compose logs -f backend         # tail backend logs
docker compose exec postgres psql -U sas_user sas_garments
docker compose down                    # stop all
docker compose down -v                 # stop + remove volumes (destructive!)
```

---

## 15. First Super Admin Account

The Super Admin portal (`/admin/...`) uses a separate authentication table. Create the first account after migrations are complete:

### On the server (or locally)

```bash
cd /var/www/sas-garments
node scripts/create-super-admin.js
```

The script prompts for email, name, and password (minimum 10 characters).

### Login

Navigate to `https://your-domain.com/#/admin/login` (or `http://localhost:5173/#/admin/login` in dev).

The Super Admin portal is a separate section — it does **not** share session or JWT with regular tenant users.

---

## 16. Disaster Recovery

### Scenario A: Server hardware failure

1. Provision a new Ubuntu 22.04 VPS with the same domain.
2. Run `setup-server.sh` on the new server.
3. Restore the latest backup: `bash scripts/restore-postgres.sh <backup-file>`.
4. Clone the repo, install deps, copy `.env`, run migrations.
5. Start PM2: `pm2 start ecosystem.config.js && pm2 save`.
6. Point DNS to the new IP.

### Scenario B: Accidental data deletion

1. Stop PM2 to prevent further writes: `pm2 stop sas-garments-backend`.
2. Restore from yesterday's backup: `bash scripts/restore-postgres.sh <file>`.
3. Restart PM2: `pm2 start sas-garments-backend`.

### Scenario C: Bad deployment

1. The GitHub Actions deploy workflow does a health check after reloading PM2.
2. If the health check fails, the workflow fails and PM2 keeps running the old version.
3. To manually roll back: `git checkout <previous-commit> && npm ci --omit=dev && pm2 reload sas-garments-backend`.

### Scenario D: Corrupted uploads

Uploads are stored at `UPLOADS_DIR` (default `/var/www/sas-garments/uploads`). Include this directory in your server snapshot or copy to S3:

```bash
aws s3 sync /var/www/sas-garments/uploads s3://your-bucket/uploads/
```

---

## 17. Security Checklist

- [ ] `.env` is **not** committed to git (`.gitignore` covers it)
- [ ] All JWT secrets are unique 64-char random hex strings
- [ ] `ADMIN_PASSWORD` and `SUPER_ADMIN_JWT_SECRET` changed from example values
- [ ] `DB_SSL=true` + `?sslmode=require` for managed/remote databases
- [ ] PostgreSQL port 5432 blocked externally (UFW allows only 80/443/SSH)
- [ ] Nginx rate limiting active (`auth` 5r/s, `api` 30r/s)
- [ ] HSTS header enabled in Nginx config
- [ ] PM2 runs as non-root `deploy` user
- [ ] `BCRYPT_ROUNDS=12` (or higher)
- [ ] Off-site backup destination configured
- [ ] SSL certificate auto-renewal tested: `certbot renew --dry-run`
- [ ] GitHub SSH key used only for deploys (separate from personal key)
- [ ] Super Admin password ≥ 12 characters, stored only in password manager
