#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# SAS Garments — PostgreSQL restore script
#
# Usage:
#   ./scripts/restore-postgres.sh /var/backups/sas-garments/sas_garments_20240101_020000.sql.gz
#
# WARNING: This drops and recreates all tables. Always take a fresh backup first.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" ]]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "[ERROR] File not found: $BACKUP_FILE" >&2
    exit 1
fi

# Load .env
ENV_FILE="$(dirname "$(realpath "$0")")/../.env"
if [[ -f "$ENV_FILE" ]]; then
    set -a
    source <(grep -v '^#' "$ENV_FILE" | grep -v '^$')
    set +a
fi

if [[ -n "${DATABASE_URL:-}" ]]; then
    DB_USER=$(  echo "$DATABASE_URL" | sed 's|.*://\([^:]*\):.*|\1|')
    DB_PASS=$(  echo "$DATABASE_URL" | sed 's|.*://[^:]*:\([^@]*\)@.*|\1|')
    DB_HOST=$(  echo "$DATABASE_URL" | sed 's|.*@\([^:/]*\)[:/].*|\1|')
    DB_PORT=$(  echo "$DATABASE_URL" | sed 's|.*@[^:]*:\([0-9]*\)/.*|\1|')
    DB_NAME=$(  echo "$DATABASE_URL" | sed 's|.*/\([^?]*\).*|\1|')
    export PGHOST="$DB_HOST" PGPORT="$DB_PORT" PGDATABASE="$DB_NAME"
    export PGUSER="$DB_USER" PGPASSWORD="$DB_PASS"
fi

echo "[$(date -Iseconds)] ═══ RESTORE WARNING ═══"
echo "[$(date -Iseconds)] This will DESTROY the current database and restore from:"
echo "[$(date -Iseconds)] $BACKUP_FILE"
echo ""
read -r -p "Type 'yes' to confirm: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
    echo "Aborted."
    exit 0
fi

# Take safety backup before restore
SAFETY_FILE="/tmp/sas_safety_$(date +%Y%m%d_%H%M%S).sql.gz"
echo "[$(date -Iseconds)] Taking safety backup → $SAFETY_FILE"
pg_dump --format=plain --no-owner --no-privileges --if-exists --clean | gzip -9 > "$SAFETY_FILE"

echo "[$(date -Iseconds)] Stopping PM2…"
pm2 stop sas-garments-backend 2>/dev/null || true

echo "[$(date -Iseconds)] Restoring…"
gunzip -c "$BACKUP_FILE" | psql -v ON_ERROR_STOP=1

echo "[$(date -Iseconds)] Starting PM2…"
pm2 start sas-garments-backend 2>/dev/null || true

echo "[$(date -Iseconds)] ── Restore complete. ──"
echo "[$(date -Iseconds)] Safety backup: $SAFETY_FILE (delete manually when satisfied)"
