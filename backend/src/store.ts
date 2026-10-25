// Where transactions live. TigerData when DATABASE_URL works, otherwise memory, behind one interface.
import type { Db } from './db.ts';
import { bucketFloor, createContinuousAggregate, enableHypertable, refreshContinuousAggregate } from './tigerdata.ts';
import { CUSTOMER_ID, generateTransactions, weekStart, SEED_WEEKS, type Tx } from './seed.ts';

export type StoreMode = 'tigerdata' | 'postgres' | 'memory';

export interface DayTotal { day: string; roundupCents: number; count: number }
export interface WeekTotal { week: string; roundupCents: number; count: number }
export interface RoundupSummary {
  mode: StoreMode;
  daily: DayTotal[];
  weekly: WeekTotal[];      // includes the current, still-running week as the last bar
  completedWeeks: number;   // weeks the average is based on
  totalCents: number;       // round-ups over the completed weeks
  avgPerWeekCents: number;  // totalCents / completedWeeks
}

export interface Store {
  mode: StoreMode;
  roundups(customerId: string, now?: Date): Promise<RoundupSummary>;
  feed(customerId: string, limit: number): Promise<Tx[]>;
  add(tx: Tx): Promise<Tx>;
  close?(): Promise<void>;
}

const DAY = 86_400_000;
const iso = (d: Date | string): string => new Date(d).toISOString();
const dayKey = (d: Date | string): string => iso(d).slice(0, 10);

// Shared by both stores: turn daily rows into weekly bars and the average over completed weeks.
function summarize(mode: StoreMode, daily: DayTotal[], now: Date): RoundupSummary {
  const thisWeek = weekStart(now).getTime();
  const byWeek = new Map<string, WeekTotal>();
  for (const d of daily) {
    const w = dayKey(weekStart(new Date(d.day + 'T00:00:00Z')));
    const cur = byWeek.get(w) ?? { week: w, roundupCents: 0, count: 0 };
    cur.roundupCents += d.roundupCents;
    cur.count += d.count;
    byWeek.set(w, cur);
  }
  const weekly = [...byWeek.values()].sort((a, b) => a.week.localeCompare(b.week));
  const done = weekly.filter((w) => new Date(w.week + 'T00:00:00Z').getTime() < thisWeek);
  const totalCents = done.reduce((s, w) => s + w.roundupCents, 0);
  const completedWeeks = Math.max(1, Math.min(SEED_WEEKS, done.length));
  return { mode, daily, weekly, completedWeeks, totalCents, avgPerWeekCents: Math.round(totalCents / completedWeeks) };
}

export function createMemoryStore(now: Date = new Date()): Store {
  const rows: Tx[] = generateTransactions(now).map((t, i) => ({ ...t, id: i + 1 }));
  return {
    mode: 'memory',
    async roundups(customerId, at = new Date()) {
      const from = weekStart(at).getTime() - SEED_WEEKS * 7 * DAY;
      const days = new Map<string, DayTotal>();
      for (const t of rows) {
        if (t.customerId !== customerId || new Date(t.ts).getTime() < from) continue;
        const k = dayKey(t.ts);
        const cur = days.get(k) ?? { day: k, roundupCents: 0, count: 0 };
        cur.roundupCents += t.roundupCents;
        cur.count += 1;
        days.set(k, cur);
      }
      return summarize('memory', [...days.values()].sort((a, b) => a.day.localeCompare(b.day)), at);
    },
    async feed(customerId, limit) {
      return rows.filter((t) => t.customerId === customerId).sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, limit);
    },
    async add(tx) {
      const row = { ...tx, id: rows.length + 1 };
      rows.push(row);
      return row;
    },
  };
}

interface DayRow { day: Date | string; roundup_cents: number; n: number }
interface TxRow { id: number | string; ts: Date | string; customer_id: string; merchant: string; category: string; amount_cents: number; roundup_cents: number }
const toTx = (r: TxRow): Tx => ({
  id: Number(r.id), ts: iso(r.ts), customerId: r.customer_id, merchant: r.merchant, category: r.category,
  amountCents: r.amount_cents, roundupCents: r.roundup_cents,
});

const INSERT = 'INSERT INTO transactions (ts, customer_id, merchant, category, amount_cents, roundup_cents) VALUES';

// Creates the table, hypertable, daily aggregate (continuous on TigerData, a plain view elsewhere) and seeds it once.
export async function createDbStore(db: Db, now: Date = new Date()): Promise<Store> {
  await db.query(`CREATE TABLE IF NOT EXISTS transactions (
    id bigserial, ts timestamptz NOT NULL, customer_id text NOT NULL, merchant text NOT NULL,
    category text NOT NULL, amount_cents integer NOT NULL, roundup_cents integer NOT NULL)`);
  const hyper = await enableHypertable(db, { table: 'transactions', timeColumn: 'ts' });
  // Group by the full bucket expression (not a position number): continuous aggregates need to see time_bucket in GROUP BY.
  const bucket = bucketFloor(hyper, 'day', 'ts');
  const select = `SELECT ${bucket} AS day, customer_id, sum(roundup_cents)::int AS roundup_cents, count(*)::int AS n
    FROM transactions GROUP BY ${bucket}, customer_id`;
  let mode: StoreMode = 'postgres';
  if (hyper && (await createContinuousAggregate(db, { view: 'roundups_daily', query: select }))) mode = 'tigerdata';
  else await db.query(`CREATE OR REPLACE VIEW roundups_daily AS ${select}`);

  const { rows } = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM transactions WHERE customer_id = $1', [CUSTOMER_ID]);
  if (rows[0].n === 0) {
    const seed = generateTransactions(now);
    for (let i = 0; i < seed.length; i += 100) {
      const batch = seed.slice(i, i + 100);
      const params = batch.flatMap((t) => [t.ts, t.customerId, t.merchant, t.category, t.amountCents, t.roundupCents]);
      const values = batch.map((_, j) => `($${j * 6 + 1},$${j * 6 + 2},$${j * 6 + 3},$${j * 6 + 4},$${j * 6 + 5},$${j * 6 + 6})`).join(',');
      await db.query(`${INSERT} ${values}`, params);
    }
    if (mode === 'tigerdata') await refreshContinuousAggregate(db, 'roundups_daily');
  }

  return {
    mode,
    async roundups(customerId, at = new Date()) {
      const from = new Date(weekStart(at).getTime() - SEED_WEEKS * 7 * DAY).toISOString();
      const { rows } = await db.query<DayRow>(
        'SELECT day, roundup_cents, n FROM roundups_daily WHERE customer_id = $1 AND day >= $2 ORDER BY day', [customerId, from]);
      return summarize(mode, rows.map((r) => ({ day: dayKey(r.day), roundupCents: r.roundup_cents, count: r.n })), at);
    },
    async feed(customerId, limit) {
      const { rows } = await db.query<TxRow>('SELECT * FROM transactions WHERE customer_id = $1 ORDER BY ts DESC LIMIT $2', [customerId, limit]);
      return rows.map(toTx);
    },
    async add(tx) {
      const { rows } = await db.query<TxRow>(`${INSERT} ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [tx.ts, tx.customerId, tx.merchant, tx.category, tx.amountCents, tx.roundupCents]);
      return toTx(rows[0]);
    },
    close: () => db.close?.() ?? Promise.resolve(),
  };
}

// Falls back to memory when there is no database or setup fails. `reason` says why, for /api/health.
export async function createStoreFromDb(db: Db | null, timeoutMs = 20_000): Promise<{ store: Store; reason?: string }> {
  if (!db) return { store: createMemoryStore(), reason: 'DATABASE_URL not set' };
  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new Error('timed out')), timeoutMs); });
    return { store: await Promise.race([createDbStore(db), timeout]).finally(() => clearTimeout(timer)) };
  }
  catch (e) { return { store: createMemoryStore(), reason: `database unavailable: ${(e as Error).message}` }; }
}
