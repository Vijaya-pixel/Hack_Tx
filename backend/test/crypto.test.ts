import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createCrypto } from '../src/crypto.ts';

const env = () => ({ DATA_ENCRYPTION_KEY: randomBytes(32).toString('base64'), HASH_SECRET: randomBytes(16).toString('hex') });

describe('encryption', () => {
  test('round-trips, and the stored token does not contain the text', () => {
    const c = createCrypto(env());
    const token = c.encrypt('balance 28000 at 5.9%', 'loan_inputs');
    assert.ok(!token.includes('28000'));
    assert.equal(c.decrypt(token, 'loan_inputs'), 'balance 28000 at 5.9%');
  });
  test('every encryption uses a fresh random IV, so equal text gives different tokens', () => {
    const c = createCrypto(env());
    assert.notEqual(c.encrypt('same', 't'), c.encrypt('same', 't'));
  });
  test('tampering is detected', () => {
    const c = createCrypto(env());
    const [v, iv, tag, ct] = c.encrypt('secret', 't').split('.');
    const flipped = Buffer.from(ct, 'base64url'); flipped[0] ^= 1;
    assert.throws(() => c.decrypt([v, iv, tag, flipped.toString('base64url')].join('.'), 't'));
    assert.throws(() => c.decrypt([v, iv, 'AAAAAAAAAAAAAAAAAAAAAA', ct].join('.'), 't'));
    assert.throws(() => c.decrypt('garbage', 't'), /Unrecognised/);
  });
  test('a value cannot be moved to another table (the table name is authenticated)', () => {
    const c = createCrypto(env());
    assert.throws(() => c.decrypt(c.encrypt('x', 'loan_inputs'), 'chat_messages'));
  });
  test('another key cannot read it', () => {
    assert.throws(() => createCrypto(env()).decrypt(createCrypto(env()).encrypt('x', 't'), 't'));
  });
  test('bad key settings are rejected', () => {
    assert.throws(() => createCrypto({ DATA_ENCRYPTION_KEY: 'short' }), /32 bytes/);
    assert.throws(() => createCrypto({ DATA_ENCRYPTION_KEY: randomBytes(32).toString('base64'), HASH_SECRET: 'tiny' }), /at least 16/);
  });
  test('with no keys it uses temporary ones and says so', () => {
    const c = createCrypto({});
    assert.equal(c.ephemeral, true);
    assert.equal(c.decrypt(c.encrypt('ok', 't'), 't'), 'ok');
    assert.equal(createCrypto(env()).ephemeral, false);
  });
});

describe('hashing', () => {
  test('is stable for one secret, differs between secrets and values, and is not the input', () => {
    const e = env();
    const a = createCrypto(e), b = createCrypto(e), other = createCrypto(env());
    const h = a.hash('session-id');
    assert.equal(h, b.hash('session-id'));
    assert.notEqual(h, other.hash('session-id'));
    assert.notEqual(h, a.hash('session-id-2'));
    assert.match(h, /^[0-9a-f]{64}$/);
    assert.ok(!h.includes('session-id'));
  });
});
