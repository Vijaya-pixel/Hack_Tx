-- Four Corners on TigerData (TimescaleDB).
-- GENERATED from backend/src/tigerdata.ts by `npm run schema:export`. Edit that file, not this one.
-- The app runs all of this automatically on startup; this copy is for reading and for the console.

-- 1. Tables for live app state, and the time series table
CREATE TABLE IF NOT EXISTS fc_groups (
     code text PRIMARY KEY, name text NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now(), pact jsonb);

CREATE TABLE IF NOT EXISTS fc_members (
     seq bigserial, id text PRIMARY KEY,
     group_code text NOT NULL REFERENCES fc_groups(code) ON DELETE CASCADE,
     token text NOT NULL, name text NOT NULL, describe text NOT NULL, city text NOT NULL,
     lat double precision NOT NULL, lon double precision NOT NULL, vibe text NOT NULL,
     traits jsonb NOT NULL, max_travel_hours double precision NOT NULL DEFAULT 8,
     is_demo boolean NOT NULL DEFAULT false, joined_at timestamptz NOT NULL DEFAULT now());

CREATE INDEX IF NOT EXISTS fc_members_group ON fc_members (group_code, seq);

CREATE TABLE IF NOT EXISTS fc_availability (
     member_id text NOT NULL REFERENCES fc_members(id) ON DELETE CASCADE,
     weekend date NOT NULL, PRIMARY KEY (member_id, weekend));

CREATE TABLE IF NOT EXISTS fc_feed (
     id bigserial PRIMARY KEY,
     group_code text NOT NULL REFERENCES fc_groups(code) ON DELETE CASCADE,
     at timestamptz NOT NULL DEFAULT now(), system boolean NOT NULL DEFAULT false,
     from_member text, name text, text text NOT NULL);

CREATE INDEX IF NOT EXISTS fc_feed_group ON fc_feed (group_code, id);

CREATE TABLE IF NOT EXISTS fc_stamps (
     id bigserial PRIMARY KEY,
     group_code text NOT NULL REFERENCES fc_groups(code) ON DELETE CASCADE,
     record jsonb NOT NULL, at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS fc_score_events (
     time timestamptz NOT NULL, group_code text NOT NULL, city text, weekend date, nights int,
     survival real NOT NULL, reason text NOT NULL, seeded boolean NOT NULL DEFAULT false);

CREATE INDEX IF NOT EXISTS fc_score_events_group_time ON fc_score_events (group_code, time DESC);

-- 2. Turn fc_score_events into a hypertable (needs TimescaleDB)
CREATE EXTENSION IF NOT EXISTS timescaledb;

SELECT create_hypertable('fc_score_events', 'time', if_not_exists => TRUE, migrate_data => TRUE);

-- 3. Daily rollup that TimescaleDB keeps up to date by itself
CREATE MATERIALIZED VIEW IF NOT EXISTS fc_score_daily
     WITH (timescaledb.continuous) AS
     SELECT time_bucket(INTERVAL '1 day', time) AS bucket, group_code,
            avg(survival) AS avg_survival, max(survival) AS best_survival, count(*) AS samples
     FROM fc_score_events GROUP BY bucket, group_code WITH NO DATA;

SELECT add_continuous_aggregate_policy('fc_score_daily',
     start_offset => INTERVAL '60 days', end_offset => INTERVAL '1 hour',
     schedule_interval => INTERVAL '1 hour', if_not_exists => TRUE);

-- 4. Showcase queries to run live. Replace YOURCODE with a group code.

-- Is the score a hypertable?
-- Confirms TimescaleDB is on and shows how the time series is partitioned.
SELECT hypertable_name, num_chunks, compression_enabled
FROM timescaledb_information.hypertables;

-- Daily trip health with time_bucket
-- The same query the /trend endpoint runs: one point per day.
SELECT time_bucket(INTERVAL '1 day', time) AS day,
       round(avg(survival)::numeric, 2) AS avg_score,
       round(max(survival)::numeric, 2) AS best_score,
       count(*) AS readings
FROM fc_score_events
WHERE group_code = 'YOURCODE'
GROUP BY day ORDER BY day;

-- Opening and closing score each day (first and last)
-- TimescaleDB hyperfunctions: first() and last() pick the earliest and latest reading in each bucket.
SELECT time_bucket(INTERVAL '1 day', time) AS day,
       first(survival, time) AS opening,
       last(survival, time) AS closing
FROM fc_score_events
WHERE group_code = 'YOURCODE'
GROUP BY day ORDER BY day;

-- Fill the gaps (time_bucket_gapfill and locf)
-- Days with no reading carry the last known score forward, so a chart has no holes.
SELECT time_bucket_gapfill(INTERVAL '1 day', time, now() - INTERVAL '14 days', now()) AS day,
       locf(avg(survival)) AS score
FROM fc_score_events
WHERE group_code = 'YOURCODE' AND time > now() - INTERVAL '14 days' AND time <= now()
GROUP BY day ORDER BY day;

-- Read the continuous aggregate
-- fc_score_daily is maintained by TimescaleDB itself; refresh it once to see data right away.
CALL refresh_continuous_aggregate('fc_score_daily', NULL, NULL);
SELECT bucket, round(avg_survival::numeric, 2) AS avg_score, best_survival, samples
FROM fc_score_daily
WHERE group_code = 'YOURCODE'
ORDER BY bucket;

-- Which readings are demo data?
-- Seeded history is flagged so it is never mistaken for real activity.
SELECT seeded, count(*) AS readings, min(time) AS first_reading, max(time) AS last_reading
FROM fc_score_events
WHERE group_code = 'YOURCODE'
GROUP BY seeded;
