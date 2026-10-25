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
const err = await step(`Cortex (${model})`, async () => {
  const rows = await client.query<{ R: string }>('SELECT SNOWFLAKE.CORTEX.COMPLETE(?, ?) AS R', [model, 'Reply with the single word: ok']);
  return String(rows[0].R).trim().slice(0, 40);
});
if (err && /region|unavailable|not available|unknown model|cross/i.test(err.message)) {
  console.log(`\nModel "${model}" may not be offered in your account's region. Either set SNOWFLAKE_CORTEX_MODEL to a model your region has, or enable cross-region inference (as ACCOUNTADMIN):`);
  console.log("  ALTER ACCOUNT SET CORTEX_ENABLED_CROSS_REGION = 'ANY_REGION';");
}
await client.close();
process.exit(failed ? 1 : 0);
