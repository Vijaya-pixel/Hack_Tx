// Chain adapters. The server only talks to this interface:
//   signerKeys(count)                   -> [pubkey...] (the wallets that will sign)
//   sendMemo({ memo, count })           -> { signature, signers: [pubkey...], custody }
//   checkMemo({ signature, expectedMemo, requiredSigners }) -> { found, memoMatches, allSigned }
//   explorer(signature)                 -> url
// Three implementations: real Solana devnet, a fake for tests, and a clearly labeled mock.
import { randomBytes } from 'node:crypto';

export function createSolanaChain() {
  // Imported lazily so the server still starts if the solana folder is missing.
  const libPromise = import('../../solana/lib.mjs');
  return {
    kind: 'solana-devnet',
    async signerKeys(count) {
      const lib = await libPromise;
      return lib.loadWallets().slice(0, count).map((w) => w.keypair.publicKey.toBase58());
    },
    async sendMemo({ memo, count }) {
      const lib = await libPromise;
      const wallets = lib.loadWallets().slice(0, count);
      if (wallets.length < count) throw new Error(`Need ${count} wallets, found ${wallets.length}`);
      const keypairs = wallets.map((w) => w.keypair);
      const signature = await lib.sendCoSigned({ memo, keypairs });
      return {
        signature, signers: keypairs.map((k) => k.publicKey.toBase58()),
        // Honest labeling: in the demo one server holds all test wallets.
        custody: 'demo-server-wallets',
      };
    },
    async checkMemo({ signature, expectedMemo, requiredSigners }) {
      const lib = await libPromise;
      const tx = await lib.getConnection().getParsedTransaction(signature, {
        commitment: 'confirmed', maxSupportedTransactionVersion: 0,
      });
      if (!tx) return { found: false, memoMatches: false, allSigned: false };
      const signers = tx.transaction.message.accountKeys.filter((k) => k.signer).map((k) => k.pubkey.toBase58());
      const memoIx = tx.transaction.message.instructions.find((i) => i.program === 'spl-memo');
      return {
        found: true,
        memoMatches: (memoIx?.parsed ?? '') === expectedMemo,
        allSigned: requiredSigners.every((s) => signers.includes(s)),
      };
    },
    explorer: (signature) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  };
}

// In-memory chain for tests: stores memos and signers, supports the same checks.
export function createFakeChain() {
  const ledger = new Map();
  const keyFor = (n) => Array.from({ length: n }, (_, i) => `FakeWallet${i + 1}`);
  return {
    kind: 'fake',
    ledger,
    async signerKeys(count) { return keyFor(count); },
    async sendMemo({ memo, count }) {
      const signature = `FAKE${randomBytes(8).toString('hex')}`;
      const signers = keyFor(count);
      ledger.set(signature, { memo, signers });
      return { signature, signers, custody: 'fake' };
    },
    async checkMemo({ signature, expectedMemo, requiredSigners }) {
      const rec = ledger.get(signature);
      if (!rec) return { found: false, memoMatches: false, allSigned: false };
      return {
        found: true,
        memoMatches: rec.memo === expectedMemo,
        allSigned: requiredSigners.every((s) => rec.signers.includes(s)),
      };
    },
    explorer: (signature) => `fake://${signature}`,
  };
}

// Mock chain for front-end development only. Responses are flagged mock:true and the UI
// must show a "simulated" label. Never use this for the real demo.
export function createMockChain() {
  const fake = createFakeChain();
  return {
    ...fake,
    kind: 'mock',
    async sendMemo(args) { return { ...(await fake.sendMemo(args)), custody: 'mock-simulated' }; },
    explorer: (signature) => `mock://simulated/${signature}`,
  };
}
