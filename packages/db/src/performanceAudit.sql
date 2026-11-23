-- ==============================================================================
-- RallyPoint: Performance & Indexing Audit (EXPLAIN ANALYZE)
-- ==============================================================================

-- 1. Fuzzy Search on Player Display Name
-- Uses GIN index on lower(display_name) via pg_trgm
EXPLAIN ANALYZE
SELECT id, display_name, country, status
FROM players
WHERE lower(display_name) LIKE '%axelsen%'
  AND deleted_at IS NULL;

-- 2. Paginated Match History by Tournament & Status
-- Uses B-Tree index on (tournament_id, status, scheduled_at)
EXPLAIN ANALYZE
SELECT m.id, m.status, m.scheduled_at, m.court_id, m.winner_side
FROM matches m
WHERE m.tournament_id = 'tourney-all-england-open'
ORDER BY m.scheduled_at DESC
LIMIT 20 OFFSET 0;

-- 3. Live Match Feed Query
-- Uses Partial Index: CREATE INDEX idx_matches_live ON matches (id, court_id) WHERE status = 'LIVE';
EXPLAIN ANALYZE
SELECT m.id, m.court_id, m.match_type, m.started_at
FROM matches m
WHERE m.status = 'LIVE';

-- 4. Head-to-Head Lookup
-- Uses UNIQUE B-Tree index on (player_a_id, player_b_id)
EXPLAIN ANALYZE
SELECT *
FROM head_to_head_stats
WHERE player_a_id = 'player-viktor-axelsen'
  AND player_b_id = 'player-lee-zii-jia';

-- 5. Append-Only Event Sequence Ordering Query
-- Uses Composite Unique Index on (match_id, sequence_number)
EXPLAIN ANALYZE
SELECT id, sequence_number, event_type, side, occurred_at
FROM match_events
WHERE match_id = 'match-100'
ORDER BY sequence_number ASC;
