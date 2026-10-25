import { createDbFromEnv } from './db.ts';
import { createStoreFromDb } from './store.ts';
import { createSimulator } from './simulator.ts';
import { connectFromEnv, cortexModel } from './snowflake.ts';
import { createLocalRepo, createSnowflakeRepo } from './customers.ts';
import { createApp } from './app.ts';
import { geminiFromEnv } from './gemini.ts';
import { cortexLlm } from './explain.ts';

let db = null;
try { db = await createDbFromEnv(); } catch (e) { console.error('Database setup failed:', (e as Error).message); }
const { store, reason: storeReason } = await createStoreFromDb(db);
const { client, reason: snowflakeReason } = await connectFromEnv();

let repo = client ? createSnowflakeRepo(client) : createLocalRepo();
if (client) {
  // If the tables aren't set up yet, say so and serve the local seed instead of failing every request.
  try { await repo.getCustomer('demo'); }
  catch (e) { console.error(`Snowflake customer lookup failed (${(e as Error).message}). Run "npm run snowflake:setup". Using the local seed.`); repo = createLocalRepo(); }
}

// Which AI answers Ask. Cortex goes first when Snowflake is connected (that is the Snowflake challenge); Gemini is the backup.
// Set AI_PROVIDER=gemini in .env to put Gemini first instead.
const cortex = client ? cortexLlm(client, cortexModel()) : null;
const gemini = geminiFromEnv();
// Cortex is tested once at startup. If the account can't use it (for example a trial account), leave it out so the
// health check and the Ask page tell the truth and no request is wasted on it.
let cortexOk = cortex;
if (cortex) {
  try {
    await Promise.race([cortex.complete('Reply with the single word: ok'), new Promise((_, rej) => setTimeout(() => rej(new Error('timed out')), 20_000))]);
  } catch (e) {
    console.log(`Snowflake Cortex is not usable, so Ask will not use it: ${(e as Error).message.slice(0, 160)}`);
    cortexOk = null;
  }
}
const llms = (process.env.AI_PROVIDER === 'gemini' ? [gemini, cortexOk] : [cortexOk, gemini]).filter((x): x is NonNullable<typeof x> => x !== null);
const app = createApp({ store, storeReason, simulator: createSimulator(store), repo, snowflake: client, snowflakeReason, cortexModel: cortexModel(), llm: llms });
const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`RoundGear API on http://localhost:${port}`);
  console.log(`  transactions: ${store.mode}${storeReason ? ` (${storeReason})` : ''}`);
  console.log(`  customer:     ${repo.source}${snowflakeReason ? ` (${snowflakeReason})` : ''}`);
  console.log(`  explanations: ${llms.length ? llms.map((l) => `${l.source === 'gemini' ? 'Google Gemini' : 'Snowflake Cortex'} (${l.model})`).join(' then ') + ', then the standard text' : 'standard text only'}`);
});
