// Odometer readings over time. In TigerData this is a hypertable; the pace is computed in SQL.
// Without a database the same synthetic readings are generated in memory and the same math is done in code.
// All readings are synthetic and are marked as such in the response.
import type { Db } from '../db.ts';
import { bucketFloor, enableHypertable } from '../tigerdata.ts';
import { CUSTOMERS, type Customer } from './customers.ts';

const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_S = 2629800; // seconds in an average month (30.4375 days)
export const RECENT_DAYS = 56;

export interface Reading { time: string; miles: number }
export interface Pace {
  customerId: string; today: string; windowDays: number;
  average: number; recent: number;                    // miles a month
  weeks: { bucket: string; miles: number }[];         // last 26 weekly points, for a chart
  source: 'tigerdata' | 'in-memory'; timescale: boolean; synthetic: true; note?: string;
}

// A stable pseudo-random number in [0, 1) from a string.
function hash01(s: string): number {
  let h = 2166136261;
  for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

// Weekly readings from the start of the contract to today. The pace is steady until 8 weeks ago, then the
// customer's recent pace. Each segment's total is scaled to match exactly, so the last reading is milesNow.
export function generateReadings(c: Customer, todayIso: string): Reading[] {
  const start = Date.parse(`${c.contract.startMonth}-01T12:00:00Z`);
  const end = Date.parse(`${todayIso}T12:00:00Z`);
  const times: number[] = [];
  for (let t = start; t < end; t += WEEK_MS) times.push(t);
  times.push(end);

  const recentStart = end - RECENT_DAYS * DAY_MS;
  const firstRecent = times.findIndex((t) => t > recentStart);
  const boundary = times[Math.max(0, firstRecent - 1)];
  const recentMonths = (end - boundary) / (MONTH_S * 1000);
  const recentTotal = Math.min(c.milesNow - 12, c.recentMilesPerMonth * recentMonths);
  const earlierTotal = c.milesNow - 12 - recentTotal;

  const weights = times.map((t, i) => (i === 0 ? 0 : ((t - times[i - 1]) / DAY_MS) * (0.75 + 0.5 * hash01(`${c.id}:${i}`))));
  const sumA = weights.reduce((a, w, i) => (i < firstRecent ? a + w : a), 0);
  const sumB = weights.reduce((a, w, i) => (i >= firstRecent ? a + w : a), 0);

  let miles = 12; // a few miles from the lot to the driveway
  return times.map((t, i) => {
    if (i > 0) miles += i < firstRecent ? (weights[i] / sumA) * earlierTotal : (weights[i] / sumB) * recentTotal;
    return { time: new Date(t).toISOString().replace('.000Z', 'Z'), miles: Math.round(miles) };
  });
}

// ---- The same math in code (used without a database, and to cross-check the SQL) ----
const secs = (iso: string): number => Date.parse(iso) / 1000;

export function paceFromReadings(readings: Reading[], todayIso: string): { average: number; recent: number } {
  const end = secs(`${todayIso}T23:59:59Z`);
  const upTo = readings.filter((r) => secs(r.time) <= end);
  const first = upTo[0]; const last = upTo[upTo.length - 1];
  const average = last.miles - first.miles > 0 ? (last.miles - first.miles) / ((secs(last.time) - secs(first.time)) / MONTH_S) : 0;
  const window = upTo.filter((r) => secs(r.time) >= end - RECENT_DAYS * 86400);
  const n = window.length;
  if (n < 2) return { average, recent: average };
  const xs = window.map((r) => secs(r.time)); const ys = window.map((r) => r.miles);
  const mx = xs.reduce((a, b) => a + b, 0) / n; const my = ys.reduce((a, b) => a + b, 0) / n;
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  return { average, recent: slope * MONTH_S };
}

// ---- SQL ----
export const TABLE_SQL = [
  `CREATE TABLE IF NOT EXISTS odometer_readings (
     time timestamptz NOT NULL, customer_id text NOT NULL, miles double precision NOT NULL)`,
  'CREATE INDEX IF NOT EXISTS odometer_customer_time ON odometer_readings (customer_id, time DESC)',
];

// regr_slope fits a straight line through the last 8 weeks: miles per second, times seconds in a month.
export const PACE_SQL = `
SELECT
  (SELECT regr_slope(miles, extract(epoch FROM time)) * ${MONTH_S}
     FROM odometer_readings
    WHERE customer_id = $1 AND time <= $2::timestamptz AND time >= $2::timestamptz - INTERVAL '${RECENT_DAYS} days') AS recent,
  (SELECT (max(miles) - min(miles)) / NULLIF(extract(epoch FROM (max(time) - min(time))) / ${MONTH_S}, 0)
     FROM odometer_readings WHERE customer_id = $1 AND time <= $2::timestamptz) AS average`;

export const weeksSql = (timescale: boolean): string => `
SELECT to_char(b AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS bucket, max(miles)::float8 AS miles
FROM (SELECT ${bucketFloor(timescale, 'week', 'time')} AS b, miles FROM odometer_readings
       WHERE customer_id = $1 AND time <= $2::timestamptz) s
GROUP BY b ORDER BY b DESC LIMIT 26`;

export interface ReadingsService {
  init(todayIso: string, opts?: { reseed?: boolean }): Promise<void>;
  pace(c: Customer, todayIso: string): Promise<Pace>;
  readonly kind: 'tigerdata' | 'in-memory';
}

export function createReadingsService(db: Db | null): ReadingsService {
  let timescale = false;
  const memory = new Map<string, Reading[]>();
  const fromMemory = (c: Customer, today: string, note?: string): Pace => {
    const key = `${c.id}:${today}`;
    if (!memory.has(key)) memory.set(key, generateReadings(c, today));
    const rs = memory.get(key)!;
    const { average, recent } = paceFromReadings(rs, today);
    const weeks = rs.slice(-26).map((r) => ({ bucket: r.time.slice(0, 10), miles: r.miles }));
    return { customerId: c.id, today, windowDays: RECENT_DAYS, average: Math.round(average), recent: Math.round(recent), weeks, source: 'in-memory', timescale: false, synthetic: true, ...(note ? { note } : {}) };
  };

  return {
    kind: db ? 'tigerdata' : 'in-memory',
    async init(todayIso, { reseed = false } = {}) {
      if (!db) return;
      for (const sql of TABLE_SQL) await db.query(sql);
      timescale = await enableHypertable(db, { table: 'odometer_readings', timeColumn: 'time' });
      if (reseed) await db.query('DELETE FROM odometer_readings');
      for (const c of CUSTOMERS) {
        const { rows } = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM odometer_readings WHERE customer_id = $1', [c.id]);
        if (rows[0].n > 0) continue;
        const rs = generateReadings(c, todayIso);
        for (let i = 0; i < rs.length; i += 200) {
          const chunk = rs.slice(i, i + 200);
          const values = chunk.map((_, j) => `($${j * 3 + 1}::timestamptz, $${j * 3 + 2}, $${j * 3 + 3})`).join(',');
          await db.query(`INSERT INTO odometer_readings (time, customer_id, miles) VALUES ${values}`, chunk.flatMap((r) => [r.time, c.id, r.miles]));
        }
      }
    },
    async pace(c, todayIso) {
      if (!db) return fromMemory(c, todayIso);
      try {
        const at = `${todayIso}T23:59:59Z`;
        const { rows } = await db.query<{ recent: number | null; average: number | null }>(PACE_SQL, [c.id, at]);
        const { rows: weeks } = await db.query<{ bucket: string; miles: number }>(weeksSql(timescale), [c.id, at]);
        const r = rows[0];
        if (r?.recent == null || r.average == null || weeks.length === 0) return fromMemory(c, todayIso, 'No readings in the database for this date, so they were generated in memory.');
        return {
          customerId: c.id, today: todayIso, windowDays: RECENT_DAYS, average: Math.round(r.average), recent: Math.round(r.recent),
          weeks: weeks.reverse(), source: 'tigerdata', timescale, synthetic: true,
        };
      } catch (err) {
        return fromMemory(c, todayIso, `Database query failed (${(err as Error).message}), so the readings were generated in memory.`);
      }
    },
  };
}
