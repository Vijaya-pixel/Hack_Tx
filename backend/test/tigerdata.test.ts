import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import type { Db } from '../src/db.ts';
import { createPostgresStore } from '../src/pgstore.ts';
import {
  TABLES, HYPERTABLE_STEPS, CONTINUOUS_AGGREGATE_STEPS, SHOWCASE_QUERIES,
  bucketFloor, enableTimescale, renderSchemaSql,
} from '../src/tigerdata.ts';

const here = path.dirname(fileURLToPath(import.meta.url));

// A database that records every statement, and can be told to fail on chosen ones.
function recordingDb(failWhen: (sql: string) => boolean = () => false): Db & { log: string[] } {
  const log: string[] = [];
  return {
    log,
    query: async (text: string) => {
      log.push(text);
      if (failWhen(text)) throw new Error('simulated failure');
      return { rows: [] };
    },
  } as Db & { log: string[] };
}

describe('TigerData module', () => {
  test('backend/tigerdata/schema.sql matches the code (run `npm run schema:export` if this fails)', () => {
    const onDisk = fs.readFileSync(path.join(here, '..', 'tigerdata', 'schema.sql'), 'utf8');
    assert.equal(onDisk, renderSchemaSql());
  });

  test('the tables create cleanly on a real Postgres engine, and twice in a row', async () => {
    const db = new PGlite();
    for (let i = 0; i < 2; i++) for (const sql of TABLES) await db.query(sql);
    const { rows } = await db.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'fc\\_%' ORDER BY 1");
    assert.deepEqual(rows.map((r) => r.table_name),
      ['fc_availability', 'fc_feed', 'fc_groups', 'fc_members', 'fc_score_events', 'fc_stamps']);
  });

  test('bucketFloor uses time_bucket on TimescaleDB and date_trunc on plain Postgres', () => {
    assert.equal(bucketFloor(true, 'day'), "time_bucket(INTERVAL '1 day', time)");
    assert.equal(bucketFloor(true, 'hour'), "time_bucket(INTERVAL '1 hour', time)");
    assert.equal(bucketFloor(false, 'day'), "date_trunc('day', time)");
    assert.equal(bucketFloor(false, 'hour', 't.at'), "date_trunc('hour', t.at)");
    assert.equal(bucketFloor(true, "day'; DROP TABLE x; --" as never), "time_bucket(INTERVAL '1 day', time)", 'unit is never trusted');
  });

  test('enableTimescale: everything succeeds', async () => {
    const db = recordingDb();
    assert.deepEqual(await enableTimescale(db), { timescale: true, continuousAggregate: true });
    assert.equal(db.log.length, HYPERTABLE_STEPS.length + CONTINUOUS_AGGREGATE_STEPS.length);
    assert.match(db.log[0], /CREATE EXTENSION IF NOT EXISTS timescaledb/);
    assert.match(db.log[1], /create_hypertable\('fc_score_events', 'time'/);
  });

  test('enableTimescale: no TimescaleDB means plain Postgres, and it stops trying', async () => {
    const db = recordingDb((sql) => /CREATE EXTENSION/.test(sql));
    assert.deepEqual(await enableTimescale(db), { timescale: false, continuousAggregate: false });
    assert.equal(db.log.length, 1, 'does not keep issuing Timescale statements');
  });

  test('enableTimescale: hypertable works but the continuous aggregate fails, so only the rollup is lost', async () => {
    const db = recordingDb((sql) => /MATERIALIZED VIEW/.test(sql));
    assert.deepEqual(await enableTimescale(db), { timescale: true, continuousAggregate: false });
  });

  test('the store switches its trend SQL to time_bucket exactly when TimescaleDB is on', async () => {
    const withTs = recordingDb();
    const a = createPostgresStore(withTs);
    await a.init();
    assert.equal(a.timescale, true);
    assert.equal(a.continuousAggregate, true);
    await a.scoreTrend('ABC123');
    assert.match(withTs.log.at(-1) ?? '', /time_bucket\(INTERVAL '1 day', time\)/);

    const withoutTs = recordingDb((sql) => /CREATE EXTENSION/.test(sql));
    const b = createPostgresStore(withoutTs);
    await b.init();
    assert.equal(b.timescale, false);
    await b.scoreTrend('ABC123', 'hour');
    assert.match(withoutTs.log.at(-1) ?? '', /date_trunc\('hour', time\)/);
    assert.doesNotMatch(withoutTs.log.at(-1) ?? '', /time_bucket/);
  });

  test('showcase queries: unique titles, each says why, and each (except the hypertable check) takes a group code', () => {
    const titles = SHOWCASE_QUERIES.map((q) => q.title);
    assert.equal(new Set(titles).size, titles.length);
    for (const q of SHOWCASE_QUERIES) {
      assert.ok(q.why.length > 10, `${q.title} explains itself`);
      assert.ok(q.sql.trim().endsWith(';'), `${q.title} ends with a semicolon`);
      if (!/hypertables/.test(q.sql)) assert.match(q.sql, /YOURCODE/, `${q.title} uses a placeholder`);
    }
    const all = SHOWCASE_QUERIES.map((q) => q.sql).join('\n');
    for (const feature of ['time_bucket(', 'first(survival, time)', 'last(survival, time)', 'time_bucket_gapfill(', 'locf(', 'fc_score_daily']) {
      assert.ok(all.includes(feature), `showcases ${feature}`);
    }
  });
});
