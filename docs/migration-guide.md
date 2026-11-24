# RallyPoint Database Migration & Operations Guide

This guide describes operational workflows for provisioning, migrating, maintaining, and recovering the RallyPoint PostgreSQL 16 database.

---

## 1. Initial Fresh Database Provisioning

### Step 1: Start PostgreSQL and pgAdmin via Docker Compose
```bash
docker compose up -d postgres pgadmin
```
Verify PostgreSQL is ready:
```bash
docker exec -it rallypoint-postgres pg_isready -U rallypoint -d rallypoint_db
```

### Step 2: Run Prisma Migrations
Generate the typed client and apply the base schema migrations:
```bash
npm run --workspace=@rallypoint/db prisma:generate
npm run --workspace=@rallypoint/db prisma:migrate
```

### Step 3: Apply PL/pgSQL Triggers, Partitioning & Views
Execute the raw SQL definitions in dependency order:
```bash
psql -U rallypoint -d rallypoint_db -f packages/db/src/partitioning.sql
psql -U rallypoint -d rallypoint_db -f packages/db/src/auditLog.sql
psql -U rallypoint -d rallypoint_db -f packages/db/src/rlsPolicies.sql
psql -U rallypoint -d rallypoint_db -f packages/db/src/analyticsRollups.sql
psql -U rallypoint -d rallypoint_db -f packages/db/src/rankingMaterializedViews.sql
```

### Step 4: Seed Initial Master Data & Community Rankings
```bash
npm run --workspace=@rallypoint/db prisma:seed
npm run seed:community
```

---

## 2. Partition Management (Monthly Append-Only Partitions)

`match_events` is partitioned declaratively by month on `occurred_at`.

### Automatic Partition Provisioning
The database includes a function `ensure_future_match_event_partitions(months_ahead)`:
```sql
SELECT ensure_future_match_event_partitions(6);
```
Schedule this monthly via `pg_cron` or your task scheduler:
```sql
SELECT cron.schedule('0 0 1 * *', 'SELECT ensure_future_match_event_partitions(3);');
```

### Cold Partition Archival
To archive partitions older than 2 years:
```bash
bash scripts/archive_partitions.sh 2024 01
```
This dumps the table, compresses it to gzip, detaches it with `ALTER TABLE match_events DETACH PARTITION`, and drops the old table to free active memory.

---

## 3. Zero-Downtime Migration Pattern (Expand & Contract)

When modifying live production columns or constraints:

### Phase A: Expand
1. Add new columns as **nullable** or with safe default values.
2. Deploy application code that reads the old column while dual-writing to both old and new columns.
3. Backfill existing rows via a background batch job.

### Phase B: Switch Read Traffic
1. Update application code to read from the new column.
2. Keep dual-write active for safety verification.

### Phase C: Contract
1. Remove references to the old column from application code.
2. Drop old column or deprecate constraints in a maintenance window:
```sql
ALTER TABLE players DROP COLUMN legacy_field;
```

---

## 4. Disaster Recovery & Rollback

### Full Database Backup
```bash
bash scripts/backup.sh
```
Produces timestamped binary archive with SHA-256 checksums in `/backups`.

### Full Database Restore
```bash
bash scripts/restore.sh /backups/rallypoint_backup_YYYYMMDD_HHMMSS.dump
```

### Complete Analytics Rebuild
Because RallyPoint is event-sourced, if derived data is ever corrupted or altered, recompute everything from raw events:
```bash
npm run db:rebuild-stats
npm run rebuild-rankings
```

---

## 5. Schema Drift Verification in CI/CD

To verify that the database schema exactly matches the Prisma definition without unexpected drift:
```bash
npx prisma migrate diff \
  --from-schema-datamodel packages/db/prisma/schema.prisma \
  --to-schema-datasource packages/db/prisma/schema.prisma \
  --exit-code
```
Exit code `0` confirms zero drift.
