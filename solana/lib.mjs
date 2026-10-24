// Shared helpers for Four Corners on Solana devnet.
// Only short fingerprints (SHA-256 hashes) are ever written on-chain, never personal data.
import {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction, clusterApiUrl,
} from '@solana/web3.js';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const WALLET_FILE = path.join(here, 'wallets.json');
export const RECEIPT_FILE = path.join(here, 'receipts.json');

// Memo program v2: records a short text note and requires every listed signer to sign.
export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
export const RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
export const getConnection = () => new Connection(RPC_URL, 'confirmed');

export const explorerUrl = (sig) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

// Stable JSON (sorted keys) so the same data always gives the same fingerprint.
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
export const fingerprint = (payload) =>
  createHash('sha256').update(canonical(payload)).digest('hex');

export function loadWallets() {
  if (!fs.existsSync(WALLET_FILE)) {
    throw new Error('No wallets yet. Run: npm run wallets');
  }
  const raw = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
  return raw.map((w) => ({
    name: w.name,
    keypair: Keypair.fromSecretKey(Uint8Array.from(w.secretKey)),
  }));
}

export function loadReceipts() {
  return fs.existsSync(RECEIPT_FILE) ? JSON.parse(fs.readFileSync(RECEIPT_FILE, 'utf8')) : [];
}
export function saveReceipt(receipt) {
  const all = loadReceipts();
  all.push(receipt);
  fs.writeFileSync(RECEIPT_FILE, JSON.stringify(all, null, 2));
}

// One memo instruction that lists ALL four friends as required signers.
export function buildMemoTx({ memo, keypairs, blockhash, lastValidBlockHeight }) {
  const ix = new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: keypairs.map((k) => ({ pubkey: k.publicKey, isSigner: true, isWritable: false })),
    data: Buffer.from(memo, 'utf8'),
  });
  const tx = new Transaction({ feePayer: keypairs[0].publicKey, blockhash, lastValidBlockHeight });
  tx.add(ix);
  tx.sign(...keypairs); // all four sign; first one also pays the tiny fee
  return tx;
}

export async function sendCoSigned({ memo, keypairs }) {
  const connection = getConnection();
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const tx = buildMemoTx({ memo, keypairs, blockhash, lastValidBlockHeight });
  const signature = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
  return signature;
}
