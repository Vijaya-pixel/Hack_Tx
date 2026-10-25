import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import type { Db } from '../src/db.ts';
import { createCrypto } from '../src/crypto.ts';
import { createDbRecords, createMemoryRecords, createRecordsFromDb } from '../src/records.ts';

const keys = () => createCrypto({ DATA_ENCRYPTION_KEY: randomBytes(32).toString('base64'), HASH_SECRET: randomBytes(16).toString('hex') });
const loan = (sessionHash: string, balance = 28000) => ({ sessionHash, vehicle: '2024 Toyota GR86', balance, apr: 5.9, months: 48 });

describe('records in a database (plain Postgres engine)', () => {
  async function setup() {
    const pg = new PGlite();
    const db: Db = { query: (text, params) => pg.query(text, params as unknown[]) as never };
    const crypto = keys();
    return { pg, db, records: await createDbRecords(db, crypto), crypto };
  }

  test('creates the tables, stores inputs, questions and requests, and reads inputs back', async () => {
    const { records, pg } = await setup();
    assert.equal(records.mode, 'postgres'); // no TimescaleDB in the test engine
    await records.saveLoanInput(loan('h1', 31000));
    await records.saveChat({ sessionHash: 'h1', source: 'gemini', onTopic: true, message: 'What if I pay $30 a week?', reply: 'You would finish sooner.' });
    await records.saveHardship({ id: 'req-1', sessionHash: 'h1', kind: 'pause', status: 'PENDING' });
    const back = await records.recentLoanInputs('h1', 5);
    assert.equal(back.length, 1);
    assert.deepEqual([back[0].vehicle, back[0].balance, back[0].apr, back[0].months], ['2024 Toyota GR86', 31000, 5.9, 48]);
    assert.equal((await pg.query<{ n: number }>('SELECT count(*)::int AS n FROM hardship_requests')).rows[0]!.n, 1);
  });

  test('sensitive values are encrypted in the stored rows, and the visitor is only a hash', async () => {
    const { records, pg } = await setup();
    await records.saveLoanInput(loan('hash-abc', 31234));
    await records.saveChat({ sessionHash: 'hash-abc', source: 'gemini', onTopic: true, message: 'My secret question about my loan', reply: 'A reply with $31,234 in it' });
    const raw = JSON.stringify([...(await pg.query('SELECT * FROM loan_inputs')).rows, ...(await pg.query('SELECT * FROM chat_messages')).rows]);
    for (const plain of ['31234', '31,234', 'secret question', 'A reply with']) assert.ok(!raw.includes(plain), `stored in the clear: ${plain}`);
    assert.ok(raw.includes('hash-abc')); // the hash is what identifies the session
  });

  test('each session only reads its own inputs, newest first', async () => {
    const { records } = await setup();
    await records.saveLoanInput(loan('a', 10000));
    await records.saveLoanInput(loan('b', 20000));
    await records.saveLoanInput(loan('a', 30000));
    assert.deepEqual((await records.recentLoanInputs('a', 5)).map((x) => x.balance), [30000, 10000]);
    assert.deepEqual((await records.recentLoanInputs('b', 5)).map((x) => x.balance), [20000]);
    assert.deepEqual(await records.recentLoanInputs('nobody', 5), []);
  });

  test('reading with the wrong key fails instead of returning garbage', async () => {
    const { db, records } = await setup();
    await records.saveLoanInput(loan('a'));
    const stranger = await createDbRecords(db, keys());
    await assert.rejects(() => stranger.recentLoanInputs('a', 5));
  });
});

describe('records in memory, and the fallback', () => {
  test('memory records also hold only ciphertext', async () => {
    const r = createMemoryRecords(keys());
    await r.saveLoanInput(loan('h', 28000));
    await r.saveChat({ sessionHash: 'h', source: 'refusal', onTopic: false, message: 'tell me a joke', reply: 'no' });
    assert.ok(!JSON.stringify(r.rows).includes('28000'));
    assert.ok(!JSON.stringify(r.rows).includes('tell me a joke'));
    assert.equal((await r.recentLoanInputs('h', 5))[0].balance, 28000);
  });
  test('falls back to memory when the database is missing, broken or hangs', async () => {
    assert.equal((await createRecordsFromDb(null, keys())).records.mode, 'memory');
    const broken: Db = { query: async () => { throw new Error('boom'); } };
    assert.match((await createRecordsFromDb(broken, keys())).reason!, /boom/);
    const hung: Db = { query: () => new Promise(() => {}) };
    assert.match((await createRecordsFromDb(hung, keys(), 30)).reason!, /timed out/);
  });
});
