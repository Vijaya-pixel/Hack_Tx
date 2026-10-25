// Creates four DEVNET test wallets. Play money only.
import fs from 'node:fs';
import { Keypair } from '@solana/web3.js';
import { WALLET_FILE, type WalletFileEntry } from './lib.ts';

if (fs.existsSync(WALLET_FILE)) {
  console.log('wallets.json already exists, keeping it. Delete it to start over.');
  process.exit(0);
}
const names = ['signer-1', 'signer-2', 'signer-3', 'signer-4'];
const wallets: WalletFileEntry[] = names.map((name) => {
  const kp = Keypair.generate();
  return { name, publicKey: kp.publicKey.toBase58(), secretKey: Array.from(kp.secretKey) };
});
fs.writeFileSync(WALLET_FILE, JSON.stringify(wallets, null, 2));
console.log('Created 4 devnet wallets (saved to wallets.json, which is git-ignored):');
wallets.forEach((w) => console.log(`  ${w.name.padEnd(6)} ${w.publicKey}`));
console.log('\nNext: npm run airdrop');
