import { createDbFromEnv } from './db.ts';
import { createStoreFromDb } from './store.ts';
import { createSimulator } from './simulator.ts';
import { createLocalRepo } from './customers.ts';
import { createApp } from './app.ts';
import { geminiFromEnv } from './gemini.ts';

let db = null;
try { db = await createDbFromEnv(); } catch (e) { console.error('Database setup failed:', (e as Error).message); }
const { store, reason: storeReason } = await createStoreFromDb(db);
const repo = createLocalRepo();

// Gemini answers Ask when GEMINI_API_KEY is set; otherwise Ask shows the standard text.
const gemini = geminiFromEnv();
const llms = gemini ? [gemini] : [];

const app = createApp({ store, storeReason, simulator: createSimulator(store), repo, llm: llms });
const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`RoundGear API on http://localhost:${port}`);
  console.log(`  transactions: ${store.mode}${storeReason ? ` (${storeReason})` : ''}`);
  console.log(`  customer:     ${repo.source} seed`);
  console.log(`  explanations: ${gemini ? `Google Gemini (${gemini.model}), then the standard text` : 'standard text only (set GEMINI_API_KEY for AI answers)'}`);
});
