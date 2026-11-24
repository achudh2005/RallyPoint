-- ==============================================================================
-- RallyPoint: Performance & Indexing Audit (10 Critical Queries - EXPLAIN ANALYZE)
-- ==============================================================================

-- 1. Fuzzy Search on Player Display Name (Trigram GIN)
-- Target: Sub-millisecond fuzzy matching across 100k+ players
EXPLAIN ANALYZE
SELECT id, display_name, country, status
FROM players
WHERE lower(display_name) LIKE '%axelsen%'
  AND deleted_at IS NULL
LIMIT 20;

-- 2. Full-Text Search on Player Full Name
-- Target: Fast text search with language stemming
EXPLAIN ANALYZE
SELECT id, display_name, country
FROM players
WHERE to_tsvector('english', first_name || ' ' || last_name) @@ to_tsquery('english', 'Viktor & Axelsen')
  AND deleted_at IS NULL
LIMIT 20;

-- 3. Player Profile Page Load (Master Data + Derived Stats)
-- Target: Primary user dashboard query joining profile, club, career stats, and form trend
EXPLAIN ANALYZE
SELECT 
    p.id, p.display_name, p.photo_url, p.dominant_hand, p.status,
    c.name AS club_name,
    cs.matches_played, cs.matches_won, cs.matches_lost, cs.win_rate, cs.current_streak,
    ft.recent_results, ft.avg_points_per_game
FROM players p
LEFT JOIN clubs c ON c.id = p.club_id
LEFT JOIN player_career_stats cs ON cs.player_id = p.id
LEFT JOIN player_form_trends ft ON ft.player_id = p.id
WHERE p.id = 'player-viktor-axelsen'
  AND p.deleted_at IS NULL;

-- 4. Cursor-Paginated Match History for a Player
-- Target: High-throughput match history feed using indexed composite keys
EXPLAIN ANALYZE
SELECT m.id, m.match_type, m.scoring_format, m.status, m.started_at, m.ended_at, m.winner_side
FROM matches m
JOIN match_participants mp ON mp.match_id = m.id
WHERE mp.player_id = 'player-viktor-axelsen'
ORDER BY m.created_at DESC
LIMIT 20;

-- 5. Tournament Match Schedule by Status & Date
-- Target: Fast tournament view filtered by status
EXPLAIN ANALYZE
SELECT m.id, m.court_id, m.match_type, m.scoring_format, m.status, m.scheduled_at, m.winner_side
FROM matches m
WHERE m.tournament_id = 'tourney-all-england-open'
  AND m.status = 'COMPLETED'
ORDER BY m.scheduled_at DESC
LIMIT 20;

-- 6. Leaderboard Query by Rating/Points and Scoring Format
-- Target: Ranked community leaderboard using composite index (category, period, scoring_format, rank)
EXPLAIN ANALYZE
SELECT prs.rank, p.display_name, prs.matches_played, prs.ranking_points, prs.headline_value, prs.stats
FROM player_ranking_snapshots prs
JOIN players p ON p.id = prs.player_id
WHERE prs.category = 'LEAGUE_TABLE'
  AND prs.period = 'ALL_TIME'
  AND prs.scoring_format = 'ALL'
ORDER BY prs.rank ASC
LIMIT 50;

-- 7. Pairwise Head-to-Head Lookup
-- Target: O(1) indexed lookup on unique composite pair (player_a_id, player_b_id)
EXPLAIN ANALYZE
SELECT *
FROM head_to_head_stats
WHERE (player_a_id = 'player-viktor-axelsen' AND player_b_id = 'player-lee-zii-jia')
   OR (player_a_id = 'player-lee-zii-jia' AND player_b_id = 'player-viktor-axelsen');

-- 8. Live Match Event Stream Replay (Append-Only Partitioned Table)
-- Target: Instant point-by-point replay of live match events ordered by sequence_number
EXPLAIN ANALYZE
SELECT id, sequence_number, event_type, side, rally_end_type, server_player_id, payload, occurred_at
FROM match_events
WHERE match_id = 'match-100'
ORDER BY sequence_number ASC;

-- 9. Active Live Matches Partial Index Query
-- Target: Microsecond lookup of live matches without scanning completed/scheduled matches
EXPLAIN ANALYZE
SELECT m.id, m.court_id, m.match_type, m.scoring_format, m.started_at
FROM matches m
WHERE m.status = 'LIVE';

-- 10. Rolling 10-Match Form Aggregate Query
-- Target: Instant retrieval of player rolling 10-match performance trend
EXPLAIN ANALYZE
SELECT player_id, recent_results, avg_points_per_game, avg_match_duration_minutes, updated_at
FROM player_form_trends
WHERE player_id = 'player-viktor-axelsen';
