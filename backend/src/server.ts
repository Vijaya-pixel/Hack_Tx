import { createDbFromEnv } from './db.ts';
import { createStoreFromDb } from './store.ts';
import { createSimulator } from './simulator.ts';
import { connectFromEnv, cortexModel } from './snowflake.ts';
import { createLocalRepo, createSnowflakeRepo } from './customers.ts';
import { createApp } from './app.ts';

let db = null;
try { db = await createDbFromEnv(); } catch (e) { console.error('Database setup failed:', (e as Error).message); }
const { store, reason: storeReason } = await createStoreFromDb(db);
const { client, reason: snowflakeReason } = await connectFromEnv();

let repo = client ? createSnowflakeRepo(client) : createLocalRepo();
if (client) {
  // If the tables aren't set up yet, say so and serve the local seed instead of failing every request.
  try { await repo.getCustomer('alex'); }
  catch (e) { console.error(`Snowflake customer lookup failed (${(e as Error).message}). Run "npm run snowflake:setup". Using the local seed.`); repo = createLocalRepo(); }
}

const app = createApp({ store, storeReason, simulator: createSimulator(store), repo, snowflake: client, snowflakeReason, cortexModel: cortexModel() });
const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Round-Up API on http://localhost:${port}`);
  console.log(`  transactions: ${store.mode}${storeReason ? ` (${storeReason})` : ''}`);
  console.log(`  customer:     ${repo.source}${snowflakeReason ? ` (${snowflakeReason})` : ''}`);
  console.log(`  explanations: ${client ? 'Snowflake Cortex' : 'template'}`);
});
