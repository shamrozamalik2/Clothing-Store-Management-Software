#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# SAS Garments — PostgreSQL backup script
#
# Usage:
#   ./scripts/backup-postgres.sh             # manual run
#   (cron) 0 2 * * * /var/www/sas-garments/scripts/backup-postgres.sh >> /var/log/sas-garments/backup.log 2>&1
#
# Requires: pg_dump, gzip
# Env vars: DATABASE_URL (or PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sas-garments}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"              # keep backups for N days
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/sas_garments_${TIMESTAMP}.sql.gz"

# Load .env if available (for DATABASE_URL)
ENV_FILE="$(dirname "$(realpath "$0")")/../.env"
if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source <(grep -v '^#' "$ENV_FILE" | grep -v '^$')
    set +a
fi

# ── Parse DATABASE_URL → psql env vars ────────────────────────────────────────
if [[ -n "${DATABASE_URL:-}" ]]; then
    # Format: postgres://user:pass@host:port/dbname[?sslmode=...]
    DB_PROTO=$(echo "$DATABASE_URL" | sed 's|^\(.*\)://.*|\1|')
    DB_USER=$(  echo "$DATABASE_URL" | sed 's|.*://\([^:]*\):.*|\1|')
    DB_PASS=$(  echo "$DATABASE_URL" | sed 's|.*://[^:]*:\([^@]*\)@.*|\1|')
    DB_HOST=$(  echo "$DATABASE_URL" | sed 's|.*@\([^:/]*\)[:/].*|\1|')
    DB_PORT=$(  echo "$DATABASE_URL" | sed 's|.*@[^:]*:\([0-9]*\)/.*|\1|')
    DB_NAME=$(  echo "$DATABASE_URL" | sed 's|.*/\([^?]*\).*|\1|')
    export PGHOST="$DB_HOST"
    export PGPORT="$DB_PORT"
    export PGDATABASE="$DB_NAME"
    export PGUSER="$DB_USER"
    export PGPASSWORD="$DB_PASS"
fi

# ── Pre-flight ─────────────────────────────────────────────────────────────────
if ! command -v pg_dump &>/dev/null; then
    echo "[ERROR] pg_dump not found. Install postgresql-client." >&2
    exit 1
fi

mkdir -p "$BACKUP_DIR"
echo "[$(date -Iseconds)] ── Backup started ──"
echo "[$(date -Iseconds)] Database: ${PGDATABASE}@${PGHOST}:${PGPORT}"
echo "[$(date -Iseconds)] Output:   ${BACKUP_FILE}"

# ── Dump ──────────────────────────────────────────────────────────────────────
pg_dump \
    --format=plain \
    --no-owner \
    --no-privileges \
    --if-exists \
    --clean \
    | gzip -9 > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date -Iseconds)] Backup created: ${BACKUP_FILE} (${SIZE})"

# ── Prune old backups ──────────────────────────────────────────────────────────
echo "[$(date -Iseconds)] Pruning backups older than ${RETAIN_DAYS} days…"
find "$BACKUP_DIR" -name 'sas_garments_*.sql.gz' -mtime +${RETAIN_DAYS} -print -delete

REMAINING=$(find "$BACKUP_DIR" -name 'sas_garments_*.sql.gz' | wc -l)
echo "[$(date -Iseconds)] ── Backup complete. ${REMAINING} backup(s) retained. ──"
