// The HTTP API. Everything it needs comes in through `deps`, so tests can pass fakes.
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { biweekly, compare, payoff, percentPaid, roundMoney } from './loan.ts';
import type { Payoff } from './loan.ts';
import type { Store } from './store.ts';
import type { Simulator } from './simulator.ts';
import { CUSTOMER_ID, weekStart } from './seed.ts';
import { HARDSHIP_KINDS } from './customers.ts';
import { withPayment } from './customers.ts';
import type { Customer, CustomerRepo, HardshipKind } from './customers.ts';
import { explain, PRESETS } from './explain.ts';
import type { Preset } from './explain.ts';
import type { SnowflakeClient } from './snowflake.ts';

export interface Deps {
  store: Store;
  storeReason?: string;
  simulator: Simulator;
  repo: CustomerRepo;
  snowflake: SnowflakeClient | null;
  snowflakeReason?: string;
  cortexModel: string;
  now?: () => Date;
}

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const MAX_EXTRA = 100;
const dollars = (cents: number): number => roundMoney(cents / 100);

function parseExtra(raw: unknown, fallback: number): number {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new HttpError(400, 'extraPerWeek must be a number');
  if (n < 0 || n > MAX_EXTRA) throw new HttpError(400, `extraPerWeek must be between 0 and ${MAX_EXTRA}`);
  return n;
}

// Optional "try your own loan" values on the query string. Anything missing keeps Vijay's value.
export const LOAN_LIMITS = { balance: [1000, 200000], apr: [0, 30], months: [6, 120] } as const;
interface LoanOverride { balance?: number; apr?: number; monthsRemaining?: number; originalAmount?: number }

function loanOverride(q: Request['query']): LoanOverride | null {
  const read = (key: string, label: string, min: number, max: number): number | undefined => {
    const raw = q[key];
    if (raw === undefined || raw === '') return undefined;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `${label} must be a number from ${min} to ${max}`);
    return n;
  };
  const balance = read('balance', 'balance', ...LOAN_LIMITS.balance);
  const apr = read('apr', 'apr', ...LOAN_LIMITS.apr);
  const months = read('months', 'months', ...LOAN_LIMITS.months);
  const originalAmount = read('original', 'original', ...LOAN_LIMITS.balance);
  if (months !== undefined && !Number.isInteger(months)) throw new HttpError(400, 'months must be a whole number');
  if (balance === undefined && apr === undefined && months === undefined && originalAmount === undefined) return null;
  if (originalAmount !== undefined && balance !== undefined && originalAmount < balance) throw new HttpError(400, 'original must be at least the balance');
  return { balance, apr, monthsRemaining: months, originalAmount };
}

const curve = (p: Payoff) => p.schedule.map((s) => ({ month: s.month, balance: roundMoney(s.balance) }));

export function createApp(deps: Deps) {
  const app = express();
  app.use(express.json());
  // Answers change when the code or the numbers change, so never let a browser or proxy reuse an old one.
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  const now = deps.now ?? (() => new Date());

  let cached: { at: number; value: Customer } | null = null;
  const customer = async (): Promise<Customer> => {
    if (cached && Date.now() - cached.at < 60_000) return cached.value;
    const value = await deps.repo.getCustomer(CUSTOMER_ID);
    cached = { at: Date.now(), value };
    return value;
  };

  // Vijay's real weekly average from the store, and the plan built from it.
  // The customer, with any values the judge typed in replacing Vijay's. `custom` says whether that happened.
  async function customerFor(q: Request['query']): Promise<{ c: Customer; custom: boolean; percent: number | null }> {
    const stored = await customer();
    const o = loanOverride(q);
    if (!o) return { c: stored, custom: false, percent: percentPaid(stored.originalAmount, stored.balance) };
    const balance = o.balance ?? stored.balance;
    const c = withPayment({ ...stored, balance, apr: o.apr ?? stored.apr, monthsRemaining: o.monthsRemaining ?? stored.monthsRemaining, originalAmount: o.originalAmount ?? balance });
    // Without an original amount we can't say how much is paid off.
    return { c, custom: true, percent: o.originalAmount === undefined ? null : percentPaid(o.originalAmount, balance) };
  }

  async function planFor(rawExtra: unknown, q: Request['query'], multiplier = 1) {
    const [{ c }, summary] = await Promise.all([customerFor(q), deps.store.roundups(CUSTOMER_ID, now())]);
    const avg = summary.avgPerWeekCents / 100;
    const extra = Math.min(MAX_EXTRA, parseExtra(rawExtra, Math.min(MAX_EXTRA, avg)) * multiplier);
    const pay = c.monthlyPayment;
    const start = now();
    const plan = compare(payoff(c.balance, c.apr, pay), payoff(c.balance, c.apr, pay, extra), start);
    const bi = biweekly(c.balance, c.apr, pay, start);
    return { c, avg, extra, plan, bi };
  }

  app.get('/api/health', (_req, res) => {
    res.json({
      database: { mode: deps.store.mode, ...(deps.storeReason ? { fallbackReason: deps.storeReason } : {}) },
      snowflake: { connected: deps.snowflake !== null, customerSource: deps.repo.source, ...(deps.snowflakeReason ? { reason: deps.snowflakeReason } : {}) },
      ai: deps.snowflake ? { mode: 'cortex', model: deps.cortexModel } : { mode: 'template' },
      simulator: { running: deps.simulator.running() },
    });
  });

  app.get('/api/customer', async (req, res) => {
    const { c, custom, percent } = await customerFor(req.query);
    res.json({ ...c, monthlyPayment: roundMoney(c.monthlyPayment), percentPaid: percent, custom, source: custom ? 'custom' : deps.repo.source });
  });

  app.get('/api/roundups', async (req, res) => {
    const range = String(req.query.range ?? '12w');
    if (range !== '12w') throw new HttpError(400, 'Only range=12w is supported');
    const s = await deps.store.roundups(CUSTOMER_ID, now());
    const thisWeekKey = weekStart(now()).toISOString().slice(0, 10);
    const thisWeek = dollars(s.weekly.find((w) => w.week === thisWeekKey)?.roundupCents ?? 0);
    const lastDone = s.weekly.filter((w) => w.week < thisWeekKey).at(-1);
    const avg = dollars(s.avgPerWeekCents);
    // An empty current week shows last week instead, so the headline card never reads $0.
    const highlight = thisWeek > 0 || !lastDone
      ? { label: 'This week', amount: thisWeek }
      : { label: 'Last week', amount: dollars(lastDone.roundupCents) };
    res.json({
      range,
      thisWeek,
      highlight: { ...highlight, progress: avg > 0 ? Math.round(Math.min(1, highlight.amount / avg) * 1000) / 1000 : 0 },
      source: s.mode,
      weeks: s.completedWeeks,
      total: dollars(s.totalCents),
      avgPerWeek: dollars(s.avgPerWeekCents),
      weekly: s.weekly.map((w) => ({ week: w.week, amount: dollars(w.roundupCents), count: w.count })),
      daily: s.daily.map((d) => ({ day: d.day, amount: dollars(d.roundupCents), count: d.count })),
    });
  });

  app.get('/api/feed', async (req, res) => {
    const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new HttpError(400, 'limit must be a whole number from 1 to 100');
    const rows = await deps.store.feed(CUSTOMER_ID, limit);
    res.json({
      running: deps.simulator.running(),
      items: rows.map((t) => ({ id: t.id, ts: t.ts, merchant: t.merchant, category: t.category, amount: dollars(t.amountCents), roundup: dollars(t.roundupCents) })),
    });
  });

  app.post('/api/simulator/start', (_req, res) => { deps.simulator.start(); res.json({ running: true }); });
  app.post('/api/simulator/stop', (_req, res) => { deps.simulator.stop(); res.json({ running: false }); });

  app.get('/api/plan', async (req, res) => {
    const { c, avg, extra, plan, bi } = await planFor(req.query.extraPerWeek, req.query);
    res.json({
      extraPerWeek: roundMoney(extra),
      avgPerWeek: roundMoney(avg),
      maxExtraPerWeek: MAX_EXTRA,
      monthlyPayment: roundMoney(c.monthlyPayment),
      standard: { months: plan.standard.months, totalInterest: roundMoney(plan.standard.totalInterest), payoffDate: plan.standard.payoffDate, schedule: curve(plan.standard) },
      withRoundUps: { months: plan.withRoundUps.months, totalInterest: roundMoney(plan.withRoundUps.totalInterest), payoffDate: plan.withRoundUps.payoffDate, schedule: curve(plan.withRoundUps) },
      kpis: { monthsSaved: plan.monthsSaved, interestSaved: roundMoney(plan.interestSaved), newPayoffDate: plan.withRoundUps.payoffDate },
      biweekly: { monthsSaved: bi.monthsSaved, interestSaved: roundMoney(bi.interestSaved), newPayoffDate: bi.withRoundUps.payoffDate },
    });
  });

  app.get('/api/explain', async (req, res) => {
    const preset = String(req.query.preset ?? 'worth') as Preset;
    if (!PRESETS.includes(preset)) throw new HttpError(400, `preset must be one of ${PRESETS.join(', ')}`);
    const { c, avg, extra, plan, bi } = await planFor(req.query.extraPerWeek, req.query, preset === 'double' ? 2 : 1);
    const out = await explain({ customer: c, preset, extraPerWeek: roundMoney(extra), avgPerWeek: roundMoney(avg), plan, biweekly: bi }, deps.snowflake, deps.cortexModel);
    res.json({ ...out, extraPerWeek: roundMoney(extra) });
  });

  app.post('/api/hardship', async (req, res) => {
    const kind = (req.body as { kind?: unknown } | undefined)?.kind;
    if (typeof kind !== 'string' || !HARDSHIP_KINDS.includes(kind as HardshipKind)) {
      throw new HttpError(400, `kind must be one of ${HARDSHIP_KINDS.join(', ')}`);
    }
    res.status(201).json(await deps.repo.saveHardship(CUSTOMER_ID, kind as HardshipKind));
  });

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found')));
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return void res.status(err.status).json({ error: err.message });
    if ((err as { type?: string }).type === 'entity.parse.failed') return void res.status(400).json({ error: 'Invalid JSON' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
  });
  return app;
}
