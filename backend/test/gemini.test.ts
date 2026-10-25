import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiLlm, DEFAULT_GEMINI_MODEL } from '../src/toyota/gemini.ts';
import { explain, explainTemplate, clearExplanationCache, numbersIn, ungroundedNumbers, FOOTER, SYSTEM_PROMPT, modelInput } from '../src/toyota/explain.ts';
import { CUSTOMERS, customerById } from '../src/toyota/customers.ts';
import { advise } from '../src/toyota/advice.ts';
import type { Llm } from '../src/types.ts';

const TODAY = '2026-10-24';
const maya = customerById('maya')!;
const mayaAdvice = advise(maya, TODAY);

const reply = (text: string): Response => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
const fakeLlm = (fn: (prompt: string) => Promise<string>): Llm & { calls: string[] } => {
  const calls: string[] = [];
  return { calls, complete: async (p) => { calls.push(p); return fn(p); } };
};
const GOOD = "Maya, you are on track to go about 6,000 miles over, which would cost about $1,895 to return the car. A RAV4 Hybrid lease is about $449 a month, which is $46 more than now, but you would spend $44 less on fuel each month. Your next step is to see your RAV4 Hybrid offer.";

describe('Gemini client', () => {
  test('sends the documented request: model in the URL, key in a header, prompt in contents', async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const llm = createGeminiLlm({ apiKey: 'KEY123', model: 'some-model', system: 'be brief',
      fetchFn: (async (url: string, init: RequestInit) => { seen = { url, init }; return reply('  hello there  '); }) as never });
    assert.equal(await llm.complete('hi'), 'hello there');
    assert.equal(seen!.url, 'https://generativelanguage.googleapis.com/v1beta/models/some-model:generateContent');
    assert.ok(!seen!.url.includes('KEY123'), 'the key never goes in the URL');
    const headers = seen!.init.headers as Record<string, string>;
    assert.equal(headers['x-goog-api-key'], 'KEY123');
    const body = JSON.parse(String(seen!.init.body));
    assert.equal(body.contents[0].parts[0].text, 'hi');
    assert.equal(body.systemInstruction.parts[0].text, 'be brief');
  });
  test('has a default model and refuses an empty key', () => {
    assert.ok(DEFAULT_GEMINI_MODEL.startsWith('gemini-'));
    assert.throws(() => createGeminiLlm({ apiKey: '' }), /empty/);
  });
  test('an HTTP error, a blocked prompt, an empty reply and a timeout all throw clear errors', async () => {
    const mk = (f: () => Promise<Response>, timeoutMs = 1000) => createGeminiLlm({ apiKey: 'k', timeoutMs, fetchFn: f as never });
    await assert.rejects(() => mk(async () => new Response(JSON.stringify({ error: { message: 'model not found' } }), { status: 404 })).complete('x'), /404.*model not found/);
    await assert.rejects(() => mk(async () => new Response(JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } }), { status: 200 })).complete('x'), /blocked.*SAFETY/);
    await assert.rejects(() => mk(async () => new Response('{}', { status: 200 })).complete('x'), /no text/);
    await assert.rejects(() => mk(async () => new Response('<html>oops</html>', { status: 502 })).complete('x'), /502/);
    const hang = (async (_u: string, init: RequestInit) => new Promise((_, rej) => { init.signal?.addEventListener('abort', () => rej(new Error('aborted'))); })) as never;
    await assert.rejects(() => createGeminiLlm({ apiKey: 'k', timeoutMs: 20, fetchFn: hang }).complete('x'), /aborted/);
  });
});

describe('number guard', () => {
  test('numbersIn reads dollars, commas, decimals and plain numbers', () => {
    assert.deepEqual(numbersIn('$1,895 for 6,000 miles at 6.9% over 36 months'), [1895, 6000, 6.9, 36]);
    assert.deepEqual(numbersIn('no digits here'), []);
  });
  test('ungroundedNumbers flags only numbers that are not in the allowed data', () => {
    const allowed = { facts: { a: 1895, b: '6,000 miles' }, list: [449] };
    assert.deepEqual(ungroundedNumbers('$1,895, 6,000 and 449', allowed), []);
    assert.deepEqual(ungroundedNumbers('$1,895 and $2,000', allowed), ['2000']);
  });
  test("the template's own numbers always pass the guard, for every customer", () => {
    for (const c of CUSTOMERS) {
      const a = advise(c, TODAY);
      assert.deepEqual(ungroundedNumbers(explainTemplate(c, a).text, [modelInput(c, a), c.vehicle.year]), [], c.id);
    }
  });
  test('the instructions tell the model not to calculate or promise', () => {
    assert.match(SYSTEM_PROMPT, /ONLY numbers that appear/);
    assert.match(SYSTEM_PROMPT, /Never promise/);
  });
});

describe('explain with a model', () => {
  beforeEach(() => clearExplanationCache());
  test('a grounded reply is used and gets the estimate footer', async () => {
    const r = await explain(maya, mayaAdvice, fakeLlm(async () => GOOD));
    assert.equal(r.source, 'model');
    assert.ok(r.text.startsWith('Maya, you are on track') && r.text.endsWith(FOOTER));
  });
  test('the model is sent the customer facts, and not anything outside them', async () => {
    const llm = fakeLlm(async () => GOOD);
    await explain(customerById('lena')!, advise(customerById('lena')!, TODAY), llm);
    const prompt = llm.calls[0];
    assert.match(prompt, /ONLY numbers/);
    assert.match(prompt, /"name":"Lena"/);
    assert.ok(!/monthlyIncome|token|apikey/i.test(prompt.replace(SYSTEM_PROMPT, '')), 'private fields are not sent');
  });
  test('a reply with an invented number is thrown out and replaced by the template', async () => {
    const r = await explain(maya, mayaAdvice, fakeLlm(async () => GOOD.replace('$44 less', '$75 less')));
    assert.equal(r.source, 'template');
    assert.deepEqual(r.rejected, ['75']);
    assert.ok(!r.text.includes('75'));
  });
  test('a number the model calculated itself is also rejected, even if it is plausible', async () => {
    const r = await explain(maya, mayaAdvice, fakeLlm(async () => GOOD.replace('$46 more than now', '$45 more than now')));
    assert.equal(r.source, 'template');
    assert.deepEqual(r.rejected, ['45']);
  });
  test('an error from the model falls back to the template and says why', async () => {
    const r = await explain(maya, mayaAdvice, fakeLlm(async () => { throw new Error('Gemini returned 429: quota'); }));
    assert.equal(r.source, 'template');
    assert.match(r.reason ?? '', /429/);
    assert.ok(r.text.includes(mayaAdvice.nextStep.label));
  });
  test('no model configured gives the template', async () => {
    const r = await explain(maya, mayaAdvice, null);
    assert.deepEqual([r.source, r.reason], ['template', 'no model configured']);
  });
  test('an empty or enormous reply is not used', async () => {
    assert.equal((await explain(maya, mayaAdvice, fakeLlm(async () => 'ok'))).source, 'template');
    assert.equal((await explain(maya, mayaAdvice, fakeLlm(async () => 'word '.repeat(300)))).source, 'template');
  });
  test('the same advice is only sent to the model once, a rejected reply is not cached', async () => {
    const llm = fakeLlm(async () => GOOD);
    await explain(maya, mayaAdvice, llm); await explain(maya, mayaAdvice, llm);
    assert.equal(llm.calls.length, 1);
    clearExplanationCache();
    const bad = fakeLlm(async () => GOOD.replace('$44 less', '$75 less'));
    await explain(maya, mayaAdvice, bad); await explain(maya, mayaAdvice, bad);
    assert.equal(bad.calls.length, 2, 'a thrown-out reply is retried, not remembered');
  });
});
