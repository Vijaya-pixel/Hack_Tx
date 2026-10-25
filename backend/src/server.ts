// API server skeleton. Run: npm start   (env: see README)
import express, { type Express, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { pathToFileURL } from 'node:url';
import type { Chain, Llm } from './types.ts';
import type { Db } from './db.ts';
import { createDbFromEnv } from './db.ts';
import { createFakeChain, createMockChain, createSolanaChain } from './chain.ts';
import { CUSTOMERS, customerById, currentPayment, type Customer } from './toyota/customers.ts';
import { advise, timeline, type Scenario } from './toyota/advice.ts';
import { explain } from './toyota/explain.ts';
import { createGeminiLlm, DEFAULT_GEMINI_MODEL } from './toyota/gemini.ts';
import { createReadingsService, type ReadingsService } from './toyota/readings.ts';
import { loanPayment, round0 } from './toyota/money.ts';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export const bad = (msg: string): HttpError => new HttpError(400, msg);

// The demo customers are defined relative to this date, so the stories hold no matter when it is run.
export const DEMO_TODAY = '2026-10-24';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface AppOptions { db?: Db | null; chain?: Chain; today?: () => string; llm?: Llm | null; readings?: ReadingsService }

// Wraps a route so errors (async or not) come back as JSON, never an HTML error page.
export const wrap = (fn: (req: Request, res: Response) => Promise<unknown> | unknown): RequestHandler =>
  (req, res) => {
    Promise.resolve().then(() => fn(req, res)).catch((err: unknown) => {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error(err);
      res.status(status).json({ error: err instanceof HttpError ? err.message : 'Something went wrong on our side.' });
    });
  };

export function createApp({ db = null, chain = createFakeChain(), today = () => process.env.DEMO_TODAY ?? DEMO_TODAY, llm = null, readings = createReadingsService(db) }: AppOptions = {}): Express {
  const app = express();
  app.use(express.json({ limit: '50kb' }));

  app.get('/api/health', wrap(async (_req, res) => {
    let database: 'connected' | 'not configured' | 'error' = 'not configured';
    if (db) {
      try { await db.query('SELECT 1'); database = 'connected'; } catch { database = 'error'; }
    }
    res.json({ ok: database !== 'error', database, chain: chain.kind, llm: llm ? 'gemini' : 'none' });
  }));

  const now = (req: Request): string => {
    const t = req.query.today;
    if (t === undefined) return today();
    if (typeof t !== 'string' || !ISO_DATE.test(t) || Number.isNaN(Date.parse(t))) throw bad('today must be a date like 2026-10-24.');
    return t;
  };
  const num = (v: unknown, name: string, min: number, max: number): number => {
    if (v === undefined || v === '') return 0;
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) throw bad(`${name} must be a number from ${min} to ${max}.`);
    return n;
  };
  // pace=recent uses the last 8 weeks of odometer readings (from TigerData) instead of the lifetime average.
  const scenario = async (req: Request, c: Customer): Promise<Scenario> => {
    const base: Scenario = {
      extraMilesPerMonth: num(req.query.extraMiles, 'extraMiles', -2000, 3000),
      extraPayment: num(req.query.extraPayment, 'extraPayment', 0, 2000),
    };
    const pace = req.query.pace;
    if (pace === undefined || pace === 'average') return base;
    if (pace !== 'recent') throw bad("pace must be 'average' or 'recent'.");
    return { ...base, pace: (await readings.pace(c, now(req))).recent };
  };
  const customer = (req: Request): Customer => {
    const c = customerById(String(req.params.id));
    if (!c) throw new HttpError(404, 'No customer with that id.');
    return c;
  };
  const summary = (c: Customer) => ({
    id: c.id, name: c.name, situation: c.situation, headline: c.headline, story: c.story,
    vehicle: c.vehicle, kind: c.contract.kind, milesNow: c.milesNow, monthlyIncome: c.monthlyIncome,
    monthlyPayment: round0(currentPayment(c, loanPayment)),
  });

  app.get('/api/customers', (_req, res) => { res.json(CUSTOMERS.map(summary)); });
  app.get('/api/customers/:id', wrap((req, res) => { res.json({ ...summary(customer(req)), contract: customer(req).contract }); }));
  app.get('/api/customers/:id/advice', wrap(async (req, res) => {
    const c = customer(req); res.json(advise(c, now(req), await scenario(req, c)));
  }));
  app.get('/api/customers/:id/timeline', wrap(async (req, res) => {
    const c = customer(req); res.json(timeline(c, now(req), await scenario(req, c)));
  }));
  app.get('/api/customers/:id/explain', wrap(async (req, res) => {
    const c = customer(req);
    res.json(await explain(c, advise(c, now(req), await scenario(req, c)), llm));
  }));
  // Odometer pace over time: average versus the last 8 weeks, plus weekly points for a chart.
  app.get('/api/customers/:id/pace', wrap(async (req, res) => { const c = customer(req); res.json(await readings.pace(c, now(req))); }));

  app.use((_req, res) => { res.status(404).json({ error: 'Not found.' }); });
  // Bad JSON bodies and other framework errors also come back as JSON.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = (err as { status?: number })?.status ?? 500;
    res.status(status >= 400 && status < 500 ? status : 500)
      .json({ error: status >= 400 && status < 500 ? 'Invalid request body.' : 'Something went wrong on our side.' });
  });
  return app;
}

async function main(): Promise<void> {
  const env = process.env;
  const db = await createDbFromEnv(env);
  if (!db) console.warn('DATABASE_URL is not set: running without a database.');
  const chain = env.CHAIN === 'mock' ? createMockChain() : createSolanaChain();
  const model = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const llm = env.GEMINI_API_KEY ? createGeminiLlm({ apiKey: env.GEMINI_API_KEY, model }) : null;
  if (!llm) console.warn('GEMINI_API_KEY is not set: explanations use the built-in template.');
  const readings = createReadingsService(db);
  try { await readings.init(env.DEMO_TODAY ?? DEMO_TODAY, { reseed: env.RESEED === '1' }); }
  catch (err) { console.error(`Could not set up odometer readings in the database (${(err as Error).message}). Using in-memory readings.`); }
  const port = Number(env.PORT || 8787);
  createApp({ db, chain, llm, readings }).listen(port, () =>
    console.log(`API on :${port} | database=${db ? 'configured' : 'none'} chain=${chain.kind} llm=${llm ? model : 'none'}`));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main();
