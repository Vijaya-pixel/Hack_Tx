import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../src/app.ts';
import { createMemoryStore } from '../src/store.ts';
import { createSimulator } from '../src/simulator.ts';
import { createLocalRepo } from '../src/customers.ts';
import type { SnowflakeClient } from '../src/snowflake.ts';

const NOW = new Date('2026-10-24T15:00:00Z');

async function start(snowflake: SnowflakeClient | null = null) {
  const store = createMemoryStore(NOW);
  const simulator = createSimulator(store, 10);
  const app = createApp({ store, simulator, repo: createLocalRepo(), snowflake, cortexModel: 'test-model', now: () => NOW });
  const server: Server = await new Promise((res) => { const s = app.listen(0, () => res(s)); });
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const get = async (path: string) => { const r = await fetch(base + path); return { status: r.status, body: (await r.json()) as any }; };
  const post = async (path: string, body?: unknown) => {
    const r = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, body: (await r.json()) as any };
  };
  return { get, post, simulator, close: () => { simulator.stop(); server.close(); } };
}

describe('API in fallback mode', () => {
  let api: Awaited<ReturnType<typeof start>>;
  before(async () => { api = await start(); });
  after(() => api.close());

  test('health says which modes are active', async () => {
    const { body } = await api.get('/api/health');
    assert.equal(body.database.mode, 'memory');
    assert.equal(body.snowflake.connected, false);
    assert.equal(body.snowflake.customerSource, 'local');
    assert.equal(body.ai.mode, 'template');
  });

  test('customer has a computed payment', async () => {
    const { body } = await api.get('/api/customer');
    assert.equal(body.name, 'Vijay');
    assert.ok(Math.abs(body.monthlyPayment - 656) < 1);
    assert.equal(body.percentPaid, 18.8);
  });

  test('a typed-in loan recomputes the payment, plan and explanation', async () => {
    const c = (await api.get('/api/customer?balance=15000&apr=0&months=30')).body;
    assert.equal(c.custom, true);
    assert.equal(c.monthlyPayment, 500);
    assert.equal(c.percentPaid, null);
    assert.equal((await api.get('/api/customer?balance=15000&original=20000')).body.percentPaid, 25);
    const plan = (await api.get('/api/plan?extraPerWeek=0&balance=15000&apr=0&months=30')).body;
    assert.equal(plan.standard.months, 30);
    assert.equal(plan.standard.totalInterest, 0);
    assert.equal(plan.standard.schedule[0].balance, 15000);
    const ex = (await api.get('/api/explain?extraPerWeek=10&balance=15000&apr=0&months=30')).body;
    assert.match(ex.text, /April 2029/); // 30 months from the test clock
    assert.equal((await api.get('/api/customer')).body.custom, false);
  });

  test('bad loan values are rejected with a clear message', async () => {
    for (const q of ['balance=5', 'balance=abc', 'apr=31', 'apr=-1', 'months=2', 'months=12.5', 'balance=9000&original=5000']) {
      const r = await api.get(`/api/plan?${q}`);
      assert.equal(r.status, 400, q);
      assert.ok(r.body.error);
    }
  });

  test('roundups returns weekly bars and the real average', async () => {
    const { body } = await api.get('/api/roundups?range=12w');
    assert.equal(body.weeks, 12);
    assert.ok(body.thisWeek > 0, 'the current week has seeded purchases');
    assert.equal(body.highlight.label, 'This week');
    assert.ok(body.highlight.progress > 0 && body.highlight.progress <= 1);
    assert.ok(body.weekly.length >= 12);
    assert.ok(Math.abs(body.avgPerWeek - body.total / 12) < 0.01);
    assert.equal((await api.get('/api/roundups?range=5y')).status, 400);
  });

  test('feed returns items with round-ups and validates the limit', async () => {
    const { body } = await api.get('/api/feed?limit=5');
    assert.equal(body.items.length, 5);
    assert.ok(body.items[0].roundup >= 0 && body.items[0].roundup < 1);
    assert.equal((await api.get('/api/feed?limit=0')).status, 400);
    assert.equal((await api.get('/api/feed?limit=abc')).status, 400);
  });

  test('simulator start and stop', async () => {
    assert.deepEqual((await api.post('/api/simulator/start')).body, { running: true });
    assert.equal((await api.get('/api/health')).body.simulator.running, true);
    assert.deepEqual((await api.post('/api/simulator/stop')).body, { running: false });
  });

  test('plan defaults to the real average and accepts 0 to 100', async () => {
    const roundups = (await api.get('/api/roundups')).body;
    const { body } = await api.get('/api/plan');
    assert.equal(body.extraPerWeek, roundups.avgPerWeek);
    assert.equal(body.standard.months, 48);
    assert.ok(body.kpis.monthsSaved > 0 && body.kpis.interestSaved > 0);
    assert.equal(body.standard.schedule[0].balance, 28000);
    assert.equal(body.withRoundUps.schedule.at(-1).balance, 0);
    const zero = (await api.get('/api/plan?extraPerWeek=0')).body;
    assert.equal(zero.kpis.monthsSaved, 0);
    assert.ok(body.biweekly.monthsSaved > 0);
    assert.equal((await api.get('/api/plan?extraPerWeek=101')).status, 400);
    assert.equal((await api.get('/api/plan?extraPerWeek=-1')).status, 400);
    assert.equal((await api.get('/api/plan?extraPerWeek=x')).status, 400);
  });

  test('explain uses the template without Snowflake and checks its inputs', async () => {
    const { body } = await api.get('/api/explain?extraPerWeek=20&preset=worth');
    assert.equal(body.source, 'template');
    assert.equal(body.label, 'Standard explanation');
    const dbl = (await api.get('/api/explain?extraPerWeek=20&preset=double')).body;
    assert.equal(dbl.extraPerWeek, 40);
    assert.equal((await api.get('/api/explain?preset=chat')).status, 400);
  });

  test('hardship saves a pending request and rejects unknown kinds', async () => {
    const ok = await api.post('/api/hardship', { kind: 'pause' });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.status, 'PENDING');
    assert.equal(ok.body.message, 'Request sent. A TFS specialist will review it.');
    assert.equal((await api.post('/api/hardship', { kind: 'forgive-loan' })).status, 400);
    assert.equal((await api.post('/api/hardship')).status, 400);
  });

  test('unknown API paths are JSON 404s', async () => {
    const r = await api.get('/api/nope');
    assert.equal(r.status, 404);
    assert.ok(r.body.error);
  });
});

describe('API with a fake Snowflake', () => {
  test('a faithful Cortex reply is served with the Cortex label; a bad one falls back', async () => {
    let reply = '';
    const client: SnowflakeClient = { query: async () => [{ REPLY: reply }] as never, close: async () => {} };
    const api = await start(client);
    try {
      assert.equal((await api.get('/api/health')).body.ai.mode, 'cortex');
      const plain = (await api.get('/api/explain?extraPerWeek=20')).body;
      reply = plain.text; // the template text uses only known numbers, so it passes the guard
      const ok = (await api.get('/api/explain?extraPerWeek=20')).body;
      assert.equal(ok.source, 'cortex');
      reply = 'You will save $123,456.';
      const bad = (await api.get('/api/explain?extraPerWeek=20')).body;
      assert.equal(bad.source, 'template');
      assert.match(bad.rejected, /123456/);
    } finally { api.close(); }
  });
});

describe('highlight card', () => {
  test('on a Monday morning with nothing yet it shows last week instead', async () => {
    const monday = new Date('2026-10-26T00:00:30Z');
    const store = createMemoryStore(monday);
    const app = createApp({ store, simulator: createSimulator(store, 10), repo: createLocalRepo(), snowflake: null, cortexModel: 'm', now: () => monday });
    const server: Server = await new Promise((res) => { const s = app.listen(0, () => res(s)); });
    try {
      const body: any = await (await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/api/roundups`)).json();
      assert.equal(body.highlight.label, 'Last week');
      assert.ok(body.highlight.amount > 0);
    } finally { server.close(); }
  });
});
