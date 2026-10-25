// API server skeleton. Run: npm start   (env: see README)
import express, { type Express, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { pathToFileURL } from 'node:url';
import type { Chain } from './types.ts';
import type { Db } from './db.ts';
import { createDbFromEnv } from './db.ts';
import { createFakeChain, createMockChain, createSolanaChain } from './chain.ts';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export const bad = (msg: string): HttpError => new HttpError(400, msg);

export interface AppOptions { db?: Db | null; chain?: Chain }

// Wraps a route so errors (async or not) come back as JSON, never an HTML error page.
export const wrap = (fn: (req: Request, res: Response) => Promise<unknown> | unknown): RequestHandler =>
  (req, res) => {
    Promise.resolve().then(() => fn(req, res)).catch((err: unknown) => {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error(err);
      res.status(status).json({ error: err instanceof HttpError ? err.message : 'Something went wrong on our side.' });
    });
  };

export function createApp({ db = null, chain = createFakeChain() }: AppOptions = {}): Express {
  const app = express();
  app.use(express.json({ limit: '50kb' }));

  app.get('/api/health', wrap(async (_req, res) => {
    let database: 'connected' | 'not configured' | 'error' = 'not configured';
    if (db) {
      try { await db.query('SELECT 1'); database = 'connected'; } catch { database = 'error'; }
    }
    res.json({ ok: database !== 'error', database, chain: chain.kind });
  }));

  // Add the app's routes here.

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
  const port = Number(env.PORT || 8787);
  createApp({ db, chain }).listen(port, () =>
    console.log(`API on :${port} | database=${db ? 'configured' : 'none'} chain=${chain.kind}`));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main();
