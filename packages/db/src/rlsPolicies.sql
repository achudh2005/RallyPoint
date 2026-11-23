-- ==============================================================================
-- RallyPoint: Row Level Security (RLS) Policies
-- ==============================================================================

-- 1. Enable RLS on Players Table
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active player profiles
CREATE POLICY player_select_policy ON players
    FOR SELECT
    USING (deleted_at IS NULL OR current_setting('app.current_user_role', true) = 'ADMIN');

-- Users can only update their own linked player profile; Admins can update any
CREATE POLICY player_update_policy ON players
    FOR UPDATE
    USING (
        user_id = current_setting('app.current_user_id', true)
        OR current_setting('app.current_user_role', true) = 'ADMIN'
    )
    WITH CHECK (
        user_id = current_setting('app.current_user_id', true)
        OR current_setting('app.current_user_role', true) = 'ADMIN'
    );

-- 2. Enable RLS on MatchEvent Table
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

-- Everyone can read match events for live and completed matches
CREATE POLICY match_events_select_policy ON match_events
    FOR SELECT
    USING (true);

-- Only assigned Scorers, Umpires, or Admins can insert match events for a given match
CREATE POLICY match_events_insert_policy ON match_events
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM matches m
            WHERE m.id = match_id
              AND (
                  m.scorer_user_id = current_setting('app.current_user_id', true)
                  OR current_setting('app.current_user_role', true) IN ('ADMIN', 'UMPIRE')
              )
        )
    );

-- Forbid all UPDATE and DELETE via RLS in addition to the append-only trigger
CREATE POLICY match_events_no_update_policy ON match_events
    FOR UPDATE
    USING (false);

CREATE POLICY match_events_no_delete_policy ON match_events
    FOR DELETE
    USING (false);
