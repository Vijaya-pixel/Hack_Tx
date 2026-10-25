import { connectFromEnv } from '../src/snowflake.ts';
import { seedSnowflake } from '../src/customers.ts';

// Connect without a database or schema first, so they can be created if they don't exist yet.
const { client, reason } = await connectFromEnv({ ...process.env, SNOWFLAKE_DATABASE: undefined, SNOWFLAKE_SCHEMA: undefined });
if (!client) { console.error(reason); process.exit(1); }

const NAME = /^[A-Za-z_][A-Za-z0-9_$]*$/;
const db = process.env.SNOWFLAKE_DATABASE || 'ROUNDUP';
const schema = process.env.SNOWFLAKE_SCHEMA || 'PUBLIC';
try {
  if (!NAME.test(db) || !NAME.test(schema)) throw new Error('SNOWFLAKE_DATABASE and SNOWFLAKE_SCHEMA may only contain letters, digits, _ and $');
  if (process.env.SNOWFLAKE_WAREHOUSE) await client.query(`USE WAREHOUSE ${process.env.SNOWFLAKE_WAREHOUSE}`);
  // A limited role may not be allowed to create these, but they can already exist (and be granted to it), so a failure here is fine.
  for (const sql of [`CREATE DATABASE IF NOT EXISTS ${db}`, `CREATE SCHEMA IF NOT EXISTS ${db}.${schema}`]) {
    try { await client.query(sql); } catch { /* the next USE SCHEMA tells us if it really is missing */ }
  }
  await client.query(`USE SCHEMA ${db}.${schema}`);
  await seedSnowflake(client);
  console.log(`Created CUSTOMERS, LOANS and HARDSHIP_REQUESTS in ${db}.${schema} and seeded the demo customer.`);
} catch (e) {
  console.error('Setup failed:', (e as Error).message);
  console.error('Check that SNOWFLAKE_WAREHOUSE exists and your role can create databases and tables.');
  process.exitCode = 1;
} finally { await client.close(); }
