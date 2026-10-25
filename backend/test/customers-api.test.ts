import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../src/server.ts';

let server: Server; let base = '';
before(async () => {
  server = await new Promise((res) => { const s = createApp({ today: () => '2026-10-24' }).listen(0, () => res(s)); });
  const a = server.address();
  if (!a || typeof a === 'string') throw new Error('no port');
  base = `http://127.0.0.1:${a.port}`;
});
after(() => { server.close(); });
const get = async (path: string) => { const r = await fetch(base + path); return { status: r.status, body: await r.json() }; };

describe('customer routes', () => {
  test('lists the five customers with their monthly payment', async () => {
    const r = await get('/api/customers');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.map((c: { id: string }) => c.id), ['maya', 'jake', 'sam', 'priya', 'lena']);
    assert.ok(r.body.every((c: { monthlyPayment: number }) => c.monthlyPayment > 0));
    assert.equal(r.body[0].monthlyPayment, 403);
  });
  test('advice, timeline and explanation for every customer', async () => {
    for (const id of ['maya', 'jake', 'sam', 'priya', 'lena']) {
      const a = await get(`/api/customers/${id}/advice`);
      assert.equal(a.status, 200);
      assert.ok(a.body.options.some((o: { id: string }) => o.id === a.body.recommendedId));
      const t = await get(`/api/customers/${id}/timeline`);
      assert.equal(t.status, 200);
      assert.ok(t.body.points.length > 12);
      const e = await get(`/api/customers/${id}/explain`);
      assert.equal(e.body.source, 'template');
      assert.ok(e.body.text.includes(a.body.nextStep.label));
    }
  });
  test('what-if parameters change the answer', async () => {
    const base0 = await get('/api/customers/maya/advice');
    const more = await get('/api/customers/maya/advice?extraMiles=500');
    assert.ok(more.body.facts.overageCost > base0.body.facts.overageCost);
    const slow = await get('/api/customers/sam/timeline?extraPayment=300');
    const norm = await get('/api/customers/sam/timeline');
    const i = norm.body.nowIndex + 20;
    assert.ok(slow.body.points[i].owed < norm.body.points[i].owed);
  });
  test('bad input gets a clear 400, unknown customers a 404, all as JSON', async () => {
    for (const path of ['/api/customers/maya/advice?extraMiles=abc', '/api/customers/maya/advice?extraMiles=99999',
      '/api/customers/maya/advice?extraPayment=-5', '/api/customers/maya/timeline?today=yesterday', '/api/customers/maya/advice?today=2026-13-45']) {
      const r = await get(path);
      assert.equal(r.status, 400, path);
      assert.equal(typeof r.body.error, 'string');
    }
    assert.equal((await get('/api/customers/nobody/advice')).status, 404);
  });
  test('a different "today" moves the story', async () => {
    const early = await get('/api/customers/maya/advice?today=2026-04-24');
    assert.equal(early.body.facts.monthsLeft, 9);
  });
});

import { clearExplanationCache } from '../src/toyota/explain.ts';
describe('explain route with a model plugged in', () => {
  beforeEach(() => clearExplanationCache());
  const GOOD = "Maya, you are on track to go about 6,000 miles over, which would cost about $1,895 to return the car. A RAV4 Hybrid lease is about $449 a month, which is $46 more than now, but you would spend $44 less on fuel each month. Your next step is to see your RAV4 Hybrid offer.";
  const run = async (reply: string | Error) => {
    const s: Server = await new Promise((res) => { const x = createApp({ today: () => '2026-10-24', llm: { complete: async () => { if (reply instanceof Error) throw reply; return reply; } } }).listen(0, () => res(x)); });
    const a = s.address(); if (!a || typeof a === 'string') throw new Error('no port');
    const b = `http://127.0.0.1:${a.port}`;
    const out = { health: await (await fetch(`${b}/api/health`)).json(), explain: await (await fetch(`${b}/api/customers/maya/explain`)).json() };
    s.close(); return out;
  };
  test('a good model reply is served, and health says a model is on', async () => {
    const r = await run(GOOD);
    assert.equal(r.health.llm, 'gemini');
    assert.equal(r.explain.source, 'model');
  });
  test('a bad reply or a failing model still gives the customer an answer', async () => {
    const bad = await run(GOOD.replace('$44 less', '$75 less'));
    assert.equal(bad.explain.source, 'template');
    assert.deepEqual(bad.explain.rejected, ['75']);
    const down = await run(new Error('Gemini returned 503: overloaded'));
    assert.equal(down.explain.source, 'template');
    assert.ok(down.explain.text.length > 50);
  });
});
