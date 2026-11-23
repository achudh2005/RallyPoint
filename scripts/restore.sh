#!/usr/bin/env bash
# ==============================================================================
# RallyPoint Database Restore Script (pg_restore)
# ==============================================================================

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <path_to_backup_file.dump>"
  exit 1
fi

BACKUP_FILE="$1"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-rallypoint_db}"
DB_USER="${DB_USER:-rallypoint}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ Error: Backup file not found at ${BACKUP_FILE}"
  exit 1
fi

# Verify SHA256 if checksum exists
if [ -f "${BACKUP_FILE}.sha256" ]; then
  echo "🔍 Verifying backup integrity via SHA256 checksum..."
  sha256sum -c "${BACKUP_FILE}.sha256"
fi

echo "⚠️  [$(date)] Initiating database restore into ${DB_NAME} on ${DB_HOST}:${DB_PORT}..."
read -p "Are you sure you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore aborted by user."
  exit 0
fi

# Restore using pg_restore
PGPASSWORD="${DB_PASSWORD:-rallypoint_secret}" pg_restore \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -v \
  "${BACKUP_FILE}"

echo "✅ Database restore successfully completed."
