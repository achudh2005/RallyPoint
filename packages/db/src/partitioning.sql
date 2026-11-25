-- ==============================================================================
-- RallyPoint: MatchEvent Partitioning & Append-Only Trigger Definition
-- ==============================================================================

-- 1. Trigger Function to Prevent UPDATE or DELETE on MatchEvent
CREATE OR REPLACE FUNCTION enforce_match_events_append_only()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'MatchEvent is strictly append-only. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_match_events_append_only ON match_events;
CREATE TRIGGER trg_match_events_append_only
BEFORE UPDATE OR DELETE ON match_events
FOR EACH ROW EXECUTE FUNCTION enforce_match_events_append_only();

-- 1b. Enforce non-negative scores on games
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_games_non_negative_scores') THEN
        ALTER TABLE games ADD CONSTRAINT chk_games_non_negative_scores CHECK (score_a >= 0 AND score_b >= 0);
    END IF;
END $$;

-- 2. Declarative Monthly Partition Table Creation Helper
CREATE OR REPLACE FUNCTION create_monthly_match_events_partition(target_date DATE)
RETURNS TEXT AS $$
DECLARE
    start_date DATE := date_trunc('month', target_date);
    end_date DATE := start_date + INTERVAL '1 month';
    partition_name TEXT := 'match_events_' || to_char(start_date, 'YYYY_MM');
    sql_stmt TEXT;
BEGIN
    -- Check if table exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name
    ) THEN
        sql_stmt := format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF match_events
             FOR VALUES FROM (%L) TO (%L);',
            partition_name, start_date, end_date
        );
        EXECUTE sql_stmt;
        RETURN 'Created partition ' || partition_name;
    ELSE
        RETURN 'Partition ' || partition_name || ' already exists';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Procedure to Ensure Partitions for Current Month + Next 6 Months
CREATE OR REPLACE PROCEDURE ensure_future_match_event_partitions(months_ahead INT DEFAULT 6)
LANGUAGE plpgsql AS $$
DECLARE
    curr_month DATE := date_trunc('month', CURRENT_DATE);
    i INT;
BEGIN
    FOR i IN 0..months_ahead LOOP
        PERFORM create_monthly_match_events_partition(curr_month + (i || ' month')::INTERVAL);
    END LOOP;
END;
$$;
