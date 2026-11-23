-- ==============================================================================
-- RallyPoint: Community Ranking Performance & Indexing Audit (EXPLAIN ANALYZE)
-- 5 Heaviest Queries Benchmark for Production Deployment
-- ==============================================================================

-- 1. Overall Composite Ranking Query with Joins, Grouping & Window Functions
-- Measures runtime of evaluating composite scores across active season players
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    p.id,
    p.display_name,
    COUNT(DISTINCT m.id) AS matches_played,
    COUNT(DISTINCT m.id) FILTER (WHERE m.winner_side = mp.side) AS wins,
    COUNT(DISTINCT m.id) FILTER (WHERE m.winner_side IS NOT NULL AND m.winner_side != mp.side) AS losses,
    ROUND(
        (COUNT(DISTINCT m.id) FILTER (WHERE m.winner_side = mp.side)::NUMERIC / 
         NULLIF(COUNT(DISTINCT m.id), 0)::NUMERIC) * 100.0, 
        2
    ) AS win_rate,
    COALESCE(SUM(CASE WHEN mp.side = 'A' THEN g.score_a - g.score_b ELSE g.score_b - g.score_a END), 0) AS point_diff,
    DENSE_RANK() OVER (
        ORDER BY 
            (0.40 * (COUNT(DISTINCT m.id) FILTER (WHERE m.winner_side = mp.side)::FLOAT / NULLIF(COUNT(DISTINCT m.id), 0)::FLOAT)) +
            (0.25 * (COALESCE(SUM(CASE WHEN mp.side = 'A' THEN g.score_a - g.score_b ELSE g.score_b - g.score_a END), 0)::FLOAT / NULLIF(COUNT(DISTINCT m.id), 0)::FLOAT)) +
            (0.15 * COUNT(DISTINCT m.id) FILTER (WHERE m.winner_side = mp.side)::FLOAT) DESC
    ) AS calculated_rank
FROM players p
JOIN match_participants mp ON mp.player_id = p.id
JOIN matches m ON m.id = mp.match_id AND m.status = 'COMPLETED'
JOIN seasons s ON s.id = m.season_id AND s.is_active = TRUE
LEFT JOIN games g ON g.match_id = m.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.display_name
HAVING COUNT(DISTINCT m.id) >= 1
ORDER BY calculated_rank ASC
LIMIT 50;


-- 2. Head-to-Head Detailed Aggregation Between Two Players
-- Evaluates direct match encounters, games won/lost, and rally point differential
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    m.id AS match_id,
    m.ended_at,
    m.winner_side,
    mpa.side AS player_a_side,
    mpb.side AS player_b_side,
    COALESCE(SUM(CASE WHEN g.winner_side = mpa.side THEN 1 ELSE 0 END), 0) AS player_a_games,
    COALESCE(SUM(CASE WHEN g.winner_side = mpb.side THEN 1 ELSE 0 END), 0) AS player_b_games,
    COALESCE(SUM(CASE WHEN mpa.side = 'A' THEN g.score_a ELSE g.score_b END), 0) AS player_a_points,
    COALESCE(SUM(CASE WHEN mpb.side = 'A' THEN g.score_a ELSE g.score_b END), 0) AS player_b_points
FROM matches m
JOIN match_participants mpa ON mpa.match_id = m.id AND mpa.player_id = 'player-viktor-axelsen'
JOIN match_participants mpb ON mpb.match_id = m.id AND mpb.player_id = 'player-lee-zii-jia'
LEFT JOIN games g ON g.match_id = m.id
WHERE m.status = 'COMPLETED'
GROUP BY m.id, m.ended_at, m.winner_side, mpa.side, mpb.side
ORDER BY m.ended_at DESC;


-- 3. Detailed Shot & Error Attribution Across Append-Only Rally Events
-- Evaluates performance of scanning partition-pruned match_events for shot radar stats
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    me.shot_type,
    COUNT(*) FILTER (WHERE me.rally_end_result = 'WINNER' AND me.point_winner_player_id = 'player-viktor-axelsen') AS winners_count,
    COUNT(*) FILTER (WHERE me.rally_end_result = 'UNFORCED_ERROR' AND me.error_player_id = 'player-viktor-axelsen') AS unforced_errors,
    COUNT(*) FILTER (WHERE me.rally_end_result = 'FORCED_ERROR' AND me.error_player_id = 'player-viktor-axelsen') AS forced_errors,
    COUNT(*) FILTER (WHERE me.rally_end_result = 'SERVICE_FAULT' AND me.error_player_id = 'player-viktor-axelsen') AS service_faults
FROM match_events me
JOIN match_participants mp ON mp.match_id = me.match_id AND mp.player_id = 'player-viktor-axelsen'
WHERE me.event_type = 'POINT'
  AND me.shot_type IS NOT NULL
GROUP BY me.shot_type
ORDER BY winners_count DESC;


-- 4. Team League Standings & Promotion/Relegation Zone Query
-- Computes points table, net sets, and rank ordering across Doubles Pairs and Club Teams
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    t.id,
    t.name,
    t.type,
    COUNT(DISTINCT m.id) AS matches_played,
    COUNT(DISTINCT m.id) FILTER (WHERE m.winner_side = ms.side) AS wins,
    COUNT(DISTINCT m.id) FILTER (WHERE m.winner_side IS NOT NULL AND m.winner_side != ms.side) AS losses,
    ROUND(
        (COUNT(DISTINCT m.id) FILTER (WHERE m.winner_side = ms.side)::NUMERIC / 
         NULLIF(COUNT(DISTINCT m.id), 0)::NUMERIC) * 100.0, 
        2
    ) AS win_pct,
    COALESCE(SUM(CASE WHEN ms.side = 'A' THEN g.score_a ELSE g.score_b END), 0) AS points_for,
    COALESCE(SUM(CASE WHEN ms.side = 'A' THEN g.score_b ELSE g.score_a END), 0) AS points_against,
    COALESCE(SUM(CASE WHEN ms.side = 'A' THEN g.score_a - g.score_b ELSE g.score_b - g.score_a END), 0) AS net_points,
    DENSE_RANK() OVER (
        ORDER BY 
            COUNT(DISTINCT m.id) FILTER (WHERE m.winner_side = ms.side) DESC,
            COALESCE(SUM(CASE WHEN ms.side = 'A' THEN g.score_a - g.score_b ELSE g.score_b - g.score_a END), 0) DESC
    ) AS league_position
FROM teams t
JOIN match_sides ms ON ms.team_id = t.id
JOIN matches m ON m.id = ms.match_id AND m.status = 'COMPLETED'
LEFT JOIN games g ON g.match_id = m.id
GROUP BY t.id, t.name, t.type
ORDER BY league_position ASC;


-- 5. Multi-Period Ranking Snapshot Time-Series (Rank History Inverted Y-Axis)
-- Tests B-Tree composite index on (player_id, category, snapshot_date)
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    prs.snapshot_date,
    prs.rank,
    prs.previous_rank,
    prs.headline_value,
    prs.matches_played,
    prs.stats
FROM player_ranking_snapshots prs
WHERE prs.player_id = 'player-viktor-axelsen'
  AND prs.category = 'OVERALL'
  AND prs.period = 'ALL_TIME'
ORDER BY prs.snapshot_date ASC
LIMIT 100;
