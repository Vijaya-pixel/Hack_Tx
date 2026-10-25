import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import type { Db } from '../src/db.ts';
import { createDbStore, createMemoryStore, createStoreFromDb } from '../src/store.ts';
import { CUSTOMER_ID, generateTransactions, randomPurchase, rng, weekStart } from '../src/seed.ts';
import { createSimulator } from '../src/simulator.ts';
import { roundUp } from '../src/loan.ts';

const NOW = new Date('2026-10-24T15:00:00Z'); // a Saturday

describe('seed data', () => {
  test('is deterministic and consistent', () => {
    const a = generateTransactions(NOW);
    assert.deepEqual(a, generateTransactions(NOW));
    assert.ok(a.length > 150 && a.length < 400, String(a.length));
    for (const t of a) assert.equal(t.roundupCents, roundUp(t.amountCents));
    assert.ok(new Date(a.at(-1)!.ts) < weekStart(NOW));
  });
  test('covers the usual categories', () => {
    const cats = new Set(generateTransactions(NOW).map((t) => t.category));
    for (const c of ['Coffee', 'Lunch', 'Groceries', 'Gas']) assert.ok(cats.has(c), c);
  });
  test('rng repeats for the same seed', () => {
    assert.equal(rng(7)(), rng(7)());
  });
});

describe('memory store', () => {
  test('summarizes 12 completed weeks and a running week', async () => {
    const s = createMemoryStore(NOW);
    const sum = await s.roundups(CUSTOMER_ID, NOW);
    assert.equal(s.mode, 'memory');
    assert.equal(sum.completedWeeks, 12);
    assert.equal(sum.weekly.length, 12);
    assert.equal(sum.avgPerWeekCents, Math.round(sum.totalCents / 12));
    assert.ok(sum.avgPerWeekCents > 500 && sum.avgPerWeekCents < 3000, String(sum.avgPerWeekCents));
  });
  test('a new purchase shows in the feed first and in the running week, not in the average', async () => {
    const s = createMemoryStore(NOW);
    const before = await s.roundups(CUSTOMER_ID, NOW);
    await s.add({ ...randomPurchase(NOW), ts: NOW.toISOString(), merchant: 'Test Cafe', amountCents: 420, roundupCents: 80 });
    const feed = await s.feed(CUSTOMER_ID, 5);
    assert.equal(feed[0].merchant, 'Test Cafe');
    const after = await s.roundups(CUSTOMER_ID, NOW);
    assert.equal(after.weekly.length, 13);
    assert.equal(after.weekly.at(-1)!.roundupCents, 80);
    assert.equal(after.avgPerWeekCents, before.avgPerWeekCents);
  });
});

describe('database store (plain Postgres engine)', () => {
  async function pgDb(): Promise<Db> {
    const pg = new PGlite();
    return { query: (text, params) => pg.query(text, params as unknown[]) as never };
  }
  test('creates the table and view, seeds once, and matches the memory store', async () => {
    const db = await pgDb();
    const store = await createDbStore(db, NOW);
    assert.equal(store.mode, 'postgres');
    const again = await createDbStore(db, NOW); // second startup must not reseed
    const a = await store.roundups(CUSTOMER_ID, NOW);
    const b = await again.roundups(CUSTOMER_ID, NOW);
    const m = await createMemoryStore(NOW).roundups(CUSTOMER_ID, NOW);
    assert.deepEqual(a, { ...b });
    assert.equal(a.totalCents, m.totalCents);
    assert.equal(a.avgPerWeekCents, m.avgPerWeekCents);
  });
  test('add and feed work', async () => {
    const store = await createDbStore(await pgDb(), NOW);
    const row = await store.add({ ts: NOW.toISOString(), customerId: CUSTOMER_ID, merchant: 'Cedar Bean Coffee', category: 'Coffee', amountCents: 420, roundupCents: 80 });
    assert.ok(row.id);
    const feed = await store.feed(CUSTOMER_ID, 3);
    assert.equal(feed.length, 3);
    assert.equal(feed[0].merchant, 'Cedar Bean Coffee');
  });
  test('falls back to memory with a reason when the database fails or is missing', async () => {
    assert.equal((await createStoreFromDb(null)).store.mode, 'memory');
    const broken: Db = { query: async () => { throw new Error('boom'); } };
    const r = await createStoreFromDb(broken);
    assert.equal(r.store.mode, 'memory');
    assert.match(r.reason!, /boom/);
  });
});

describe('simulator', () => {
  test('inserts purchases while running and stops cleanly', async () => {
    const s = createMemoryStore(NOW);
    const sim = createSimulator(s, 10);
    const n = (await s.feed(CUSTOMER_ID, 1000)).length;
    sim.start();
    sim.start();
    assert.equal(sim.running(), true);
    await new Promise((r) => setTimeout(r, 80));
    sim.stop();
    assert.equal(sim.running(), false);
    const grown = (await s.feed(CUSTOMER_ID, 1000)).length;
    assert.ok(grown > n);
    await new Promise((r) => setTimeout(r, 40));
    assert.equal((await s.feed(CUSTOMER_ID, 1000)).length, grown);
  });
});
