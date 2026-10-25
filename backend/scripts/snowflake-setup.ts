import { connectFromEnv } from '../src/snowflake.ts';
import { seedSnowflake } from '../src/customers.ts';

const { client, reason } = await connectFromEnv();
if (!client) { console.error(reason); process.exit(1); }
try {
  await seedSnowflake(client);
  console.log('Created CUSTOMERS, LOANS and HARDSHIP_REQUESTS and seeded Jordan Parker.');
} catch (e) {
  console.error('Setup failed:', (e as Error).message);
  console.error('Check that SNOWFLAKE_WAREHOUSE, SNOWFLAKE_DATABASE and SNOWFLAKE_SCHEMA exist and your role can create tables.');
  process.exitCode = 1;
} finally { await client.close(); }
