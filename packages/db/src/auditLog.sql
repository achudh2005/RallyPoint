-- RallyPoint Audit Log Schema & Automatic Triggers
-- Captures who changed what (table, row id, action, old/new JSONB, user, timestamp)

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('cuid_' || substr(md5(random()::text || clock_timestamp()::text), 1, 24)),
    table_name VARCHAR(64) NOT NULL,
    row_id VARCHAR(128) NOT NULL,
    action VARCHAR(10) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    changed_by VARCHAR(128) NOT NULL DEFAULT 'SYSTEM',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_row ON audit_logs (table_name, row_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- Generic Audit Trigger Function
CREATE OR REPLACE FUNCTION trg_audit_log_capture()
RETURNS TRIGGER AS $$
DECLARE
    v_user VARCHAR(128);
    v_row_id VARCHAR(128);
    v_log_id TEXT;
BEGIN
    v_log_id := 'cuid_' || substr(md5(random()::text || clock_timestamp()::text), 1, 24);
    -- Extract active user from session setting or default to 'SYSTEM'
    BEGIN
        v_user := COALESCE(current_setting('app.current_user_id', true), 'SYSTEM');
    EXCEPTION WHEN OTHERS THEN
        v_user := 'SYSTEM';
    END;

    IF (TG_OP = 'INSERT') THEN
        v_row_id := NEW.id::text;
        INSERT INTO audit_logs (id, table_name, row_id, action, old_data, new_data, changed_by, created_at)
        VALUES (v_log_id, TG_TABLE_NAME, v_row_id, 'INSERT', NULL, to_jsonb(NEW), v_user, NOW());
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_row_id := NEW.id::text;
        INSERT INTO audit_logs (id, table_name, row_id, action, old_data, new_data, changed_by, created_at)
        VALUES (v_log_id, TG_TABLE_NAME, v_row_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_user, NOW());
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        v_row_id := OLD.id::text;
        INSERT INTO audit_logs (id, table_name, row_id, action, old_data, new_data, changed_by, created_at)
        VALUES (v_log_id, TG_TABLE_NAME, v_row_id, 'DELETE', to_jsonb(OLD), NULL, v_user, NOW());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply Audit Trigger to all Master Data Tables
DROP TRIGGER IF EXISTS audit_users_trigger ON users;
CREATE TRIGGER audit_users_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION trg_audit_log_capture();

DROP TRIGGER IF EXISTS audit_players_trigger ON players;
CREATE TRIGGER audit_players_trigger
AFTER INSERT OR UPDATE OR DELETE ON players
FOR EACH ROW EXECUTE FUNCTION trg_audit_log_capture();

DROP TRIGGER IF EXISTS audit_clubs_trigger ON clubs;
CREATE TRIGGER audit_clubs_trigger
AFTER INSERT OR UPDATE OR DELETE ON clubs
FOR EACH ROW EXECUTE FUNCTION trg_audit_log_capture();

DROP TRIGGER IF EXISTS audit_teams_trigger ON teams;
CREATE TRIGGER audit_teams_trigger
AFTER INSERT OR UPDATE OR DELETE ON teams
FOR EACH ROW EXECUTE FUNCTION trg_audit_log_capture();

DROP TRIGGER IF EXISTS audit_venues_trigger ON venues;
CREATE TRIGGER audit_venues_trigger
AFTER INSERT OR UPDATE OR DELETE ON venues
FOR EACH ROW EXECUTE FUNCTION trg_audit_log_capture();

DROP TRIGGER IF EXISTS audit_courts_trigger ON courts;
CREATE TRIGGER audit_courts_trigger
AFTER INSERT OR UPDATE OR DELETE ON courts
FOR EACH ROW EXECUTE FUNCTION trg_audit_log_capture();

DROP TRIGGER IF EXISTS audit_tournaments_trigger ON tournaments;
CREATE TRIGGER audit_tournaments_trigger
AFTER INSERT OR UPDATE OR DELETE ON tournaments
FOR EACH ROW EXECUTE FUNCTION trg_audit_log_capture();
