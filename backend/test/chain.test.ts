import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeChain, createMockChain, createSolanaChain } from '../src/chain.ts';
import { canonical, fingerprint } from '../src/fingerprint.ts';

describe('fingerprints', () => {
  test('key order does not matter, any change does', () => {
    assert.equal(fingerprint({ b: 2, a: 1 }), fingerprint({ a: 1, b: 2 }));
    assert.notEqual(fingerprint({ a: 1 }), fingerprint({ a: 2 }));
    assert.equal(canonical({ z: [1, { y: 2, x: 1 }] }), '{"z":[1,{"x":1,"y":2}]}');
  });

  test('matches the fingerprint function the Solana scripts use', async (t) => {
    const solana = await import('../../solana/lib.ts').catch(() => null);
    if (!solana) { t.skip('solana/ is not installed (run npm install there to enable this check)'); return; }
    const sample = { type: 'advice', id: 'abc', nested: { n: [3, 2, 1], s: 'x' } };
    assert.equal(fingerprint(sample), solana.fingerprint(sample));
  });
});

describe('real chain adapter', () => {
  test('creating it does not load Solana, and using it without solana/ installed gives a clear error', async (t) => {
    const chain = createSolanaChain(); // must not throw or crash at creation
    assert.equal(chain.kind, 'solana-devnet');
    assert.equal(chain.explorer('abc'), 'https://explorer.solana.com/tx/abc?cluster=devnet');
    const installed = await import('../../solana/lib.ts').then(() => true, () => false);
    if (installed) { t.diagnostic('solana/ is installed: skipping the missing-install check'); return; }
    await assert.rejects(() => chain.signerKeys(1), /npm install" in the solana\/ folder/);
  });
});

describe('fake chain', () => {
  test('a memo is found, matches, and records every required signer', async () => {
    const chain = createFakeChain();
    const signers = await chain.signerKeys(3);
    const sent = await chain.sendMemo({ memo: 'FC1|x|abc', count: 3 });
    assert.deepEqual(sent.signers, signers);
    const ok = await chain.checkMemo({ signature: sent.signature, expectedMemo: 'FC1|x|abc', requiredSigners: signers });
    assert.deepEqual(ok, { found: true, memoMatches: true, allSigned: true });
  });

  test('changed data, a missing signer, or an unknown signature are all caught', async () => {
    const chain = createFakeChain();
    const sent = await chain.sendMemo({ memo: 'FC1|x|abc', count: 2 });
    const wrongMemo = await chain.checkMemo({ signature: sent.signature, expectedMemo: 'FC1|x|zzz', requiredSigners: sent.signers });
    assert.equal(wrongMemo.memoMatches, false);
    const extraSigner = await chain.checkMemo({ signature: sent.signature, expectedMemo: 'FC1|x|abc', requiredSigners: [...sent.signers, 'Stranger'] });
    assert.equal(extraSigner.allSigned, false);
    const unknown = await chain.checkMemo({ signature: 'nope', expectedMemo: 'x', requiredSigners: [] });
    assert.equal(unknown.found, false);
  });

  test('the mock chain labels itself so it cannot pass for the real thing', async () => {
    const mock = createMockChain();
    assert.equal(mock.kind, 'mock');
    assert.equal((await mock.sendMemo({ memo: 'm', count: 1 })).custody, 'mock-simulated');
    assert.match(mock.explorer('abc'), /^mock:\/\/simulated\//);
  });
});
