#!/usr/bin/env bash
# ==============================================================================
# RallyPoint: Data Retention & Cold Storage Partition Archival Script
# ==============================================================================

set -euo pipefail

ARCHIVE_DIR="${ARCHIVE_DIR:-./cold_storage_archives}"
RETENTION_YEARS="${RETENTION_YEARS:-2}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-rallypoint_db}"
DB_USER="${DB_USER:-rallypoint}"

mkdir -p "${ARCHIVE_DIR}"

CUTOFF_DATE=$(date -d "${RETENTION_YEARS} years ago" +"%Y-%m-01")
CUTOFF_PARTITION="match_events_$(date -d "${RETENTION_YEARS} years ago" +"%Y_%m")"

echo "❄️  Archiving partitions older than ${CUTOFF_DATE} (Partition: ${CUTOFF_PARTITION})..."

# Check if target partition exists
EXISTS=$(PGPASSWORD="${DB_PASSWORD:-rallypoint_secret}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c \
  "SELECT 1 FROM pg_class WHERE relname = '${CUTOFF_PARTITION}';")

if [ -n "${EXISTS}" ]; then
  ARCHIVE_FILE="${ARCHIVE_DIR}/${CUTOFF_PARTITION}.sql.gz"
  echo "Dumping ${CUTOFF_PARTITION} to compressed archive ${ARCHIVE_FILE}..."
  
  PGPASSWORD="${DB_PASSWORD:-rallypoint_secret}" pg_dump \
    -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    -t "${CUTOFF_PARTITION}" | gzip > "${ARCHIVE_FILE}"

  echo "Detaching ${CUTOFF_PARTITION} from match_events..."
  PGPASSWORD="${DB_PASSWORD:-rallypoint_secret}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c \
    "ALTER TABLE match_events DETACH PARTITION ${CUTOFF_PARTITION};"

  echo "Dropping detached cold table ${CUTOFF_PARTITION}..."
  PGPASSWORD="${DB_PASSWORD:-rallypoint_secret}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c \
    "DROP TABLE ${CUTOFF_PARTITION};"

  echo "✅ Partition ${CUTOFF_PARTITION} safely archived to ${ARCHIVE_FILE}."
else
  echo "ℹ️  No partition named ${CUTOFF_PARTITION} found to archive."
fi
