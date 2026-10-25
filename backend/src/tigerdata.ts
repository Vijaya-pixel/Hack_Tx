// TigerData (TimescaleDB) helpers. Nothing here knows about a specific app's tables.
//
//   hypertable     a table partitioned by time; use it for anything that is a stream of readings
//   time_bucket    groups readings into hours or days (date_trunc is the plain-Postgres fallback)
//
// On plain Postgres (the test database has no TimescaleDB) enableHypertable() reports false and the
// app keeps working without the time-series features.
import type { Db } from './db.ts';

export interface HypertableSpec { table: string; timeColumn: string }

// Identifiers can't be passed as query parameters, so they are checked instead.
const IDENT = /^[a-z_][a-z0-9_]*$/;
const ident = (s: string): string => {
  if (!IDENT.test(s)) throw new Error(`Not a safe SQL identifier: ${s}`);
  return s;
};

const attempt = async (db: Db, sql: string): Promise<boolean> => {
  try { await db.query(sql); return true; } catch { return false; }
};

// True if the server offers the TimescaleDB extension (TigerData services do). Never throws.
export async function timescaleAvailable(db: Db): Promise<boolean> {
  try {
    const { rows } = await db.query<{ available: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'timescaledb') AS available");
    return rows[0]?.available === true;
  } catch { return false; }
}

// Turns an existing table into a hypertable. Returns false if TimescaleDB isn't available.
// Safe to run on every startup.
export async function enableHypertable(db: Db, { table, timeColumn }: HypertableSpec): Promise<boolean> {
  // Ask first, so a database without TimescaleDB never sees a failing statement (failed statements make
  // some connection pools drop and reopen the connection).
  if (!(await timescaleAvailable(db))) return false;
  if (!(await attempt(db, 'CREATE EXTENSION IF NOT EXISTS timescaledb'))) return false;
  return attempt(db,
    `SELECT create_hypertable('${ident(table)}', '${ident(timeColumn)}', if_not_exists => TRUE, migrate_data => TRUE)`);
}

export type Unit = 'hour' | 'day' | 'week';

// time_bucket on TimescaleDB, date_trunc on plain Postgres.
export function bucketFloor(timescale: boolean, unit: Unit, column: string): string {
  const u = unit === 'hour' ? 'hour' : unit === 'week' ? 'week' : 'day'; // never taken from user text
  const col = column.split('.').map(ident).join('.'); // allows alias.column
  return timescale ? `time_bucket(INTERVAL '1 ${u}', ${col})` : `date_trunc('${u}', ${col})`;
}

export interface ContinuousAggregateSpec {
  view: string;
  // The SELECT behind the view. It must group by time_bucket(...) and is written by the app, never taken from users.
  query: string;
  startOffset?: string;      // how far back the policy refreshes, e.g. '3 months'
  endOffset?: string;        // how close to now it stops, e.g. '1 hour'
  scheduleInterval?: string; // how often it runs, e.g. '1 hour'
}

const INTERVAL = /^\d+ (minute|hour|day|week|month)s?$/;
const interval = (s: string): string => {
  if (!INTERVAL.test(s)) throw new Error(`Not a safe interval: ${s}`);
  return s;
};

// Creates a continuous aggregate (a materialized view TimescaleDB keeps up to date) and its refresh policy.
// materialized_only = false makes it include rows newer than the last refresh, so live inserts show up at once.
// Safe to run on every startup. Returns false if TimescaleDB refuses either statement.
export async function createContinuousAggregate(db: Db, spec: ContinuousAggregateSpec): Promise<boolean> {
  const view = ident(spec.view);
  const start = interval(spec.startOffset ?? '3 months');
  const end = interval(spec.endOffset ?? '1 hour');
  const every = interval(spec.scheduleInterval ?? '1 hour');
  const created = await attempt(db,
    `CREATE MATERIALIZED VIEW IF NOT EXISTS ${view} WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS ${spec.query} WITH NO DATA`);
  if (!created) return false;
  return attempt(db,
    `SELECT add_continuous_aggregate_policy('${view}', start_offset => INTERVAL '${start}', end_offset => INTERVAL '${end}', schedule_interval => INTERVAL '${every}', if_not_exists => TRUE)`);
}

// Fills the whole aggregate from the raw table once (used after seeding).
export async function refreshContinuousAggregate(db: Db, view: string): Promise<boolean> {
  return attempt(db, `CALL refresh_continuous_aggregate('${ident(view)}', NULL, NULL)`);
}
