import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upcomingWeekends, seededHistory } from '../src/server.ts';
import { survivalScore, haversineKm } from '../src/engine.ts';
import { fallbackTraits, parseTraits, makeCharacter } from '../src/character.ts';
import { findCity } from '../src/cities.ts';
import { bucketOf, trendFromEvents } from '../src/store.ts';

const TODAY = '2026-10-24';

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
  const input = { name: 'Kai', describe: 'x', city: 'Austin', vibe: 'food' };
  assert.equal((await makeCharacter(input, { complete: async () => 'nonsense' })).source, 'fallback');
  assert.equal((await makeCharacter(input, { complete: async () => { throw new Error('down'); } })).source, 'fallback');
});

test('time buckets floor to the hour or the day in UTC', () => {
  assert.equal(bucketOf('2026-10-24T17:45:12.500Z', 'hour'), '2026-10-24T17:00:00Z');
  assert.equal(bucketOf('2026-10-24T17:45:12Z', 'day'), '2026-10-24T00:00:00Z');
});

test('trendFromEvents averages, keeps the best, counts samples, flags seeded, sorts by time', () => {
  const pts = trendFromEvents([
    { time: '2026-10-25T10:00:00Z', survival: 0.6, reason: 'a' },
    { time: '2026-10-24T09:00:00Z', survival: 0.2, reason: 'b', seeded: true },
    { time: '2026-10-24T15:00:00Z', survival: 0.4, reason: 'c' },
  ], 'day');
  assert.deepEqual(pts.map((p) => p.bucket), ['2026-10-24T00:00:00Z', '2026-10-25T00:00:00Z']);
  assert.deepEqual(pts[0], { bucket: '2026-10-24T00:00:00Z', avg: 0.3, best: 0.4, samples: 2, seeded: true });
  assert.equal(pts[1].seeded, false);
});

test('seeded demo history: 14 daily points, ending near the real score, all valid, deterministic', () => {
  const h = seededHistory(TODAY, 0.52);
  assert.equal(h.length, 14);
  assert.ok(h.every((p) => p.survival > 0 && p.survival < 1));
  assert.ok(h[0].time < h[13].time, 'oldest first');
  assert.ok(h[13].survival > h[0].survival, 'climbs toward today');
  assert.ok(Math.abs(h[13].survival - 0.52) < 0.15);
  assert.deepEqual(h, seededHistory(TODAY, 0.52));
  assert.ok(h.every((p) => p.time < `${TODAY}T00:00:00Z`), 'all in the past');
});
