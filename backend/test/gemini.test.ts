import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiChain, createGeminiLlm, geminiFromEnv, DEFAULT_GEMINI_MODEL } from '../src/gemini.ts';
import { buildFacts, explain, LABELS, type ExplainInput } from '../src/explain.ts';
import { biweekly, compare, payoff } from '../src/loan.ts';
import { DEMO_SEED, withPayment } from '../src/customers.ts';

const ok = (text: string) => async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });

describe('Gemini client', () => {
  test('sends the key in a header (never the URL) and returns the text', async () => {
    let seen: { url: string; headers: Record<string, string>; body: string } | null = null;
    const fetchFn = (async (url: string, init: RequestInit) => {
      seen = { url, headers: init.headers as Record<string, string>, body: String(init.body) };
      return ok('Hello there')();
    }) as unknown as typeof fetch;
    const llm = createGeminiLlm({ apiKey: 'SECRET-KEY', model: 'm-1', fetchFn });
    assert.equal(await llm.complete('hi'), 'Hello there');
    assert.ok(!seen!.url.includes('SECRET-KEY'));
    assert.equal(seen!.headers['x-goog-api-key'], 'SECRET-KEY');
    assert.match(seen!.url, /models\/m-1:generateContent$/);
    assert.match(seen!.body, /"hi"/);
  });
  test('errors, blocks and empty replies throw clear messages', async () => {
    const mk = (fetchFn: () => Promise<Response>) => createGeminiLlm({ apiKey: 'k', fetchFn: fetchFn as unknown as typeof fetch });
    await assert.rejects(() => mk(async () => new Response(JSON.stringify({ error: { message: 'bad key' } }), { status: 400 })).complete('x'), /400: bad key/);
    await assert.rejects(() => mk(async () => new Response(JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } }), { status: 200 })).complete('x'), /blocked/);
    await assert.rejects(() => mk(ok('  ')).complete('x'), /no text/);
  });
  test('a missing key is not allowed; the env helper returns null without one and reads the model', () => {
    assert.throws(() => createGeminiLlm({ apiKey: '' }), /empty/);
    assert.equal(geminiFromEnv({}), null);
    assert.equal(geminiFromEnv({ GEMINI_API_KEY: 'k' })!.model, DEFAULT_GEMINI_MODEL);
    assert.equal(geminiFromEnv({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'x' })!.model, 'x');
  });
});

describe('Gemini model chain', () => {
  test('a busy first model falls through to the backup; all failing throws the last error', async () => {
    const seen: string[] = [];
    const fetchFn = (async (url: string) => {
      seen.push(/models\/([^:]+):/.exec(url)![1]);
      return /first/.test(url) ? new Response(JSON.stringify({ error: { message: 'high demand' } }), { status: 503 }) : ok('backup answer')();
    }) as unknown as typeof fetch;
    const chain = createGeminiChain({ apiKey: 'k', models: ['first-model', 'second-model'], fetchFn });
    assert.equal(await chain.complete('hi'), 'backup answer');
    assert.deepEqual(seen, ['first-model', 'second-model']);
    const down = createGeminiChain({ apiKey: 'k', models: ['a', 'b'], fetchFn: (async () => new Response('{}', { status: 500 })) as unknown as typeof fetch });
    await assert.rejects(() => down.complete('hi'), /500/);
  });
});

describe('Ask with several AIs', () => {
  const customer = withPayment(DEMO_SEED);
  const pay = customer.monthlyPayment;
  const input: ExplainInput = {
    customer, preset: 'worth', extraPerWeek: 12, avgPerWeek: 9.18,
    plan: compare(payoff(28000, 5.9, pay), payoff(28000, 5.9, pay, 12), new Date('2026-10-24T00:00:00Z')),
    biweekly: biweekly(28000, 5.9, pay, new Date('2026-10-24T00:00:00Z')),
  };
  const first = (reply: string | Error) => ({ source: 'gemini' as const, model: 'first', complete: async () => { if (reply instanceof Error) throw reply; return reply; } });
  const gem = (reply: string) => createGeminiLlm({ apiKey: 'k', fetchFn: ok(reply) as unknown as typeof fetch });

  test('the first AI in the list wins when its reply passes', async () => {
    const f = buildFacts(input);
    const out = await explain(input, [first(`Good. ${f.lines[3]}`), gem(`Other. ${f.lines[3]}`)]);
    assert.equal(out.source, 'gemini');
    assert.match(out.text, /^Good\./); // the first AI's wording, not the second's
  });
  test('if the first AI fails or invents a number, the next is tried and the reason is kept', async () => {
    const f = buildFacts(input);
    const failed = await explain(input, [first(new Error('region not supported')), gem(`Backup. ${f.lines[3]}`)]);
    assert.equal(failed.source, 'gemini');
    assert.match(failed.rejected!, /Gemini failed: region not supported/);
    const invented = await explain(input, [first('Save $55,555.'), gem(`Backup. ${f.lines[3]}`)]);
    assert.equal(invented.source, 'gemini');
    assert.match(invented.rejected!, /Gemini used numbers/);
  });
  test('if every AI fails the standard text is used and both reasons are listed', async () => {
    const out = await explain(input, [first(new Error('boom')), gem('Save $55,555.')]);
    assert.equal(out.source, 'template');
    assert.match(out.rejected!, /Gemini failed: boom; Gemini used numbers/);
  });
});

describe('Ask with Gemini', () => {
  const customer = withPayment(DEMO_SEED);
  const pay = customer.monthlyPayment;
  const input: ExplainInput = {
    customer, preset: 'worth', extraPerWeek: 12, avgPerWeek: 9.18,
    plan: compare(payoff(28000, 5.9, pay), payoff(28000, 5.9, pay, 12), new Date('2026-10-24T00:00:00Z')),
    biweekly: biweekly(28000, 5.9, pay, new Date('2026-10-24T00:00:00Z')),
  };
  test('a faithful Gemini reply is used and labeled Gemini', async () => {
    const f = buildFacts(input);
    const llm = createGeminiLlm({ apiKey: 'k', fetchFn: ok(`Nice. ${f.lines[3]}`) as unknown as typeof fetch });
    const out = await explain(input, llm);
    assert.equal(out.source, 'gemini');
    assert.equal(out.label, LABELS.gemini);
  });
  test('an invented number, or a failing API, falls back to the standard text', async () => {
    const bad = await explain(input, createGeminiLlm({ apiKey: 'k', fetchFn: ok('You save $77,777.') as unknown as typeof fetch }));
    assert.equal(bad.source, 'template');
    assert.match(bad.rejected!, /Gemini used numbers/);
    const down = await explain(input, createGeminiLlm({ apiKey: 'k', fetchFn: (async () => { throw new Error('network down'); }) as unknown as typeof fetch }));
    assert.equal(down.source, 'template');
    assert.match(down.rejected!, /Gemini failed: network down/);
  });
});
