-- ==============================================================================
-- RallyPoint: Community Ranking Materialized Views & Refresh Triggers
-- ==============================================================================

-- 1. Materialized View for Live Player Leaderboards & Career Projections
DROP MATERIALIZED VIEW IF EXISTS mv_player_rankings CASCADE;

CREATE MATERIALIZED VIEW mv_player_rankings AS
SELECT 
    p.id AS player_id,
    p.display_name,
    p.photo_url,
    p.status,
    COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'COMPLETED') AS matches_played,
    COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'COMPLETED' AND m.winner_side = mp.side) AS wins,
    COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'COMPLETED' AND m.winner_side IS NOT NULL AND m.winner_side != mp.side) AS losses,
    CASE 
        WHEN COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'COMPLETED') > 0 
        THEN ROUND(
            (COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'COMPLETED' AND m.winner_side = mp.side)::NUMERIC / 
             COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'COMPLETED')::NUMERIC) * 100.0, 
            2
        )
        ELSE 0.00
    END AS win_rate,
    COALESCE(SUM(CASE WHEN mp.side = 'A' THEN g.score_a ELSE g.score_b END), 0) AS points_scored,
    COALESCE(SUM(CASE WHEN mp.side = 'A' THEN g.score_b ELSE g.score_a END), 0) AS points_conceded,
    COALESCE(SUM(CASE WHEN mp.side = 'A' THEN g.score_a - g.score_b ELSE g.score_b - g.score_a END), 0) AS point_difference,
    COALESCE(SUM(CASE WHEN me.event_type = 'POINT' AND me.shot_type = 'SMASH' AND me.point_winner_player_id = p.id THEN 1 ELSE 0 END), 0) AS smash_winners,
    COALESCE(SUM(CASE WHEN me.event_type = 'POINT' AND me.shot_type = 'DROP' AND me.point_winner_player_id = p.id THEN 1 ELSE 0 END), 0) AS drop_shot_winners,
    COALESCE(SUM(CASE WHEN me.event_type = 'POINT' AND me.shot_type = 'DROP' THEN 1 ELSE 0 END), 0) AS drop_shots_played,
    COALESCE(SUM(CASE WHEN me.event_type = 'POINT' AND me.rally_end_result = 'UNFORCED_ERROR' AND me.error_player_id = p.id THEN 1 ELSE 0 END), 0) AS unforced_errors,
    NOW() AS last_refreshed_at
FROM players p
LEFT JOIN match_participants mp ON mp.player_id = p.id
LEFT JOIN matches m ON m.id = mp.match_id
LEFT JOIN games g ON g.match_id = m.id
LEFT JOIN match_events me ON me.match_id = m.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.display_name, p.photo_url, p.status;

-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX idx_mv_player_rankings_id ON mv_player_rankings (player_id);
CREATE INDEX idx_mv_player_rankings_win_rate ON mv_player_rankings (win_rate DESC);
CREATE INDEX idx_mv_player_rankings_pt_diff ON mv_player_rankings (point_difference DESC);
CREATE INDEX idx_mv_player_rankings_wins ON mv_player_rankings (wins DESC);


-- 2. Materialized View for Team League Standings
DROP MATERIALIZED VIEW IF EXISTS mv_team_rankings CASCADE;

CREATE MATERIALIZED VIEW mv_team_rankings AS
SELECT 
    t.id AS team_id,
    t.name AS team_name,
    t.type AS team_type,
    COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'COMPLETED') AS matches_played,
    COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'COMPLETED' AND ms.side = m.winner_side) AS wins,
    COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'COMPLETED' AND ms.side != m.winner_side) AS losses,
    CASE 
        WHEN COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'COMPLETED') > 0 
        THEN ROUND(
            (COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'COMPLETED' AND ms.side = m.winner_side)::NUMERIC / 
             COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'COMPLETED')::NUMERIC) * 100.0, 
            2
        )
        ELSE 0.00
    END AS win_rate,
    COALESCE(SUM(CASE WHEN ms.side = 'A' THEN g.score_a ELSE g.score_b END), 0) AS points_for,
    COALESCE(SUM(CASE WHEN ms.side = 'A' THEN g.score_b ELSE g.score_a END), 0) AS points_against,
    COALESCE(SUM(CASE WHEN ms.side = 'A' THEN g.score_a - g.score_b ELSE g.score_b - g.score_a END), 0) AS point_difference,
    NOW() AS last_refreshed_at
FROM teams t
LEFT JOIN match_sides ms ON ms.team_id = t.id
LEFT JOIN matches m ON m.id = ms.match_id
LEFT JOIN games g ON g.match_id = m.id
GROUP BY t.id, t.name, t.type;

CREATE UNIQUE INDEX idx_mv_team_rankings_id ON mv_team_rankings (team_id);
CREATE INDEX idx_mv_team_rankings_wins ON mv_team_rankings (wins DESC);
CREATE INDEX idx_mv_team_rankings_pt_diff ON mv_team_rankings (point_difference DESC);


-- 3. Stored Procedure to Refresh Ranking Materialized Views
CREATE OR REPLACE FUNCTION refresh_ranking_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_player_rankings;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_team_rankings;
END;
$$ LANGUAGE plpgsql;


-- 4. Trigger on Match Completion to Refresh Views Automatically
CREATE OR REPLACE FUNCTION trg_on_match_completed_refresh_views()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED')) THEN
        PERFORM refresh_ranking_views();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_match_refresh_rankings ON matches;
CREATE TRIGGER trg_match_refresh_rankings
AFTER UPDATE OF status ON matches
FOR EACH ROW
WHEN (NEW.status = 'COMPLETED')
EXECUTE FUNCTION trg_on_match_completed_refresh_views();
