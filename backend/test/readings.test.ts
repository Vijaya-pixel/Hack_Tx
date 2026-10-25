import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import type { Db } from '../src/db.ts';
import { CUSTOMERS, customerById } from '../src/toyota/customers.ts';
import { createReadingsService, generateReadings, paceFromReadings, PACE_SQL, weeksSql } from '../src/toyota/readings.ts';
import { advise } from '../src/toyota/advice.ts';
import { bucketFloor } from '../src/tigerdata.ts';

const TODAY = '2026-10-24';
const asDb = (pg: PGlite): Db => ({ query: (t, p) => pg.query(t, p as unknown[]) as never, close: () => pg.close() });
const near = (a: number, b: number, pct: number): void => assert.ok(Math.abs(a - b) <= Math.abs(b) * pct, `${a} is not within ${pct * 100}% of ${b}`);

describe('generated readings', () => {
  for (const c of CUSTOMERS) {
    test(`${c.id}: weekly, always increasing, ends at today's mileage`, () => {
      const rs = generateReadings(c, TODAY);
      assert.equal(rs[rs.length - 1].miles, c.milesNow);
      assert.ok(rs.every((r, i) => i === 0 || r.miles >= rs[i - 1].miles));
      assert.ok(rs.every((r) => /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(r.time)));
      assert.ok(rs.length > 100);
    });
    test(`${c.id}: the recent pace comes out close to the target`, () => {
      near(paceFromReadings(generateReadings(c, TODAY), TODAY).recent, c.recentMilesPerMonth, 0.06);
    });
  }
  test('generation is deterministic', () => {
    assert.deepEqual(generateReadings(customerById('maya')!, TODAY), generateReadings(customerById('maya')!, TODAY));
  });
  test("Maya's recent pace is far above her lifetime pace, and the others are steady", () => {
    const p = (id: string) => paceFromReadings(generateReadings(customerById(id)!, TODAY), TODAY);
    assert.ok(p('maya').recent > p('maya').average * 1.5);
    for (const id of ['jake', 'sam', 'priya', 'lena']) near(p(id).recent, p(id).average, 0.1);
  });
});

describe('TigerData readings on a real Postgres engine', () => {
  test('init creates and fills the table once, and a second init does not duplicate it', async () => {
    const pg = new PGlite(); const svc = createReadingsService(asDb(pg));
    await svc.init(TODAY); await svc.init(TODAY);
    const { rows } = await pg.query<{ id: string; n: number }>('SELECT customer_id AS id, count(*)::int AS n FROM odometer_readings GROUP BY 1 ORDER BY 1');
    assert.deepEqual(rows.map((r) => r.id), ['jake', 'lena', 'maya', 'priya', 'sam']);
    for (const r of rows) assert.equal(r.n, generateReadings(customerById(r.id)!, TODAY).length);
    await svc.init(TODAY, { reseed: true });
    const after = await pg.query<{ n: number }>('SELECT count(*)::int AS n FROM odometer_readings');
    assert.equal(after.rows[0].n, rows.reduce((a, r) => a + r.n, 0));
  });

  test('the SQL pace matches the same math done in code, for every customer', async () => {
    const pg = new PGlite(); const svc = createReadingsService(asDb(pg));
    await svc.init(TODAY);
    for (const c of CUSTOMERS) {
      const viaSql = await svc.pace(c, TODAY);
      const viaCode = paceFromReadings(generateReadings(c, TODAY), TODAY);
      assert.equal(viaSql.source, 'tigerdata');
      assert.ok(Math.abs(viaSql.recent - viaCode.recent) <= 2, `${c.id} recent ${viaSql.recent} vs ${Math.round(viaCode.recent)}`);
      assert.ok(Math.abs(viaSql.average - viaCode.average) <= 2, `${c.id} average ${viaSql.average} vs ${Math.round(viaCode.average)}`);
      assert.equal(viaSql.synthetic, true);
    }
  });

  test('weekly points come back oldest first, newest at the current mileage, at most 26', async () => {
    const pg = new PGlite(); const svc = createReadingsService(asDb(pg));
    await svc.init(TODAY);
    const maya = customerById('maya')!;
    const p = await svc.pace(maya, TODAY);
    assert.ok(p.weeks.length > 20 && p.weeks.length <= 26);
    assert.ok(p.weeks.every((w, i) => i === 0 || (w.bucket > p.weeks[i - 1].bucket && w.miles >= p.weeks[i - 1].miles)));
    assert.equal(p.weeks[p.weeks.length - 1].miles, maya.milesNow);
  });

  test('an earlier date uses only the readings up to that date', async () => {
    const pg = new PGlite(); const svc = createReadingsService(asDb(pg));
    await svc.init(TODAY);
    const earlier = await svc.pace(customerById('maya')!, '2026-04-24');
    assert.ok(earlier.weeks[earlier.weeks.length - 1].miles < customerById('maya')!.milesNow);
    // the commute change had not happened yet: the pace is ordinary week-to-week noise, nowhere near the ~2,000 of today
    assert.ok(earlier.recent < 1500, `recent pace in April was ${earlier.recent}`);
    near(earlier.recent, earlier.average, 0.3);
  });

  test('if the database fails, it falls back to in-memory readings and says so', async () => {
    const broken: Db = { query: async () => { throw new Error('connection reset'); } };
    const p = await createReadingsService(broken).pace(customerById('maya')!, TODAY);
    assert.equal(p.source, 'in-memory');
    assert.match(p.note ?? '', /connection reset/);
    assert.ok(p.recent > 1500);
  });

  test('a database with no readings for the date also falls back, with a note', async () => {
    const pg = new PGlite(); const svc = createReadingsService(asDb(pg));
    await svc.init(TODAY);
    const p = await svc.pace(customerById('maya')!, '2021-01-01');
    assert.equal(p.source, 'in-memory');
    assert.ok(p.note);
  });

  test('without a database it is in-memory from the start', async () => {
    const svc = createReadingsService(null);
    await svc.init(TODAY);
    assert.equal(svc.kind, 'in-memory');
    assert.equal((await svc.pace(customerById('lena')!, TODAY)).source, 'in-memory');
  });

  test('the queries use TimescaleDB buckets when it is available and date_trunc when it is not', () => {
    assert.match(weeksSql(true), /time_bucket\(INTERVAL '1 week', time\)/);
    assert.match(weeksSql(false), /date_trunc\('week', time\)/);
    assert.equal(bucketFloor(true, 'week', 'time'), "time_bucket(INTERVAL '1 week', time)");
    assert.match(PACE_SQL, /regr_slope/);
  });
});

describe('using the recent pace changes the advice', () => {
  test("Maya's overage and fees go up, and the basis is labeled", () => {
    const maya = customerById('maya')!;
    const base = advise(maya, TODAY).facts;
    const recent = advise(maya, TODAY, { extraMilesPerMonth: 0, extraPayment: 0, pace: 1993 }).facts;
    assert.ok(Number(recent.overageCost) > Number(base.overageCost));
    assert.ok(Number(recent.projectedMiles) > Number(base.projectedMiles));
    assert.equal(base.paceBasis, 'lifetime average');
    assert.equal(recent.paceBasis, 'last 8 weeks');
    assert.equal(recent.milesPerMonth, 1993);
  });
});
