// =====================================================================================
// TigerData (TimescaleDB) in Four Corners: everything specific to it lives in this file.
//
// What we use, and why:
//   hypertable            fc_score_events is partitioned by time. Every time a group's best plan
//                         changes we write one row, so "how likely is this trip to happen" becomes
//                         a time series we can chart and query.
//   time_bucket           groups those readings into hours or days.
//   continuous aggregate  fc_score_daily keeps a daily rollup (average, best, count) up to date
//                         automatically, so the chart doesn't rescan raw rows.
//   hyperfunctions        first(), last() and time_bucket_gapfill() with locf() answer questions like
//                         "what was the score when the day opened and closed?" and "fill the gaps".
//
// On plain Postgres (the test database has no TimescaleDB) the app still works: it skips the
// hypertable and uses date_trunc instead of time_bucket. See enableTimescale().
//
// The same SQL is exported to backend/tigerdata/schema.sql (npm run schema:export) so it can be
// read, or pasted into the TigerData console, without opening any TypeScript.
// =====================================================================================
import type { Db } from './db.ts';

// ---- 1. Ordinary tables: live app state ------------------------------------------------------
export const TABLES: string[] = [
  `CREATE TABLE IF NOT EXISTS fc_groups (
     code text PRIMARY KEY, name text NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now(), pact jsonb)`,
  `CREATE TABLE IF NOT EXISTS fc_members (
     seq bigserial, id text PRIMARY KEY,
     group_code text NOT NULL REFERENCES fc_groups(code) ON DELETE CASCADE,
     token text NOT NULL, name text NOT NULL, describe text NOT NULL, city text NOT NULL,
     lat double precision NOT NULL, lon double precision NOT NULL, vibe text NOT NULL,
     traits jsonb NOT NULL, max_travel_hours double precision NOT NULL DEFAULT 8,
     is_demo boolean NOT NULL DEFAULT false, joined_at timestamptz NOT NULL DEFAULT now())`,
  'CREATE INDEX IF NOT EXISTS fc_members_group ON fc_members (group_code, seq)',
  `CREATE TABLE IF NOT EXISTS fc_availability (
     member_id text NOT NULL REFERENCES fc_members(id) ON DELETE CASCADE,
     weekend date NOT NULL, PRIMARY KEY (member_id, weekend))`,
  `CREATE TABLE IF NOT EXISTS fc_feed (
     id bigserial PRIMARY KEY,
     group_code text NOT NULL REFERENCES fc_groups(code) ON DELETE CASCADE,
     at timestamptz NOT NULL DEFAULT now(), system boolean NOT NULL DEFAULT false,
     from_member text, name text, text text NOT NULL)`,
  'CREATE INDEX IF NOT EXISTS fc_feed_group ON fc_feed (group_code, id)',
  `CREATE TABLE IF NOT EXISTS fc_stamps (
     id bigserial PRIMARY KEY,
     group_code text NOT NULL REFERENCES fc_groups(code) ON DELETE CASCADE,
     record jsonb NOT NULL, at timestamptz NOT NULL DEFAULT now())`,
  // The time series. No foreign key, because hypertables work best without them.
  `CREATE TABLE IF NOT EXISTS fc_score_events (
     time timestamptz NOT NULL, group_code text NOT NULL, city text, weekend date, nights int,
     survival real NOT NULL, reason text NOT NULL, seeded boolean NOT NULL DEFAULT false)`,
  'CREATE INDEX IF NOT EXISTS fc_score_events_group_time ON fc_score_events (group_code, time DESC)',
];

// ---- 2. TimescaleDB: hypertable ---------------------------------------------------------------
// Each statement runs on its own: continuous aggregates can't be created inside a transaction.
export const HYPERTABLE_STEPS: string[] = [
  'CREATE EXTENSION IF NOT EXISTS timescaledb',
  "SELECT create_hypertable('fc_score_events', 'time', if_not_exists => TRUE, migrate_data => TRUE)",
];

// ---- 3. TimescaleDB: continuous aggregate with a refresh policy -------------------------------
export const CONTINUOUS_AGGREGATE_STEPS: string[] = [
  `CREATE MATERIALIZED VIEW IF NOT EXISTS fc_score_daily
     WITH (timescaledb.continuous) AS
     SELECT time_bucket(INTERVAL '1 day', time) AS bucket, group_code,
            avg(survival) AS avg_survival, max(survival) AS best_survival, count(*) AS samples
     FROM fc_score_events GROUP BY bucket, group_code WITH NO DATA`,
  `SELECT add_continuous_aggregate_policy('fc_score_daily',
     start_offset => INTERVAL '60 days', end_offset => INTERVAL '1 hour',
     schedule_interval => INTERVAL '1 hour', if_not_exists => TRUE)`,
];

export interface TimescaleStatus {
  /** TimescaleDB is active: fc_score_events is a hypertable and time_bucket() is available. */
  timescale: boolean;
  /** The daily continuous aggregate fc_score_daily exists. */
  continuousAggregate: boolean;
}

const attempt = async (db: Db, sql: string): Promise<boolean> => {
  try { await db.query(sql); return true; } catch { return false; }
};

// Turns the time-series features on if the database supports them; otherwise reports plain Postgres.
export async function enableTimescale(db: Db): Promise<TimescaleStatus> {
  for (const sql of HYPERTABLE_STEPS) {
    if (!(await attempt(db, sql))) return { timescale: false, continuousAggregate: false };
  }
  for (const sql of CONTINUOUS_AGGREGATE_STEPS) {
    if (!(await attempt(db, sql))) return { timescale: true, continuousAggregate: false };
  }
  return { timescale: true, continuousAggregate: true };
}

// ---- 4. Bucketing: time_bucket on TimescaleDB, date_trunc on plain Postgres -------------------
export type Unit = 'hour' | 'day';

export function bucketFloor(timescale: boolean, unit: Unit, column = 'time'): string {
  const u = unit === 'hour' ? 'hour' : 'day'; // never taken from user text
  return timescale ? `time_bucket(INTERVAL '1 ${u}', ${column})` : `date_trunc('${u}', ${column})`;
}

// ---- 5. Showcase queries: run these in the TigerData console during the demo -------------------
// Replace YOURCODE with a group's invite code (SELECT code FROM fc_groups;).
export interface ShowcaseQuery { title: string; why: string; sql: string }

export const SHOWCASE_QUERIES: ShowcaseQuery[] = [
  {
    title: 'Is the score a hypertable?',
    why: 'Confirms TimescaleDB is on and shows how the time series is partitioned.',
    sql: `SELECT hypertable_name, num_chunks, compression_enabled
FROM timescaledb_information.hypertables;`,
  },
  {
    title: 'Daily trip health with time_bucket',
    why: 'The same query the /trend endpoint runs: one point per day.',
    sql: `SELECT time_bucket(INTERVAL '1 day', time) AS day,
       round(avg(survival)::numeric, 2) AS avg_score,
       round(max(survival)::numeric, 2) AS best_score,
       count(*) AS readings
FROM fc_score_events
WHERE group_code = 'YOURCODE'
GROUP BY day ORDER BY day;`,
  },
  {
    title: 'Opening and closing score each day (first and last)',
    why: 'TimescaleDB hyperfunctions: first() and last() pick the earliest and latest reading in each bucket.',
    sql: `SELECT time_bucket(INTERVAL '1 day', time) AS day,
       first(survival, time) AS opening,
       last(survival, time) AS closing
FROM fc_score_events
WHERE group_code = 'YOURCODE'
GROUP BY day ORDER BY day;`,
  },
  {
    title: 'Fill the gaps (time_bucket_gapfill and locf)',
    why: 'Days with no reading carry the last known score forward, so a chart has no holes.',
    sql: `SELECT time_bucket_gapfill(INTERVAL '1 day', time, now() - INTERVAL '14 days', now()) AS day,
       locf(avg(survival)) AS score
FROM fc_score_events
WHERE group_code = 'YOURCODE' AND time > now() - INTERVAL '14 days' AND time <= now()
GROUP BY day ORDER BY day;`,
  },
  {
    title: 'Read the continuous aggregate',
    why: 'fc_score_daily is maintained by TimescaleDB itself; refresh it once to see data right away.',
    sql: `CALL refresh_continuous_aggregate('fc_score_daily', NULL, NULL);
SELECT bucket, round(avg_survival::numeric, 2) AS avg_score, best_survival, samples
FROM fc_score_daily
WHERE group_code = 'YOURCODE'
ORDER BY bucket;`,
  },
  {
    title: 'Which readings are demo data?',
    why: 'Seeded history is flagged so it is never mistaken for real activity.',
    sql: `SELECT seeded, count(*) AS readings, min(time) AS first_reading, max(time) AS last_reading
FROM fc_score_events
WHERE group_code = 'YOURCODE'
GROUP BY seeded;`,
  },
];

// ---- 6. Readable copy of all of the above (written to backend/tigerdata/schema.sql) -----------
const asStatements = (list: string[]): string => list.map((s) => `${s.trim()};`).join('\n\n');

export function renderSchemaSql(): string {
  return [
    '-- Four Corners on TigerData (TimescaleDB).',
    '-- GENERATED from backend/src/tigerdata.ts by `npm run schema:export`. Edit that file, not this one.',
    '-- The app runs all of this automatically on startup; this copy is for reading and for the console.',
    '',
    '-- 1. Tables for live app state, and the time series table',
    asStatements(TABLES),
    '',
    '-- 2. Turn fc_score_events into a hypertable (needs TimescaleDB)',
    asStatements(HYPERTABLE_STEPS),
    '',
    '-- 3. Daily rollup that TimescaleDB keeps up to date by itself',
    asStatements(CONTINUOUS_AGGREGATE_STEPS),
    '',
    '-- 4. Showcase queries to run live. Replace YOURCODE with a group code.',
    ...SHOWCASE_QUERIES.map((q) => `\n-- ${q.title}\n-- ${q.why}\n${q.sql.trim()}`),
    '',
  ].join('\n');
}
