import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalRepo, DEMO_SEED, HARDSHIP_MESSAGE, withPayment } from '../src/customers.ts';
import { buildFacts, buildPrompt, explain, LABELS, numbersIn, templateExplanation, unknownNumbers, type ExplainInput, type Llm } from '../src/explain.ts';
import { biweekly, compare, payoff } from '../src/loan.ts';

describe('customer', () => {
  test('the local repo gives the demo customer with a computed payment and stores requests as pending', async () => {
    const repo = createLocalRepo();
    const c = await repo.getCustomer('demo');
    assert.equal(c.name, 'Vijay');
    assert.ok(Math.abs(c.monthlyPayment - 656) < 1);
    const r = await repo.saveHardship('demo', 'pause');
    assert.equal(r.status, 'PENDING');
    assert.equal(r.message, HARDSHIP_MESSAGE);
    assert.equal(r.storedIn, 'local');
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
  const llm = (reply: () => Promise<string>): Llm => ({ source: 'gemini', model: 'test', complete: reply });

  test('numbersIn parses money, commas and percents', () => {
    assert.deepEqual(numbersIn('$1,234.50 at 5.9% for 48 months'), [1234.5, 5.9, 48]);
  });

  test('the number guard flags numbers that were not in the facts', () => {
    const f = buildFacts(mk());
    assert.deepEqual(unknownNumbers(f.lines[3], f), []);
    assert.deepEqual(unknownNumbers('You will save $99,999 in interest.', f), [99999]);
  });

  test('a faithful reply is used and labeled', async () => {
    const f = buildFacts(mk());
    const out = await explain(mk(), llm(async () => `Nice! ${f.lines[3]}`));
    assert.equal(out.source, 'gemini');
    assert.equal(out.label, LABELS.gemini);
  });

  test('a reply with an invented number is rejected and the template is shown', async () => {
    const out = await explain(mk(), llm(async () => 'You would save $9,999 in interest.'));
    assert.equal(out.source, 'template');
    assert.equal(out.label, LABELS.template);
    assert.match(out.rejected!, /9999/);
  });

  test('errors, empty replies and timeouts fall back to the template', async () => {
    const boom = await explain(mk(), llm(async () => { throw new Error('model not found'); }));
    assert.equal(boom.source, 'template');
    assert.match(boom.rejected!, /model not found/);
    assert.equal((await explain(mk(), llm(async () => '  '))).source, 'template');
    const slow = await explain(mk(), llm(() => new Promise(() => {})), 20);
    assert.equal(slow.source, 'template');
    assert.match(slow.rejected!, /timed out/);
  });

  test('with no AI the template is used and every template number is in the facts', async () => {
    for (const preset of ['worth', 'double', 'tight'] as const) {
      const input = mk(preset);
      const out = await explain(input, null);
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
