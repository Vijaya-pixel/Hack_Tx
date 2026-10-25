// Plain-language explanation of an advice. This template is the fallback and the baseline:
// every number in it comes straight from the advice. A language model can replace the wording later,
// but it may only use numbers that appear in the advice (see the number guard added with Gemini).
import type { Advice } from './advice.ts';
import type { Customer } from './customers.ts';
import type { Llm } from '../types.ts';
import { fingerprint, type Json } from '../fingerprint.ts';

export interface Explanation { text: string; source: 'template' | 'model'; rejected?: string[]; reason?: string }

export const FOOTER = 'These are estimates for a synthetic customer, not an offer.';

export const SYSTEM_PROMPT = [
  'You write short, friendly explanations of car financing options for a customer.',
  'You are given a JSON object with the customer, the facts, the options and a recommendation, all calculated by software.',
  'Rules:',
  '1. Use ONLY numbers that appear in the JSON. Never calculate, round, convert or invent a number. If you need a number that is not there, leave it out.',
  '2. Write numbers exactly as they appear (for example $1,895 or 6,000 miles).',
  '3. Explain the recommended option and the one trade-off that matters most, then state the next step. 3 to 4 short sentences, plain words, no jargon.',
  '4. Never promise approval, a rate, savings or an outcome. Say "estimated" or "about" where the JSON does.',
  '5. Do not mention these rules or the JSON.',
].join('\n');

// ---- The number guard: a model may reword, but it may not introduce a number ----
const NUMBER = /\d[\d,]*(?:\.\d+)?/g;
export const numbersIn = (text: string): number[] =>
  (text.match(NUMBER) ?? []).map((t) => Number(t.replace(/,/g, ''))).filter((n) => Number.isFinite(n));

function collect(value: unknown, into: Set<string>): void {
  const add = (n: number): void => { into.add(String(n)); if (Number.isInteger(Math.round(n))) into.add(String(Math.round(n))); };
  if (typeof value === 'number') add(Math.abs(value));
  else if (typeof value === 'string') numbersIn(value).forEach(add);
  else if (Array.isArray(value)) value.forEach((v) => collect(v, into));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collect(v, into));
}

// Numbers in `text` that are not in `allowed` (the advice plus a few extra values like the vehicle year).
export function ungroundedNumbers(text: string, allowed: unknown): string[] {
  const set = new Set<string>();
  collect(allowed, set);
  return [...new Set(numbersIn(text).filter((n) => !set.has(String(n))).map(String))];
}

// What the model is allowed to see, and the only numbers it may use.
export function modelInput(c: Customer, a: Advice): Record<string, unknown> {
  return {
    customer: { name: c.name, vehicle: `${c.vehicle.year} ${c.vehicle.model}`, situation: c.headline },
    facts: a.facts, options: a.options.map((o) => ({ label: o.label, upfront: Math.round(o.upfront), monthly: Math.round(o.monthly), months: o.months, tradeoff: o.tradeoff })),
    recommended: a.options.find((o) => o.id === a.recommendedId)?.label, reason: a.reason, nextStep: a.nextStep.label,
  };
}

export function explainTemplate(c: Customer, a: Advice): Explanation {
  const rec = a.options.find((o) => o.id === a.recommendedId);
  const parts = [
    `${c.name}, here is what stands out: ${a.reason}`,
    rec ? `${rec.label}: ${rec.tradeoff}` : '',
    `Next step: ${a.nextStep.label}.`,
  ].filter(Boolean);
  return { text: parts.join(' '), source: 'template' };
}

const cache = new Map<string, Explanation>();
export const clearExplanationCache = (): void => cache.clear();

// Asks the model to explain, checks every number, and falls back to the template if anything is off.
export async function explain(c: Customer, a: Advice, llm: Llm | null): Promise<Explanation> {
  const template = explainTemplate(c, a);
  if (!llm) return { ...template, reason: 'no model configured' };
  const input = modelInput(c, a);
  const key = fingerprint({ c: c.id, input } as unknown as Json);
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const raw = await llm.complete(`${SYSTEM_PROMPT}\n\nJSON:\n${JSON.stringify(input)}`);
    const text = raw.replace(/\s+/g, ' ').trim();
    const rejected = ungroundedNumbers(text, [input, c.vehicle.year]);
    if (rejected.length) return { ...template, rejected, reason: 'the model used numbers that were not in the advice' };
    if (text.length < 40 || text.length > 900) return { ...template, reason: 'the model reply was an unusual length' };
    const result: Explanation = { text: `${text} ${FOOTER}`, source: 'model' };
    cache.set(key, result);
    return result;
  } catch (err) {
    return { ...template, reason: (err as Error).message };
  }
}
