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

// Turns an existing table into a hypertable. Returns false if TimescaleDB isn't available.
// Safe to run on every startup.
export async function enableHypertable(db: Db, { table, timeColumn }: HypertableSpec): Promise<boolean> {
  if (!(await attempt(db, 'CREATE EXTENSION IF NOT EXISTS timescaledb'))) return false;
  return attempt(db,
    `SELECT create_hypertable('${ident(table)}', '${ident(timeColumn)}', if_not_exists => TRUE, migrate_data => TRUE)`);
}

export type Unit = 'hour' | 'day';

// time_bucket on TimescaleDB, date_trunc on plain Postgres.
export function bucketFloor(timescale: boolean, unit: Unit, column: string): string {
  const u = unit === 'hour' ? 'hour' : 'day'; // never taken from user text
  const col = column.split('.').map(ident).join('.'); // allows alias.column
  return timescale ? `time_bucket(INTERVAL '1 ${u}', ${col})` : `date_trunc('${u}', ${col})`;
}
