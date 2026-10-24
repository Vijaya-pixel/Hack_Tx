// Chain adapters. The server only talks to this interface:
//   signerKeys(count)                   -> [pubkey...] (the wallets that will sign)
//   sendMemo({ memo, count })           -> { signature, signers: [pubkey...], custody }
//   checkMemo({ signature, expectedMemo, requiredSigners }) -> { found, memoMatches, allSigned }
//   explorer(signature)                 -> url
// Three implementations: real Solana devnet, a fake for tests, and a clearly labeled mock.
import { randomBytes } from 'node:crypto';
import type { Chain, MemoCheck, SentMemo } from './types.ts';

export function createSolanaChain(): Chain {
  // Imported lazily so the server still starts if the solana folder is missing.
  const libPromise = import('../../solana/lib.ts');
  return {
    kind: 'solana-devnet',
    async signerKeys(count: number): Promise<string[]> {
      const lib = await libPromise;
      return lib.loadWallets().slice(0, count).map((w) => w.keypair.publicKey.toBase58());
    },
    async sendMemo({ memo, count }: { memo: string; count: number }): Promise<SentMemo> {
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
    async checkMemo({ signature, expectedMemo, requiredSigners }: { signature: string; expectedMemo: string; requiredSigners: string[] }): Promise<MemoCheck> {
      const lib = await libPromise;
      return lib.checkMemoOnChain({ signature, expectedMemo, requiredSigners });
    },
    explorer: (signature: string) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  };
}

// In-memory chain for tests: stores memos and signers, supports the same checks.
export interface FakeChain extends Chain { ledger: Map<string, { memo: string; signers: string[] }> }

export function createFakeChain(): FakeChain {
  const ledger = new Map<string, { memo: string; signers: string[] }>();
  const keyFor = (n: number): string[] => Array.from({ length: n }, (_, i) => `FakeWallet${i + 1}`);
  return {
    kind: 'fake',
    ledger,
    async signerKeys(count: number): Promise<string[]> { return keyFor(count); },
    async sendMemo({ memo, count }: { memo: string; count: number }) {
      const signature = `FAKE${randomBytes(8).toString('hex')}`;
      const signers = keyFor(count);
      ledger.set(signature, { memo, signers });
      return { signature, signers, custody: 'fake' };
    },
    async checkMemo({ signature, expectedMemo, requiredSigners }: { signature: string; expectedMemo: string; requiredSigners: string[] }) {
      const rec = ledger.get(signature);
      if (!rec) return { found: false, memoMatches: false, allSigned: false };
      return {
        found: true,
        memoMatches: rec.memo === expectedMemo,
        allSigned: requiredSigners.every((s) => rec.signers.includes(s)),
      };
    },
    explorer: (signature: string) => `fake://${signature}`,
  };
}

// Mock chain for front-end development only. Responses are flagged mock:true and the UI
// must show a "simulated" label. Never use this for the real demo.
export function createMockChain(): Chain {
  const fake = createFakeChain();
  return {
    ...fake,
    kind: 'mock',
    async sendMemo(args: { memo: string; count: number }) { return { ...(await fake.sendMemo(args)), custody: 'mock-simulated' }; },
    explorer: (signature: string) => `mock://simulated/${signature}`,
  };
}
