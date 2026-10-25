// Shared helpers for writing fingerprints to Solana devnet.
// Only short fingerprints (SHA-256 hashes) are ever written on-chain, never personal data.
import {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction, clusterApiUrl,
  type ParsedInstruction, type PartiallyDecodedInstruction,
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
export const RPC_URL: string = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
export const getConnection = (): Connection => new Connection(RPC_URL, 'confirmed');

export const explorerUrl = (sig: string): string => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

// Stable JSON (sorted keys) so the same data always gives the same fingerprint.
export function canonical(value: Json): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
export const fingerprint = (payload: Json): string =>
  createHash('sha256').update(canonical(payload)).digest('hex');

export interface WalletFileEntry { name: string; publicKey: string; secretKey: number[] }
export interface Wallet { name: string; keypair: Keypair }

export function loadWallets(): Wallet[] {
  if (!fs.existsSync(WALLET_FILE)) {
    throw new Error('No wallets yet. Run: npm run wallets');
  }
  const raw: WalletFileEntry[] = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
  return raw.map((w) => ({
    name: w.name,
    keypair: Keypair.fromSecretKey(Uint8Array.from(w.secretKey)),
  }));
}

export interface Receipt {
  type: string; // what was recorded, e.g. 'advice'
  signature: string;
  hash: string;
  payload: { members: string[]; [key: string]: Json }; // members = the public keys that signed
  at: string;
}

export function loadReceipts(): Receipt[] {
  return fs.existsSync(RECEIPT_FILE) ? JSON.parse(fs.readFileSync(RECEIPT_FILE, 'utf8')) : [];
}
export function saveReceipt(receipt: Receipt): void {
  const all = loadReceipts();
  all.push(receipt);
  fs.writeFileSync(RECEIPT_FILE, JSON.stringify(all, null, 2));
}

interface BuildArgs { memo: string; keypairs: Keypair[]; blockhash: string; lastValidBlockHeight: number }

// One memo instruction that lists every keypair as a required signer.
export function buildMemoTx({ memo, keypairs, blockhash, lastValidBlockHeight }: BuildArgs): Transaction {
  const ix = new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: keypairs.map((k) => ({ pubkey: k.publicKey, isSigner: true, isWritable: false })),
    data: Buffer.from(memo, 'utf8'),
  });
  const tx = new Transaction({ feePayer: keypairs[0].publicKey, blockhash, lastValidBlockHeight });
  tx.add(ix);
  tx.sign(...keypairs); // all of them sign; the first one also pays the tiny fee
  return tx;
}

export async function sendCoSigned({ memo, keypairs }: { memo: string; keypairs: Keypair[] }): Promise<string> {
  const connection = getConnection();
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const tx = buildMemoTx({ memo, keypairs, blockhash, lastValidBlockHeight });
  const signature = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
  return signature;
}

export interface MemoCheck { found: boolean; memoMatches: boolean; allSigned: boolean }

// Reads a transaction from the chain and checks the memo text and the signers.
export async function checkMemoOnChain(
  { signature, expectedMemo, requiredSigners }:
  { signature: string; expectedMemo: string; requiredSigners: string[] },
): Promise<MemoCheck> {
  const tx = await getConnection().getParsedTransaction(signature, {
    commitment: 'confirmed', maxSupportedTransactionVersion: 0,
  });
  if (!tx) return { found: false, memoMatches: false, allSigned: false };
  const signers = tx.transaction.message.accountKeys.filter((k) => k.signer).map((k) => k.pubkey.toBase58());
  const isMemo = (i: ParsedInstruction | PartiallyDecodedInstruction): i is ParsedInstruction =>
    'program' in i && i.program === 'spl-memo';
  const memoIx = tx.transaction.message.instructions.find(isMemo);
  return {
    found: true,
    memoMatches: (typeof memoIx?.parsed === 'string' ? memoIx.parsed : '') === expectedMemo,
    allSigned: requiredSigners.every((s) => signers.includes(s)),
  };
}
