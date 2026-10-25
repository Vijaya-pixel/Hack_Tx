// Synthetic card purchases for the demo customer. Deterministic: the same week start gives the same rows.
import { roundUp } from './loan.ts';

export interface Tx {
  id?: number;
  ts: string; // ISO timestamp
  customerId: string;
  merchant: string;
  category: string;
  amountCents: number;
  roundupCents: number;
}

export const CUSTOMER_ID = 'alex';
export const SEED_WEEKS = 12;
const DAY = 86_400_000;

// Small seeded random generator (mulberry32).
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Kind { merchants: string[]; category: string; min: number; max: number }
const KINDS: Record<string, Kind> = {
  coffee: { merchants: ['Cedar Bean Coffee', 'Roast & Co'], category: 'Coffee', min: 380, max: 690 },
  lunch: { merchants: ['Taco Verde', 'Noodle House', 'Green Bowl'], category: 'Lunch', min: 890, max: 1640 },
  groceries: { merchants: ['Fresh Mart', 'Neighborhood Grocer'], category: 'Groceries', min: 3200, max: 11400 },
  gas: { merchants: ['Gulf Stop', 'Quick Fuel'], category: 'Gas', min: 3600, max: 5900 },
  dining: { merchants: ['Bella Pasta', 'Smokehouse Grill'], category: 'Dining', min: 2400, max: 5800 },
  pharmacy: { merchants: ['CityCare Pharmacy'], category: 'Pharmacy', min: 700, max: 2600 },
  convenience: { merchants: ['Corner Mart', 'QuickStop'], category: 'Convenience', min: 250, max: 1450 },
  online: { merchants: ['ShopNow', 'PageTurner Books'], category: 'Shopping', min: 1500, max: 6400 },
  streaming: { merchants: ['StreamBox'], category: 'Subscriptions', min: 999, max: 1599 },
};

const pick = <T>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)];

function make(r: () => number, kind: string, ts: Date): Tx {
  const k = KINDS[kind];
  const amountCents = k.min + Math.floor(r() * (k.max - k.min + 1));
  return { ts: ts.toISOString(), customerId: CUSTOMER_ID, merchant: pick(r, k.merchants), category: k.category, amountCents, roundupCents: roundUp(amountCents) };
}

// Monday 00:00 UTC of the week containing `now`.
export function weekStart(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY);
}

// 12 complete weeks of purchases, plus the current week up to `now`, oldest first.
export function generateTransactions(now: Date = new Date(), weeks = SEED_WEEKS): Tx[] {
  const end = weekStart(now);
  const start = end.getTime() - weeks * 7 * DAY;
  const r = rng(Math.floor(start / DAY));
  const out: Tx[] = [];
  const days = weeks * 7 + Math.floor((now.getTime() - end.getTime()) / DAY) + 1; // through today
  for (let d = 0; d < days; d++) {
    const day = start + d * DAY;
    const dow = new Date(day).getUTCDay(); // 0 = Sunday
    const weekday = dow >= 1 && dow <= 5;
    const at = (hour: number) => new Date(day + hour * 3_600_000 + Math.floor(r() * 3_000_000));
    if (weekday && r() < 0.8) out.push(make(r, 'coffee', at(7.5)));
    if (weekday && r() < 0.65) out.push(make(r, 'lunch', at(12)));
    if (dow === 3 || dow === 6) out.push(make(r, 'groceries', at(17.5)));
    if (dow === 1 || (dow === 5 && r() < 0.4)) out.push(make(r, 'gas', at(18)));
    if ((dow === 5 || dow === 6) && r() < 0.5) out.push(make(r, 'dining', at(19.5)));
    if (r() < 0.55) out.push(make(r, 'convenience', at(14)));
    if (r() < 0.25) out.push(make(r, 'online', at(21)));
    if (r() < 0.06) out.push(make(r, 'pharmacy', at(15)));
    if (d % 28 === 3) out.push(make(r, 'streaming', at(9)));
  }
  return out.filter((t) => new Date(t.ts).getTime() <= now.getTime());
}

// One random purchase for the live demo feed.
export function randomPurchase(now: Date = new Date(), r: () => number = Math.random): Tx {
  return make(r, pick(r, ['coffee', 'lunch', 'groceries', 'gas', 'dining', 'convenience', 'coffee', 'lunch']), now);
}
