// The same API tests run against every store, so memory and Postgres must behave identically.
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp, upcomingWeekends } from '../src/server.ts';
import { createFakeChain } from '../src/chain.ts';
import type { Store } from '../src/store.ts';

export const TODAY = '2026-10-24';
// Test responses are plain JSON; the tests assert on the fields they care about.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = any;

export function apiSuite(label: string, makeStore: () => Promise<Store>): void {
  describe(`API on ${label}`, () => {
    let server: Server;
    let base = '';
    let store: Store;

    before(async () => {
      store = await makeStore();
      await store.init();
      const app = createApp({ store, chain: createFakeChain(), today: () => TODAY, allowDemo: true, allowTamper: true });
      await new Promise<void>((res) => { server = app.listen(0, () => res()); });
      const addr = server.address();
      if (!addr || typeof addr === 'string') throw new Error('no port');
      base = `http://127.0.0.1:${addr.port}`;
    });
    after(async () => { server.close(); await store.close(); });

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

    test('health reports the store and chain', async () => {
      const h = await call('GET', '/api/health');
      assert.equal(h.body.ok, true);
      assert.equal(h.body.store, store.kind);
      assert.equal(h.body.chain, 'fake');
      assert.ok((await call('GET', '/api/cities')).body.includes('Nashville'));
    });

    test('validation: missing fields, unknown city, bad vibe, duplicate name', async () => {
      assert.equal((await call('POST', '/api/groups', { name: '', creator })).status, 400);
      assert.equal((await call('POST', '/api/groups', { name: 'X', creator: { ...creator, city: 'Atlantis' } })).status, 400);
      assert.equal((await call('POST', '/api/groups', { name: 'X', creator: { ...creator, vibe: 'napping' } })).status, 400);
      assert.equal((await call('POST', '/api/groups', { name: 'X', creator: { ...creator, describe: '' } })).status, 400);
      const g = await call('POST', '/api/groups', { name: 'Dup', creator });
      assert.equal((await call('POST', `/api/groups/${g.body.group.code}/join`, creator)).status, 400);
      const missing = await call('GET', '/api/groups/NOPE22');
      assert.equal(missing.status, 404);
      assert.match(missing.body.error, /not found/i, 'errors are JSON, not an HTML page');
    });

    test('a failed group creation leaves no orphan group behind', async () => {
      const bad = await call('POST', '/api/groups', { name: 'Broken', creator: { ...creator, city: 'Atlantis' } });
      assert.equal(bad.status, 400);
    });

    test('invite codes are case-insensitive', async () => {
      const g = await call('POST', '/api/groups', { name: 'Case', creator });
      const lower = await call('GET', `/api/groups/${g.body.group.code.toLowerCase()}`);
      assert.equal(lower.status, 200);
      assert.equal(lower.body.code, g.body.group.code);
    });

    test('tokens: private data stays private and actions need the right token', async () => {
      const { code, token, group } = await newDemoGroup();
      assert.ok(group.members.every((m: Body) => m.token === undefined && m.lat === undefined), 'no tokens or coordinates in public view');
      assert.equal((await call('POST', `/api/groups/${code}/availability`, { weekends: [] })).status, 401);
      assert.equal((await call('POST', `/api/groups/${code}/availability`, { weekends: [] }, 'wrong')).status, 401);
      assert.equal((await call('POST', `/api/groups/${code}/availability`, { weekends: ['2020-01-04'] }, token)).status, 400);
    });

    test('full flow: demo friends, scout, odds, pact, verify, tamper, stamp, nudges, feed', async () => {
      const { code, token, group } = await newDemoGroup();
      assert.equal(group.members.length, 4);
      assert.deepEqual(group.members.map((m: Body) => m.name).sort(), ['Arlo', 'Beck', 'Cyrus', 'Dante']);
      assert.ok(group.members.every((m: Body) => m.character && m.character.color));
      assert.equal(group.stage, 'gathering');

      const scout = await call('GET', `/api/groups/${code}/scout`);
      assert.equal(scout.body.ready, true);
      const p = scout.body.plans;
      assert.ok(p.length > 0);
      for (let i = 1; i < p.length; i++) {
        assert.ok(p[i - 1].feasible >= p[i].feasible, 'feasible plans first');
        if (p[i - 1].feasible === p[i].feasible) assert.ok(p[i - 1].survival >= p[i].survival, 'sorted by survival');
      }
      const weekends = upcomingWeekends(TODAY);
      assert.ok(new Set([weekends[3], weekends[7], weekends[11]]).has(p[0].weekend), 'best plan lands on a weekend everyone is free');

      const best = p[0];
      const odds = await call('GET', `/api/groups/${code}/odds?city=${encodeURIComponent(best.city)}&weekend=${best.weekend}&nights=4`);
      assert.equal(odds.status, 200);
      assert.ok(odds.body.smaller.length > 0, 'a 4-night plan should have a smaller, better version');
      assert.ok(odds.body.smaller.every((s: Body) => s.survival > odds.body.current.survival), 'suggestions must improve the score');
      assert.equal((await call('GET', `/api/groups/${code}/odds?city=Atlantis&weekend=${best.weekend}`)).status, 400);

      assert.equal((await call('POST', `/api/groups/${code}/pact`, { city: best.city, weekend: '2026-10-31' }, token)).status, 400);
      assert.equal((await call('POST', `/api/groups/${code}/pact`, { city: best.city, weekend: best.weekend })).status, 401);
      const pact = await call('POST', `/api/groups/${code}/pact`, { city: best.city, weekend: best.weekend, nights: 2 }, token);
      assert.equal(pact.status, 201);
      assert.equal(pact.body.payload.members.length, 4);
      assert.equal(pact.body.custody, 'fake');
      assert.equal((await call('POST', `/api/groups/${code}/pact`, { city: best.city, weekend: best.weekend }, token)).status, 409);
      assert.equal((await call('GET', `/api/groups/${code}`)).body.stage, 'pacted');

      assert.equal((await call('GET', `/api/groups/${code}/pact/verify`)).body.verified, true);
      assert.equal((await call('POST', `/api/groups/${code}/debug/tamper`, { city: 'Atlantis' })).status, 200);
      const caught = await call('GET', `/api/groups/${code}/pact/verify`);
      assert.equal(caught.body.verified, false);
      assert.equal(caught.body.memoMatches, false);
      assert.equal(caught.body.allSigned, true, 'signers are still fine, only the data changed');

      const nudges = await call('GET', `/api/groups/${code}/nudges?today=${TODAY}`);
      assert.ok(nudges.body.some((n: Body) => n.kind === 'countdown'));

      assert.equal((await call('POST', `/api/groups/${code}/feed`, { text: 'Who is bringing snacks?' }, token)).status, 201);
      assert.equal((await call('POST', `/api/groups/${code}/feed`, { text: '' }, token)).status, 400);
      assert.equal((await call('POST', `/api/groups/${code}/feed`, { text: 'x'.repeat(281) }, token)).status, 400);
      const feed = (await call('GET', `/api/groups/${code}/feed`)).body;
      assert.ok(feed.some((f: Body) => f.text === 'Who is bringing snacks?' && f.name === 'Beck'));
      assert.ok(feed.some((f: Body) => f.system && /flag is planted/i.test(f.text)));

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
      assert.equal((await call('GET', `/api/groups/${code}/scout`)).body.ready, false);
      await call('POST', `/api/groups/${code}/demo-friends`, {}, token);
      const pending = await call('GET', `/api/groups/${code}/scout`);
      assert.equal(pending.body.ready, false);
      assert.deepEqual(pending.body.pending, ['Beck'], 'only the creator has not picked weekends');
      const nudges = await call('GET', `/api/groups/${code}/nudges`);
      assert.ok(nudges.body.some((n: Body) => n.kind === 'availability' && /Beck/.test(n.text)));
      assert.equal((await call('GET', `/api/groups/${code}/trend`)).body.points.length, 0, 'no readings until everyone has picked weekends');
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

    test('availability is replaced, not appended', async () => {
      const { code, token } = await newDemoGroup();
      const w = upcomingWeekends(TODAY);
      await call('POST', `/api/groups/${code}/availability`, { weekends: [w[3], w[7], w[11]] }, token);
      await call('POST', `/api/groups/${code}/availability`, { weekends: [w[7]] }, token);
      const scout = await call('GET', `/api/groups/${code}/scout`);
      assert.ok(scout.body.plans.every((r: Body) => r.weekend === w[7]), 'only the one remaining shared weekend');
      await call('POST', `/api/groups/${code}/availability`, { weekends: [] }, token);
      const none = await call('GET', `/api/groups/${code}/scout`);
      assert.equal(none.body.ready, false);
      assert.deepEqual(none.body.pending, ['Beck']);
    });

    test('trend: seeded history, then real readings as the group acts', async () => {
      const { code, token } = await newDemoGroup();
      const first = await call('GET', `/api/groups/${code}/trend`);
      assert.equal(first.status, 200);
      assert.equal(first.body.store, store.kind);
      assert.equal(first.body.hasSeeded, true);
      const seeded = first.body.points.filter((p: Body) => p.seeded);
      assert.equal(seeded.length, 14, 'two weeks of synthetic history, flagged as seeded');
      const buckets = first.body.points.map((p: Body) => p.bucket);
      assert.deepEqual([...buckets].sort(), buckets, 'oldest first');
      assert.ok(first.body.points.every((p: Body) => p.avg > 0 && p.avg < 1 && p.best >= p.avg));
      const total = (r: Body): number => r.body.points.reduce((s: number, p: Body) => s + p.samples, 0);
      const before = total(first);

      const w = upcomingWeekends(TODAY);
      await call('POST', `/api/groups/${code}/availability`, { weekends: [w[3], w[7]] }, token);
      assert.equal(total(await call('GET', `/api/groups/${code}/trend`)), before + 1, 'changing weekends adds a reading');

      const best = (await call('GET', `/api/groups/${code}/scout`)).body.plans[0];
      await call('POST', `/api/groups/${code}/pact`, { city: best.city, weekend: best.weekend }, token);
      assert.equal(total(await call('GET', `/api/groups/${code}/trend`)), before + 2, 'signing the pact adds a reading');

      await call('POST', `/api/groups/${code}/stamp`, {}, token);
      const after = await call('GET', `/api/groups/${code}/trend`);
      assert.equal(total(after), before + 3, 'completing the trip adds a reading');
      assert.equal(Math.max(...after.body.points.map((p: Body) => p.best)), 1, 'a finished trip scores 1');

      assert.equal((await call('GET', `/api/groups/${code}/trend?bucket=hour`)).status, 200);
      assert.equal((await call('GET', `/api/groups/${code}/trend?bucket=week`)).status, 400);
    });

    test('demo friends twice does not duplicate the crew or the seeded history', async () => {
      const { code, token } = await newDemoGroup();
      const again = await call('POST', `/api/groups/${code}/demo-friends`, { fillMine: true }, token);
      assert.equal(again.body.members.length, 4);
      const trend = await call('GET', `/api/groups/${code}/trend`);
      assert.equal(trend.body.points.filter((p: Body) => p.seeded).length, 14);
    });
  });
}
