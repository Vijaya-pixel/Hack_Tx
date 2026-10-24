// Checks a receipt against the chain: right fingerprint AND all four signers.
// Usage: npx tsx verify.ts [signature]   (defaults to the most recent receipt)
import type { ParsedInstruction, PartiallyDecodedInstruction } from '@solana/web3.js';
import { getConnection, loadReceipts, fingerprint, explorerUrl } from './lib.ts';

const receipts = loadReceipts();
const wanted = process.argv[2];
const receipt = wanted ? receipts.find((r) => r.signature === wanted) : receipts.at(-1);
if (!receipt) throw new Error('No receipt found. Run npm run pact first.');

const connection = getConnection();
const tx = await connection.getParsedTransaction(receipt.signature, {
  commitment: 'confirmed', maxSupportedTransactionVersion: 0,
});
if (!tx) { console.log('NOT FOUND on chain'); process.exit(1); }

const signers = tx.transaction.message.accountKeys.filter((k) => k.signer).map((k) => k.pubkey.toBase58());
const isMemo = (i: ParsedInstruction | PartiallyDecodedInstruction): i is ParsedInstruction =>
  'program' in i && i.program === 'spl-memo';
const memoIx = tx.transaction.message.instructions.find(isMemo);
const onChainMemo = typeof memoIx?.parsed === 'string' ? memoIx.parsed : '';
const recomputed = fingerprint(receipt.payload);
const expectedMemo = `FC1|${receipt.type}|${recomputed}`;

const hashMatches = onChainMemo === expectedMemo;
const allSigned = receipt.payload.members.every((m) => signers.includes(m));

console.log(`${receipt.type.toUpperCase()}  ${explorerUrl(receipt.signature)}`);
console.log(`Fingerprint matches chain : ${hashMatches ? 'YES' : 'NO (data was changed!)'}`);
console.log(`All four friends signed   : ${allSigned ? 'YES' : 'NO'}`);
console.log(hashMatches && allSigned ? '\nVERIFIED' : '\nTAMPERED OR INVALID');
process.exit(hashMatches && allSigned ? 0 : 1);
