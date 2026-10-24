// Summit Stamp: after the trip, all four confirm "we made it". Usage:
//   node stamp.mjs            (links to the most recent pact)
import { loadWallets, loadReceipts, fingerprint, sendCoSigned, saveReceipt, explorerUrl } from './lib.mjs';

const receipts = loadReceipts();
const pact = [...receipts].reverse().find((r) => r.type === 'pact');
if (!pact) throw new Error('No pact found. Run: npm run pact');

const wallets = loadWallets();
const streak = receipts.filter((r) => r.type === 'stamp').length + 1;
const payload = {
  type: 'stamp',
  group: pact.payload.group,
  city: pact.payload.city,
  weekend: pact.payload.weekend,
  pactHash: pact.hash,
  streak,
  members: pact.payload.members,
};
const hash = fingerprint(payload);
const memo = `FC1|stamp|${hash}`;

console.log(`Summit Stamp #${streak} for ${payload.group} in ${payload.city}`);
const signature = await sendCoSigned({ memo, keypairs: wallets.map((w) => w.keypair) });

saveReceipt({ type: 'stamp', signature, hash, payload, at: new Date().toISOString() });
console.log(`\nStamped. Streak is now ${streak}. View it publicly:\n${explorerUrl(signature)}`);
