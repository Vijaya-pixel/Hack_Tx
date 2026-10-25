import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import type { Db } from '../src/db.ts';
import { bucketFloor, enableHypertable } from '../src/tigerdata.ts';

// A database that records every statement, and can be told to fail on chosen ones.
// A database that records every statement, says whether TimescaleDB is available, and can fail on chosen statements.
function recordingDb(failWhen: (sql: string) => boolean = () => false, available = true): Db & { log: string[] } {
  const log: string[] = [];
  return {
    log,
    query: async (text: string) => {
      log.push(text);
      if (failWhen(text)) throw new Error('simulated failure');
      return { rows: /pg_available_extensions/.test(text) ? [{ available }] : [] };
    },
  } as Db & { log: string[] };
}

describe('TigerData helpers', () => {
  test('enableHypertable checks availability, creates the extension, then the hypertable', async () => {
    const db = recordingDb();
    assert.equal(await enableHypertable(db, { table: 'readings', timeColumn: 'ts' }), true);
    assert.equal(db.log.length, 3);
    assert.match(db.log[0], /pg_available_extensions/);
    assert.match(db.log[1], /CREATE EXTENSION IF NOT EXISTS timescaledb/);
    assert.match(db.log[2], /create_hypertable\('readings', 'ts', if_not_exists => TRUE/);
  });

  test('without TimescaleDB it only asks, sends no failing statement, and returns false', async () => {
    const db = recordingDb(() => false, false);
    assert.equal(await enableHypertable(db, { table: 'readings', timeColumn: 'ts' }), false);
    assert.equal(db.log.length, 1);
  });

  test('available but not allowed to create it (permissions) also returns false', async () => {
    const db = recordingDb((sql) => /CREATE EXTENSION/.test(sql));
    assert.equal(await enableHypertable(db, { table: 'readings', timeColumn: 'ts' }), false);
    assert.equal(db.log.length, 2);
  });

  test('a failing create_hypertable also returns false', async () => {
    const db = recordingDb((sql) => /create_hypertable/.test(sql));
    assert.equal(await enableHypertable(db, { table: 'readings', timeColumn: 'ts' }), false);
  });

  test('unsafe table or column names are rejected before any SQL is sent', async () => {
    const okDb = recordingDb();
    for (const spec of [
      { table: "x'); DROP TABLE users; --", timeColumn: 'ts' },
      { table: 'readings', timeColumn: 'ts, evil' },
      { table: 'Readings', timeColumn: 'ts' },
    ]) {
      await assert.rejects(() => enableHypertable(okDb, spec), /safe SQL identifier/);
    }
    assert.equal(okDb.log.filter((s) => /create_hypertable/.test(s)).length, 0);
  });

  test('on a real Postgres engine (no TimescaleDB) it reports false and the table still works', async () => {
    const pg = new PGlite();
    await pg.query('CREATE TABLE readings (ts timestamptz NOT NULL, v real NOT NULL)');
    const db: Db = { query: (text, params) => pg.query(text, params as unknown[]) as never };
    assert.equal(await enableHypertable(db, { table: 'readings', timeColumn: 'ts' }), false);
    await pg.query("INSERT INTO readings VALUES ('2026-10-24T09:10:00Z', 0.2), ('2026-10-24T09:50:00Z', 0.4)");
    const sql = `SELECT ${bucketFloor(false, 'hour', 'ts')} AS b, avg(v)::float8 AS a FROM readings GROUP BY b`;
    const { rows } = await pg.query<{ a: number }>(sql);
    assert.equal(rows.length, 1);
    assert.ok(Math.abs(rows[0].a - 0.3) < 1e-6);
  });

  test('bucketFloor picks time_bucket or date_trunc and never trusts the unit or column', () => {
    assert.equal(bucketFloor(true, 'day', 'ts'), "time_bucket(INTERVAL '1 day', ts)");
    assert.equal(bucketFloor(true, 'hour', 'r.ts'), "time_bucket(INTERVAL '1 hour', r.ts)");
    assert.equal(bucketFloor(false, 'day', 'ts'), "date_trunc('day', ts)");
    assert.equal(bucketFloor(true, "day'; DROP TABLE x; --" as never, 'ts'), "time_bucket(INTERVAL '1 day', ts)");
    assert.throws(() => bucketFloor(true, 'day', 'ts; DROP TABLE x'), /safe SQL identifier/);
  });
});
