// Prints which Snowflake parts work. Never prints secrets.
import { connectFromEnv, cortexModel, redact } from '../src/snowflake.ts';

const mark = (ok: boolean) => (ok ? 'OK  ' : 'FAIL');
const model = cortexModel();

const { client, reason } = await connectFromEnv();
if (!client) { console.log(`${mark(false)} connect: ${reason}`); process.exit(1); }
console.log(`${mark(true)} connect`);

let failed = false;
const step = async (name: string, fn: () => Promise<string | void>) => {
  try { const note = await fn(); console.log(`${mark(true)} ${name}${note ? `: ${note}` : ''}`); }
  catch (e) { failed = true; console.log(`${mark(false)} ${name}: ${redact((e as Error).message)}`); return e as Error; }
};

await step('SELECT 1', async () => { await client.query('SELECT 1 AS X'); });
await step('tables (CUSTOMERS, LOANS, HARDSHIP_REQUESTS)', async () => {
  const rows = await client.query<{ N: number }>('SELECT COUNT(*) AS N FROM CUSTOMERS');
  await client.query('SELECT COUNT(*) FROM LOANS');
  await client.query('SELECT COUNT(*) FROM HARDSHIP_REQUESTS');
  return `${rows[0].N} customer row(s)`;
});
// Cortex: new accounts use AI_COMPLETE. Try the configured model first, then a few common ones, and report which work.
const candidates = [...new Set([model, 'llama3.1-70b', 'mistral-large2', 'llama3.1-8b', 'claude-3-5-sonnet', 'snowflake-arctic'])];
let working: string | null = null;
let lastError: Error | null = null;
for (const m of candidates) {
  try {
    const rows = await client.query<{ R: string }>('SELECT AI_COMPLETE(?, ?) AS R', [m, 'Reply with the single word: ok']);
    console.log(`${mark(true)} Cortex AI_COMPLETE (${m}): ${String(rows[0].R).trim().slice(0, 40)}`);
    working = m;
    break;
  } catch (e) {
    lastError = e as Error;
    console.log(`${mark(false)} Cortex AI_COMPLETE (${m}): ${redact((e as Error).message).slice(0, 140)}`);
  }
}
if (working) {
  if (working !== model) console.log(`\nSet SNOWFLAKE_CORTEX_MODEL=${working} in backend/.env, then restart the API.`);
} else {
  failed = true;
  if (lastError && /trial/i.test(lastError.message)) {
    console.log('\nSnowflake does not allow its AI functions (Cortex) on trial accounts, whatever the model. Everything else works.');
    console.log('Options: upgrade the Snowflake account, or let Gemini answer Ask (set GEMINI_API_KEY; it is used automatically when Cortex fails).');
  } else if (lastError && /region|unavailable|not available|unknown model|cross/i.test(lastError.message)) {
    console.log("\nNo model worked. Models can depend on your account's region. As ACCOUNTADMIN you can allow cross-region use:");
    console.log("  ALTER ACCOUNT SET CORTEX_ENABLED_CROSS_REGION = 'ANY_REGION';");
  }
}
await client.close();
process.exit(failed ? 1 : 0);
