import { createDbFromEnv } from './db.ts';
import { createStoreFromDb } from './store.ts';
import { createSimulator } from './simulator.ts';
import { createLocalRepo } from './customers.ts';
import { createApp } from './app.ts';
import { geminiFromEnv } from './gemini.ts';
import { createCrypto } from './crypto.ts';
import { createMemoryRecords, createRecordsFromDb } from './records.ts';

let db = null;
try { db = await createDbFromEnv(); } catch (e) { console.error('Database setup failed:', (e as Error).message); }
const { store, reason: storeReason } = await createStoreFromDb(db);
const repo = createLocalRepo();

// Keys for encrypting what visitors enter and for hashing their anonymous session id (see .env.example).
const crypto = createCrypto();
if (crypto.ephemeral) console.warn('DATA_ENCRYPTION_KEY or HASH_SECRET is not set: using temporary keys, so saved data cannot be read after a restart.');
// If the database already failed for the transactions, don't wait for it a second time.
const { records, reason: recordsReason } = store.mode === 'memory' ? { records: createMemoryRecords(crypto), reason: storeReason } : await createRecordsFromDb(db, crypto);

// Gemini answers Ask when GEMINI_API_KEY is set; otherwise Ask shows the standard text.
const gemini = geminiFromEnv();
const llms = gemini ? [gemini] : [];

const app = createApp({ store, storeReason, simulator: createSimulator(store), repo, llm: llms, records, crypto });
const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`RoundGear API on http://localhost:${port}`);
  console.log(`  transactions: ${store.mode}${storeReason ? ` (${storeReason})` : ''}`);
  console.log(`  customer:     ${repo.source} seed`);
  console.log(`  saved inputs: ${records.mode}${recordsReason ? ` (${recordsReason})` : ''}, encrypted`);
  console.log(`  explanations: ${gemini ? `Google Gemini (${gemini.model}), then the standard text` : 'standard text only (set GEMINI_API_KEY for AI answers)'}`);
});
