import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { apiSuite } from './api.suite.ts';
import { createPostgresStore, type Db } from '../src/pgstore.ts';

// PGlite is a real Postgres engine that runs in-process. It has no TimescaleDB, so these tests
// exercise the plain-Postgres path; the hypertable and continuous aggregate steps are covered separately.
export function pgliteDb(db = new PGlite()): Db {
  return {
    query: (text, params) => db.query(text, params as unknown[]) as never,
    close: () => db.close(),
  };
}

apiSuite('Postgres (PGlite)', async () => createPostgresStore(pgliteDb()));

describe('Postgres store details', () => {
  const member = (id: string) => ({
    id, token: `t-${id}`, name: `N-${id}`, describe: 'd', city: 'Austin', lat: 30.2672, lon: -97.7431, vibe: 'chill',
    character: { color: 'blue', hair: 'short', accessory: 'book', mood: 'happy', pose: 'waving', title: 'the reader', tagline: 't', source: 'fallback' as const },
    maxTravelHours: 8,
  });

  test('init is safe to run twice, and reports plain Postgres when TimescaleDB is missing', async () => {
    const store = createPostgresStore(pgliteDb());
    await store.init();
    await store.init();
    assert.equal(store.timescale, false);
    assert.equal(store.continuousAggregate, false);
    await store.close();
  });

  test('data survives a restart: a second store on the same database sees the same group', async () => {
    const db = new PGlite();
    const a = createPostgresStore(pgliteDb(db));
    await a.init();
    const g = await a.createGroup('Persist');
    await a.addMember(g.code, member('m1'));
    await a.setAvailability(g.code, 'm1', ['2026-11-07', '2026-10-31'], 5);
    await a.addFeed(g.code, { at: '2026-10-24T12:00:00Z', text: 'hello', name: 'N-m1', from: 'm1' });
    await a.logScore(g.code, { time: '2026-10-24T12:00:00Z', survival: 0.5, reason: 'test' });

    const b = createPostgresStore(pgliteDb(db));
    await b.init();
    const again = await b.getGroup(g.code);
    assert.equal(again?.name, 'Persist');
    assert.equal(again?.members[0].name, 'N-m1');
    assert.equal(again?.members[0].maxTravelHours, 5);
    assert.deepEqual(again?.availability.m1, ['2026-10-31', '2026-11-07'], 'dates come back as plain YYYY-MM-DD, sorted');
    assert.equal(again?.feed[0].text, 'hello');
    assert.equal((await b.scoreTrend(g.code)).length, 1);
    await a.close();
  });

  test('deleting a group removes its members, feed, stamps and score history', async () => {
    const db = new PGlite();
    const store = createPostgresStore(pgliteDb(db));
    await store.init();
    const g = await store.createGroup('Gone');
    await store.addMember(g.code, member('m2'));
    await store.addFeed(g.code, { at: '2026-10-24T12:00:00Z', text: 'x' });
    await store.logScore(g.code, { time: '2026-10-24T12:00:00Z', survival: 0.4, reason: 'test' });
    await store.deleteGroup(g.code);
    assert.equal(await store.getGroup(g.code), null);
    for (const table of ['fc_members', 'fc_feed', 'fc_score_events', 'fc_availability']) {
      const { rows } = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${table}`);
      assert.equal(rows[0].n, 0, `${table} is empty`);
    }
  });

  test('the feed returns only the latest 50 messages, oldest first', async () => {
    const store = createPostgresStore(pgliteDb());
    await store.init();
    const g = await store.createGroup('Chatty');
    for (let i = 0; i < 60; i++) await store.addFeed(g.code, { at: '2026-10-24T12:00:00Z', text: `m${i}` });
    const feed = (await store.getGroup(g.code))?.feed ?? [];
    assert.equal(feed.length, 50);
    assert.equal(feed[0].text, 'm10');
    assert.equal(feed[49].text, 'm59');
  });

  test('hourly and daily buckets group readings correctly', async () => {
    const store = createPostgresStore(pgliteDb());
    await store.init();
    const g = await store.createGroup('Buckets');
    for (const [time, survival] of [['2026-10-24T09:10:00Z', 0.2], ['2026-10-24T09:50:00Z', 0.4], ['2026-10-24T15:00:00Z', 0.6]] as const) {
      await store.logScore(g.code, { time, survival, reason: 't' });
    }
    const hourly = await store.scoreTrend(g.code, 'hour');
    assert.deepEqual(hourly.map((p) => [p.bucket, p.avg, p.best, p.samples]),
      [['2026-10-24T09:00:00Z', 0.3, 0.4, 2], ['2026-10-24T15:00:00Z', 0.6, 0.6, 1]]);
    const daily = await store.scoreTrend(g.code, 'day');
    assert.equal(daily.length, 1);
    assert.deepEqual([daily[0].avg, daily[0].best, daily[0].samples], [0.4, 0.6, 3]);
  });

  test('tampering changes only the stored pact city', async () => {
    const store = createPostgresStore(pgliteDb());
    await store.init();
    const g = await store.createGroup('Tamper');
    await store.setPact(g.code, {
      signature: 's', hash: 'h', custody: 'fake', chain: 'fake', url: 'u', at: 'a',
      payload: { type: 'pact', group: 'G', city: 'Denver', weekend: '2026-11-14', members: ['a'] },
    });
    await store.tamperPact(g.code, 'Atlantis');
    const pact = (await store.getGroup(g.code))?.pact;
    assert.equal(pact?.payload.city, 'Atlantis');
    assert.equal(pact?.payload.weekend, '2026-11-14');
    assert.equal(pact?.hash, 'h');
  });
});
