// Plain-language explanation of an advice. This template is the fallback and the baseline:
// every number in it comes straight from the advice. A language model can replace the wording later,
// but it may only use numbers that appear in the advice (see the number guard added with Gemini).
import type { Advice } from './advice.ts';
import type { Customer } from './customers.ts';

export interface Explanation { text: string; source: 'template' | 'model' }

export function explainTemplate(c: Customer, a: Advice): Explanation {
  const rec = a.options.find((o) => o.id === a.recommendedId);
  const parts = [
    `${c.name}, here is what stands out: ${a.reason}`,
    rec ? `${rec.label}: ${rec.tradeoff}` : '',
    `Next step: ${a.nextStep.label}.`,
  ].filter(Boolean);
  return { text: parts.join(' '), source: 'template' };
}
