import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { PGlite } from '@electric-sql/pglite';
import { createApp } from '../src/server.ts';
import { createFakeChain } from '../src/chain.ts';
import type { Db } from '../src/db.ts';

async function serve(opts: Parameters<typeof createApp>[0]): Promise<{ base: string; close: () => void }> {
  const app = createApp(opts);
  const server: Server = await new Promise((res) => { const s = app.listen(0, () => res(s)); });
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('no port');
  return { base: `http://127.0.0.1:${addr.port}`, close: () => server.close() };
}

describe('server skeleton', () => {
  let pg: PGlite;
  before(() => { pg = new PGlite(); });
  after(async () => { await pg.close(); });

  test('health with no database says so, and is still ok', async () => {
    const s = await serve({ chain: createFakeChain() });
    const body = await (await fetch(`${s.base}/api/health`)).json();
    assert.deepEqual(body, { ok: true, database: 'not configured', chain: 'fake' });
    s.close();
  });

  test('health with a working database says connected', async () => {
    const db: Db = { query: (t, p) => pg.query(t, p as unknown[]) as never };
    const s = await serve({ db });
    assert.equal((await (await fetch(`${s.base}/api/health`)).json()).database, 'connected');
    s.close();
  });

  test('health with a broken database says error (and does not crash)', async () => {
    const db: Db = { query: async () => { throw new Error('connection refused'); } };
    const s = await serve({ db });
    const body = await (await fetch(`${s.base}/api/health`)).json();
    assert.deepEqual([body.ok, body.database], [false, 'error']);
    s.close();
  });

  test('unknown routes and malformed JSON both come back as JSON, not HTML', async () => {
    const s = await serve({});
    const missing = await fetch(`${s.base}/api/nope`);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: 'Not found.' });
    const broken = await fetch(`${s.base}/api/health`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{not json' });
    assert.equal(broken.status, 400);
    assert.equal(typeof (await broken.json()).error, 'string');
    s.close();
  });
});
