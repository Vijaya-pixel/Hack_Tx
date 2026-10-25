import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { redact, snowflakeConfigFromEnv, cortexModel, DEFAULT_CORTEX_MODEL, type SnowflakeClient } from '../src/snowflake.ts';
import { createLocalRepo, createSnowflakeRepo, seedSnowflake, SETUP_SQL, HARDSHIP_MESSAGE } from '../src/customers.ts';
import { buildFacts, buildPrompt, explain, numbersIn, templateExplanation, unknownNumbers, LABELS, type ExplainInput } from '../src/explain.ts';
import { biweekly, compare, monthlyPayment, payoff } from '../src/loan.ts';
import { withPayment, DEMO_SEED } from '../src/customers.ts';

function fakeClient(handler: (sql: string, binds?: unknown[]) => unknown[] | Promise<unknown[]>) {
  const calls: { sql: string; binds?: unknown[] }[] = [];
  const client: SnowflakeClient = {
    query: async (sql, binds) => { calls.push({ sql, binds }); return (await handler(sql, binds)) as never; },
    close: async () => {},
  };
  return { client, calls };
}

describe('config', () => {
  test('needs account, user and a password or key', () => {
    assert.equal(snowflakeConfigFromEnv({}), null);
    assert.equal(snowflakeConfigFromEnv({ SNOWFLAKE_ACCOUNT: 'a', SNOWFLAKE_USER: 'u' }), null);
    assert.deepEqual(snowflakeConfigFromEnv({ SNOWFLAKE_ACCOUNT: 'a', SNOWFLAKE_USER: 'u', SNOWFLAKE_PASSWORD: 'p' }),
      { account: 'a', username: 'u', warehouse: undefined, database: undefined, schema: undefined, role: undefined, password: 'p' });
  });
  test('a key path selects key-pair auth and no password is carried', () => {
    const c = snowflakeConfigFromEnv({ SNOWFLAKE_ACCOUNT: 'a', SNOWFLAKE_USER: 'u', SNOWFLAKE_PASSWORD: 'p', SNOWFLAKE_PRIVATE_KEY_PATH: '/k.p8', SNOWFLAKE_PRIVATE_KEY_PASSPHRASE: 'x' })!;
    assert.equal(c.privateKeyPath, '/k.p8');
    assert.equal(c.privateKeyPass, 'x');
    assert.equal(c.password, undefined);
  });
  test('model default and override; redact hides secrets', () => {
    assert.equal(cortexModel({}), DEFAULT_CORTEX_MODEL);
    assert.equal(cortexModel({ SNOWFLAKE_CORTEX_MODEL: 'llama3.1-70b' }), 'llama3.1-70b');
    assert.equal(redact('bad login hunter2 for u', { SNOWFLAKE_PASSWORD: 'hunter2' }), 'bad login *** for u');
  });
});

describe('customer repos', () => {
  test('local repo gives Vijay with a computed payment and stores requests as pending', async () => {
    const repo = createLocalRepo();
    const c = await repo.getCustomer('demo');
    assert.equal(c.name, 'Vijay');
    assert.ok(Math.abs(c.monthlyPayment - 656) < 1);
    const r = await repo.saveHardship('demo', 'pause');
    assert.equal(r.status, 'PENDING');
    assert.equal(r.message, HARDSHIP_MESSAGE);
  });
  test('snowflake repo reads with bound parameters and inserts hardship requests', async () => {
    const { client, calls } = fakeClient((sql) => /FROM CUSTOMERS/.test(sql)
      ? [{ CUSTOMER_ID: 'demo', NAME: 'Vijay', VEHICLE: '2024 Toyota RAV4 Hybrid', ORIGINAL_AMOUNT: 34500, BALANCE: 28000, APR: 5.9, MONTHS_REMAINING: 48 }] : []);
    const repo = createSnowflakeRepo(client);
    const c = await repo.getCustomer('demo');
    assert.equal(c.balance, 28000);
    assert.equal(c.originalAmount, 34500);
    assert.deepEqual(calls[0].binds, ['demo']);
    const r = await repo.saveHardship('demo', 'biweekly');
    assert.equal(r.storedIn, 'snowflake');
    assert.match(calls[1].sql, /INSERT INTO HARDSHIP_REQUESTS/);
    assert.equal(calls[1].binds![1], 'demo');
    assert.equal(calls[1].binds![2], 'biweekly');
  });
  test('a missing customer is an error', async () => {
    const { client } = fakeClient(() => []);
    await assert.rejects(() => createSnowflakeRepo(client).getCustomer('nobody'), /No customer/);
  });
  test('setup creates the three tables and seeds Vijay', async () => {
    const { client, calls } = fakeClient(() => []);
    await seedSnowflake(client);
    const sql = calls.map((c) => c.sql).join('\n');
    for (const t of ['CUSTOMERS', 'LOANS', 'HARDSHIP_REQUESTS']) assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${t}`));
    assert.match(sql, /ADD COLUMN IF NOT EXISTS ORIGINAL_AMOUNT/);
    assert.match(sql, /INSERT INTO LOANS/);
  });
});

describe('explanations', () => {
  const customer = withPayment(DEMO_SEED);
  const pay = customer.monthlyPayment;
  const mk = (preset: ExplainInput['preset'] = 'worth', extra = 12): ExplainInput => ({
    customer, preset, extraPerWeek: extra, avgPerWeek: 11.42,
    plan: compare(payoff(28000, 5.9, pay), payoff(28000, 5.9, pay, extra), new Date('2026-10-24T00:00:00Z')),
    biweekly: biweekly(28000, 5.9, pay, new Date('2026-10-24T00:00:00Z')),
  });

  test('numbersIn parses money, commas and percents', () => {
    assert.deepEqual(numbersIn('$1,234.50 at 5.9% for 48 months'), [1234.5, 5.9, 48]);
  });

  test('the number guard flags numbers that were not in the facts', () => {
    const f = buildFacts(mk());
    const good = f.lines[3];
    assert.deepEqual(unknownNumbers(good, f), []);
    assert.deepEqual(unknownNumbers('You will save $99,999 in interest.', f), [99999]);
  });

  test('a faithful Cortex reply is used and labeled', async () => {
    const input = mk();
    const f = buildFacts(input);
    const { client, calls } = fakeClient(() => [{ REPLY: `Nice! ${f.lines[3]}` }]);
    const out = await explain(input, client, 'm1');
    assert.equal(out.source, 'cortex');
    assert.equal(out.label, LABELS.cortex);
    assert.match(calls[0].sql, /SNOWFLAKE\.CORTEX\.COMPLETE\(\?, \?\)/);
    assert.equal(calls[0].binds![0], 'm1');
    assert.match(String(calls[0].binds![1]), /Copy every number exactly/);
  });

  test('a reply with an invented number is rejected and the template is shown', async () => {
    const { client } = fakeClient(() => [{ REPLY: 'You would save $9,999 in interest.' }]);
    const out = await explain(mk(), client, 'm');
    assert.equal(out.source, 'template');
    assert.equal(out.label, LABELS.template);
    assert.match(out.rejected!, /9999/);
  });

  test('Cortex errors, empty replies and timeouts fall back to the template', async () => {
    const boom = await explain(mk(), fakeClient(() => { throw new Error('region not supported'); }).client, 'm');
    assert.equal(boom.source, 'template');
    assert.match(boom.rejected!, /region/);
    const empty = await explain(mk(), fakeClient(() => [{ REPLY: '  ' }]).client, 'm');
    assert.equal(empty.source, 'template');
    const slow = await explain(mk(), fakeClient(() => new Promise(() => {})).client, 'm', 20);
    assert.equal(slow.source, 'template');
    assert.match(slow.rejected!, /timed out/);
  });

  test('with no Snowflake client the template is used and every template number is in the facts', async () => {
    for (const preset of ['worth', 'double', 'tight'] as const) {
      const input = mk(preset);
      const out = await explain(input, null, 'm');
      assert.equal(out.source, 'template');
      assert.deepEqual(unknownNumbers(out.text, buildFacts(input)), []);
      assert.equal(out.text, templateExplanation(buildFacts(input)));
    }
  });

  test('the tight preset adds the bi-weekly facts to the prompt', () => {
    assert.match(buildPrompt(buildFacts(mk('tight'))), /every two weeks/);
    assert.doesNotMatch(buildPrompt(buildFacts(mk('worth'))), /every two weeks/);
  });
});
