#!/usr/bin/env bash
# ==============================================================================
# RallyPoint Database Backup Script (pg_dump Custom Format)
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-rallypoint_db}"
DB_USER="${DB_USER:-rallypoint}"
BACKUP_FILE="${BACKUP_DIR}/rallypoint_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

echo "📦 [$(date)] Starting RallyPoint database backup..."
echo "Host: ${DB_HOST}:${DB_PORT} | Database: ${DB_NAME} | User: ${DB_USER}"

# Execute pg_dump in custom archive format (-Fc)
PGPASSWORD="${DB_PASSWORD:-rallypoint_secret}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -F c \
  -b \
  -v \
  -f "${BACKUP_FILE}"

# Generate checksum for verification
sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✅ Backup completed successfully: ${BACKUP_FILE} (${FILE_SIZE})"

# Retain only last 30 daily backups
find "${BACKUP_DIR}" -name "rallypoint_*.dump" -mtime +30 -exec rm -f {} \;
echo "🧹 Pruned backups older than 30 days."
