import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp, upcomingWeekends } from '../src/server.ts';
import { createStore } from '../src/store.ts';
import { createFakeChain } from '../src/chain.ts';
import { survivalScore, haversineKm } from '../src/engine.ts';
import { fallbackTraits, parseTraits, makeCharacter } from '../src/character.ts';
import { findCity } from '../src/cities.ts';

const TODAY = '2026-10-24';
let server: Server;
let base: string;
let chain: ReturnType<typeof createFakeChain>;

// Test responses are plain JSON; the tests assert on the fields they care about.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = any;

before(async () => {
  chain = createFakeChain();
  const app = createApp({ store: createStore(), chain, today: () => TODAY, allowDemo: true, allowTamper: true });
  await new Promise<void>((res) => { server = app.listen(0, () => res()); });
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('no port');
  base = `http://127.0.0.1:${addr.port}`;
});
after(() => server.close());

const call = async (method: string, path: string, body?: unknown, token?: string): Promise<{ status: number; body: Body }> => {
  const r = await fetch(base + path, {
    method, headers: { 'content-type': 'application/json', ...(token ? { 'x-member-token': token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json() };
};
const creator = { name: 'Beck', city: 'austin', vibe: 'adventure', describe: 'Always up for a road trip and a hike.' };

async function newDemoGroup() {
  const created = await call('POST', '/api/groups', { name: 'Four Corners', creator });
  assert.equal(created.status, 201);
  const { code } = created.body.group;
  const token = created.body.you.token;
  const filled = await call('POST', `/api/groups/${code}/demo-friends`, { fillMine: true }, token);
  assert.equal(filled.status, 200);
  return { code, token, group: filled.body };
}

test('engine basics: distance, scoring direction', () => {
  const d = haversineKm(30.2672, -97.7431, 41.8781, -87.6298); // Austin to Chicago
  assert.ok(d > 1500 && d < 1700, `distance ${d}`);
  const base = { groupSize: 4, nights: 2, maxTravelHours: 4, estCostPp: 200, leadDays: 30 };
  assert.ok(survivalScore({ ...base, maxTravelHours: 9 }) < survivalScore(base), 'longer travel lowers odds');
  assert.ok(survivalScore({ ...base, estCostPp: 700 }) < survivalScore(base), 'higher cost lowers odds');
  assert.ok(survivalScore({ ...base, nights: 4 }) < survivalScore(base), 'longer stay lowers odds');
  const s = survivalScore(base);
  assert.ok(s > 0 && s < 1);
});

test('city lookup handles aliases and rejects unknowns', () => {
  assert.equal(findCity('NYC')?.name, 'New York');
  assert.equal(findCity('austin, TX')?.name, 'Austin');
  assert.equal(findCity('Atlantis'), null);
});

test('upcoming weekends are Saturdays starting after today', () => {
  const w = upcomingWeekends(TODAY);
  assert.equal(w.length, 20);
  assert.equal(w[0], '2026-10-31');
  assert.ok(w.every((d: string) => new Date(`${d}T00:00:00Z`).getUTCDay() === 6));
});

test('characters: fallback is deterministic and valid; bad AI replies are rejected', async () => {
  const a = fallbackTraits({ name: 'Juno', describe: 'I plan everything and love coffee', vibe: 'chill' });
  const b = fallbackTraits({ name: 'Juno', describe: 'I plan everything and love coffee', vibe: 'chill' });
  assert.deepEqual(a, b);
  assert.equal(a.accessory, 'clipboard');
  assert.equal(parseTraits('{"color":"blue"}'), null);
  assert.equal(parseTraits('not json'), null);
  const good = '{"color":"blue","hair":"short","accessory":"book","mood":"happy","pose":"waving","title":"the reader","tagline":"Reads everything."}';
  assert.equal(parseTraits(`here you go: ${good}`)?.source, 'ai');
  const viaBadLlm = await makeCharacter({ name: 'Kai', describe: 'x', city: 'Austin', vibe: 'food' }, { complete: async () => 'nonsense' });
  assert.equal(viaBadLlm.source, 'fallback');
  const viaCrashingLlm = await makeCharacter({ name: 'Kai', describe: 'x', city: 'Austin', vibe: 'food' }, { complete: async () => { throw new Error('down'); } });
  assert.equal(viaCrashingLlm.source, 'fallback');
});

test('health and cities', async () => {
  const h = await call('GET', '/api/health');
  assert.equal(h.body.ok, true);
  assert.equal(h.body.chain, 'fake');
  const c = await call('GET', '/api/cities');
  assert.ok(c.body.includes('Nashville'));
});

test('validation: missing fields, unknown city, bad vibe, duplicate name', async () => {
  assert.equal((await call('POST', '/api/groups', { name: '', creator })).status, 400);
  assert.equal((await call('POST', '/api/groups', { name: 'X', creator: { ...creator, city: 'Atlantis' } })).status, 400);
  assert.equal((await call('POST', '/api/groups', { name: 'X', creator: { ...creator, vibe: 'napping' } })).status, 400);
  assert.equal((await call('POST', '/api/groups', { name: 'X', creator: { ...creator, describe: '' } })).status, 400);
  const g = await call('POST', '/api/groups', { name: 'Dup', creator });
  const dup = await call('POST', `/api/groups/${g.body.group.code}/join`, creator);
  assert.equal(dup.status, 400);
  assert.equal((await call('GET', '/api/groups/NOPE22')).status, 404);
});

test('a failed group creation leaves no orphan group behind', async () => {
  const before = await call('POST', '/api/groups', { name: 'Probe', creator });
  assert.equal(before.status, 201);
  const bad = await call('POST', '/api/groups', { name: 'Broken', creator: { ...creator, city: 'Atlantis' } });
  assert.equal(bad.status, 400);
});

test('tokens: private data stays private and actions need the right token', async () => {
  const { code, token, group } = await newDemoGroup();
  assert.ok(group.members.every((m: Body) => m.token === undefined && m.lat === undefined), 'no tokens or coordinates in public view');
  assert.equal((await call('POST', `/api/groups/${code}/availability`, { weekends: [] })).status, 401);
  assert.equal((await call('POST', `/api/groups/${code}/availability`, { weekends: [] }, 'wrong')).status, 401);
  assert.equal((await call('POST', `/api/groups/${code}/availability`, { weekends: ['2020-01-04'] }, token)).status, 400);
});

test('full flow: demo friends, scout, odds, pact, verify, stamp, nudges, feed', async () => {
  const { code, token, group } = await newDemoGroup();
  assert.equal(group.members.length, 4);
  assert.deepEqual(group.members.map((m: Body) => m.name).sort(), ['Arlo', 'Beck', 'Cyrus', 'Dante']);
  assert.ok(group.members.every((m: Body) => m.character && m.character.color));
  assert.equal(group.stage, 'gathering');

  const scout = await call('GET', `/api/groups/${code}/scout`);
  assert.equal(scout.body.ready, true);
  assert.ok(scout.body.plans.length > 0);
  const p = scout.body.plans;
  for (let i = 1; i < p.length; i++) {
    assert.ok(p[i - 1].feasible >= p[i].feasible, 'feasible plans first');
    if (p[i - 1].feasible === p[i].feasible) assert.ok(p[i - 1].survival >= p[i].survival, 'sorted by survival');
  }
  const weekends = upcomingWeekends(TODAY);
  const forced = new Set([weekends[3], weekends[7], weekends[11]]);
  assert.ok(forced.has(p[0].weekend), 'best plan lands on a weekend everyone is free');

  const best = p[0];
  const odds = await call('GET', `/api/groups/${code}/odds?city=${encodeURIComponent(best.city)}&weekend=${best.weekend}&nights=4`);
  assert.equal(odds.status, 200);
  assert.ok(odds.body.smaller.every((s: Body) => s.survival > odds.body.current.survival), 'suggestions must improve the score');
  assert.ok(odds.body.smaller.length > 0, 'a 4-night plan should have a smaller, better version');
  assert.equal((await call('GET', `/api/groups/${code}/odds?city=Atlantis&weekend=${best.weekend}`)).status, 400);

  // pact needs a valid plan
  assert.equal((await call('POST', `/api/groups/${code}/pact`, { city: best.city, weekend: '2026-10-31' }, token)).status, 400);
  assert.equal((await call('POST', `/api/groups/${code}/pact`, { city: best.city, weekend: best.weekend })).status, 401);
  const pact = await call('POST', `/api/groups/${code}/pact`, { city: best.city, weekend: best.weekend, nights: 2 }, token);
  assert.equal(pact.status, 201);
  assert.equal(pact.body.payload.members.length, 4);
  assert.equal(pact.body.custody, 'fake');
  assert.equal((await call('POST', `/api/groups/${code}/pact`, { city: best.city, weekend: best.weekend }, token)).status, 409);

  const ok = await call('GET', `/api/groups/${code}/pact/verify`);
  assert.equal(ok.body.verified, true);

  // tamper with the stored data: verification must now fail
  assert.equal((await call('POST', `/api/groups/${code}/debug/tamper`, { city: 'Atlantis' })).status, 200);
  const caught = await call('GET', `/api/groups/${code}/pact/verify`);
  assert.equal(caught.body.verified, false);
  assert.equal(caught.body.memoMatches, false);
  assert.equal(caught.body.allSigned, true, 'signers are still fine, only the data changed');

  const nudges = await call('GET', `/api/groups/${code}/nudges?today=${TODAY}`);
  assert.ok(nudges.body.some((n: Body) => n.kind === 'countdown'));

  const msg = await call('POST', `/api/groups/${code}/feed`, { text: 'Who is bringing snacks?' }, token);
  assert.equal(msg.status, 201);
  assert.equal((await call('POST', `/api/groups/${code}/feed`, { text: '' }, token)).status, 400);
  assert.equal((await call('POST', `/api/groups/${code}/feed`, { text: 'x'.repeat(281) }, token)).status, 400);

  const stamp = await call('POST', `/api/groups/${code}/stamp`, {}, token);
  assert.equal(stamp.status, 201);
  assert.equal(stamp.body.payload.streak, 1);
  assert.equal((await call('POST', `/api/groups/${code}/stamp`, {}, token)).status, 409);
  const done = await call('GET', `/api/groups/${code}`);
  assert.equal(done.body.stage, 'stamped');
  assert.equal(done.body.streak, 1);
});

test('stamp before pact is refused; scout before availability says who is pending', async () => {
  const created = await call('POST', '/api/groups', { name: 'Early', creator });
  const { code } = created.body.group;
  const token = created.body.you.token;
  assert.equal((await call('POST', `/api/groups/${code}/stamp`, {}, token)).status, 409);
  const scout = await call('GET', `/api/groups/${code}/scout`);
  assert.equal(scout.body.ready, false);
  await call('POST', `/api/groups/${code}/demo-friends`, {}, token);
  const pending = await call('GET', `/api/groups/${code}/scout`);
  assert.equal(pending.body.ready, false);
  assert.deepEqual(pending.body.pending, ['Beck'], 'only the creator has not picked weekends');
  const nudges = await call('GET', `/api/groups/${code}/nudges`);
  assert.ok(nudges.body.some((n: Body) => n.kind === 'availability' && /Beck/.test(n.text)));
});

test('travel limits are respected: a tiny limit makes far cities infeasible', async () => {
  const { code, token } = await newDemoGroup();
  const weekends = upcomingWeekends(TODAY);
  await call('POST', `/api/groups/${code}/availability`, { weekends: [weekends[3], weekends[7]], maxTravelHours: 1 }, token);
  const scout = await call('GET', `/api/groups/${code}/scout`);
  assert.ok(scout.body.plans.length > 0);
  const city = scout.body.plans.find((r: Body) => r.city === 'Seattle' && r.weekend === weekends[3]);
  assert.ok(!city || city.feasible === false, 'Seattle is not feasible with a 1 hour limit for Beck');
});
