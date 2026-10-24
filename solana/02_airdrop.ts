// Gives Arlo (the fee payer) free devnet SOL. Only the fee payer needs funds.
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getConnection, loadWallets } from './lib.ts';

const [payer] = loadWallets();
const connection = getConnection();
console.log(`Requesting 1 devnet SOL for ${payer.name} (${payer.keypair.publicKey.toBase58()})...`);
try {
  const sig = await connection.requestAirdrop(payer.keypair.publicKey, LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, 'confirmed');
  const bal = await connection.getBalance(payer.keypair.publicKey);
  console.log(`Done. Balance: ${bal / LAMPORTS_PER_SOL} SOL`);
} catch (err) {
  console.error('Airdrop failed (devnet faucets are often rate limited):', (err as Error).message);
  console.error('Fix: open https://faucet.solana.com, choose Devnet, and paste this address:');
  console.error(payer.keypair.publicKey.toBase58());
  process.exit(1);
}
