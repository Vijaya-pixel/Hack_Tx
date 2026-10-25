// Offline test: builds and checks a multi-signer memo transaction WITHOUT using the network.
import { Keypair } from '@solana/web3.js';
import { buildMemoTx, fingerprint, canonical, MEMO_PROGRAM_ID } from './lib.ts';

let failures = 0;
const check = (label: string, ok: boolean): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
};

const keypairs = [1, 2, 3, 4].map(() => Keypair.generate());
const payload = { type: 'advice', customer: 'demo-1', option: 'hybrid',
  members: keypairs.map((k) => k.publicKey.toBase58()).sort() };

check('same data gives same fingerprint (key order does not matter)',
  fingerprint({ b: 2, a: 1 }) === fingerprint({ a: 1, b: 2 }));
check('changing one field changes the fingerprint',
  fingerprint(payload) !== fingerprint({ ...payload, option: 'buyout' }));
check('canonical is stable', canonical({ z: [1, { y: 2, x: 1 }] }) === '{"z":[1,{"x":1,"y":2}]}');

const memo = `ADV1|advice|${fingerprint(payload)}`;
const args = { memo, keypairs, blockhash: '11111111111111111111111111111111', lastValidBlockHeight: 1 };
const tx = buildMemoTx(args);

check('transaction has 4 signatures', tx.signatures.length === 4);
check('all four signatures are valid', tx.verifySignatures());
const ix = tx.instructions[0];
check('uses the memo program', ix.programId.equals(MEMO_PROGRAM_ID));
check('all four are required signers', ix.keys.length === 4 && ix.keys.every((k) => k.isSigner));
check('memo text is on the transaction', ix.data.toString('utf8') === memo);
check('serialized size fits in a transaction (<1232 bytes)', tx.serialize().length < 1232);

// tamper test: a changed signature must fail verification
const tampered = buildMemoTx(args);
const sig = tampered.signatures[2].signature;
if (sig) sig[0] ^= 0xff;
check('a tampered signature is rejected', !tampered.verifySignatures());

console.log(failures ? `\n${failures} check(s) failed` : '\nAll offline checks passed');
process.exit(failures ? 1 : 0);
