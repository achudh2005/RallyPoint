-- ==============================================================================
-- RallyPoint: Layer 3 Derived Analytics Rollups & Event Sourcing Projections
-- ==============================================================================

-- 1. Function to Recalculate Career Stats for a given Player from Raw Events & Matches
CREATE OR REPLACE FUNCTION rebuild_player_stats(p_id TEXT)
RETURNS VOID AS $$
DECLARE
    m_played INT := 0;
    m_won INT := 0;
    m_lost INT := 0;
    g_won INT := 0;
    g_lost INT := 0;
    pts_won INT := 0;
    pts_lost INT := 0;
    w_rate FLOAT := 0.0;
    c_streak INT := 0;
    b_streak INT := 0;
    temp_streak INT := 0;
    last_match_date TIMESTAMPTZ := NULL;
    match_rec RECORD;
BEGIN
    -- Query completed matches involving this player ordered by completion date
    FOR match_rec IN
        SELECT m.id, m.winner_side, m.ended_at, mp.side AS player_side
        FROM matches m
        JOIN match_participants mp ON mp.match_id = m.id
        WHERE mp.player_id = p_id
          AND m.status = 'COMPLETED'
        ORDER BY m.ended_at ASC
    LOOP
        m_played := m_played + 1;
        last_match_date := match_rec.ended_at;

        IF match_rec.winner_side IS NOT NULL AND match_rec.winner_side = match_rec.player_side THEN
            m_won := m_won + 1;
            temp_streak := temp_streak + 1;
            IF temp_streak > b_streak THEN
                b_streak := temp_streak;
            END IF;
        ELSE
            m_lost := m_lost + 1;
            temp_streak := 0;
        END IF;

        -- Games won and lost in this match
        SELECT
            COALESCE(SUM(CASE WHEN g.winner_side = match_rec.player_side THEN 1 ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN g.winner_side IS NOT NULL AND g.winner_side != match_rec.player_side THEN 1 ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN match_rec.player_side = 'A' THEN g.score_a ELSE g.score_b END), 0),
            COALESCE(SUM(CASE WHEN match_rec.player_side = 'A' THEN g.score_b ELSE g.score_a END), 0)
        INTO g_won, g_lost, pts_won, pts_lost
        FROM games g
        WHERE g.match_id = match_rec.id;
    END LOOP;

    c_streak := temp_streak;
    IF m_played > 0 THEN
        w_rate := ROUND((m_won::NUMERIC / m_played::NUMERIC) * 100.0, 2);
    END IF;

    -- Upsert into player_career_stats
    INSERT INTO player_career_stats (
        player_id, matches_played, matches_won, matches_lost,
        games_won, games_lost, points_won, points_lost,
        win_rate, current_streak, best_streak, last_played_at, updated_at
    ) VALUES (
        p_id, m_played, m_won, m_lost,
        g_won, g_lost, pts_won, pts_lost,
        w_rate, c_streak, b_streak, last_match_date, NOW()
    )
    ON CONFLICT (player_id) DO UPDATE SET
        matches_played = EXCLUDED.matches_played,
        matches_won = EXCLUDED.matches_won,
        matches_lost = EXCLUDED.matches_lost,
        games_won = EXCLUDED.games_won,
        games_lost = EXCLUDED.games_lost,
        points_won = EXCLUDED.points_won,
        points_lost = EXCLUDED.points_lost,
        win_rate = EXCLUDED.win_rate,
        current_streak = EXCLUDED.current_streak,
        best_streak = EXCLUDED.best_streak,
        last_played_at = EXCLUDED.last_played_at,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger on Match Completion to Refresh Player Rollups
CREATE OR REPLACE FUNCTION on_match_completed_trigger()
RETURNS TRIGGER AS $$
DECLARE
    participant_rec RECORD;
BEGIN
    IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
        FOR participant_rec IN
            SELECT player_id FROM match_participants WHERE match_id = NEW.id
        LOOP
            PERFORM rebuild_player_stats(participant_rec.player_id);
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_match_completed_rollups ON matches;
CREATE TRIGGER trg_match_completed_rollups
AFTER UPDATE OF status ON matches
FOR EACH ROW
EXECUTE FUNCTION on_match_completed_trigger();
