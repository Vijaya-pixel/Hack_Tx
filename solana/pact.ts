// Plant the Flag: all four friends sign the same trip pact. Usage:
//   npx tsx pact.ts --city Nashville --weekend 2026-11-14 --group "Four Corners"
import { loadWallets, fingerprint, sendCoSigned, saveReceipt, explorerUrl } from './lib.ts';

const arg = (name: string, fallback: string): string => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const wallets = loadWallets();
const payload = {
  type: 'pact',
  group: arg('group', 'Four Corners'),
  city: arg('city', 'Nashville'),
  weekend: arg('weekend', '2026-11-14'),
  members: wallets.map((w) => w.keypair.publicKey.toBase58()).sort(),
};
const hash = fingerprint(payload);
const memo = `FC1|pact|${hash}`;

console.log(`Pact for ${payload.group}: ${payload.city}, weekend of ${payload.weekend}`);
console.log(`Fingerprint: ${hash}`);
const signature = await sendCoSigned({ memo, keypairs: wallets.map((w) => w.keypair) });

saveReceipt({ type: 'pact', signature, hash, payload, at: new Date().toISOString() });
console.log(`\nAll four signed. View it publicly:\n${explorerUrl(signature)}`);
