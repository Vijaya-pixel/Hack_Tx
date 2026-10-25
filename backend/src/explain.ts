// Plain-language advice. The numbers are computed in loan.ts; the AI may only reword them.
// Every number in a Cortex reply must already appear in the facts we sent, otherwise we use the template.
import type { Comparison } from './loan.ts';
import type { Customer } from './customers.ts';

export type Preset = 'worth' | 'double' | 'tight';
export const PRESETS: Preset[] = ['worth', 'double', 'tight'];

export interface Facts {
  preset: Preset;
  lines: string[];   // the only numbers Cortex may use
  question: string;
}

// Anything that can turn a prompt into text. Gemini is the one we use; more could be added in a list.
export interface Llm {
  source: 'gemini';
  model: string;
  complete(prompt: string): Promise<string>;
}

export interface Explanation {
  text: string;
  source: 'gemini' | 'template';
  label: string;
  preset: Preset;
  rejected?: string; // why a Cortex reply was not used
}

export const LABELS = { gemini: 'AI explanation · Google Gemini', template: 'Standard explanation' } as const;

export const usd = (x: number): string => {
  const whole = Math.abs(x) >= 100 || Number.isInteger(x);
  return '$' + x.toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 });
};
const monthName = (ym: string): string =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export interface ExplainInput {
  customer: Customer;
  preset: Preset;
  extraPerWeek: number;
  avgPerWeek: number;
  plan: Comparison;
  biweekly: Comparison;
}

const QUESTIONS: Record<Preset, string> = {
  worth: 'Is this worth it?',
  double: 'What if I double it?',
  tight: 'What if money is tight?',
};

export function buildFacts(i: ExplainInput): Facts {
  const { customer: c, plan: p, biweekly: b } = i;
  const lines = [
    `The loan balance is ${usd(c.balance)} at ${c.apr}% APR with ${plural(c.monthsRemaining, 'month')} left.`,
    `The monthly payment is ${usd(c.monthlyPayment)}.`,
    `Round-ups average ${usd(i.avgPerWeek)} per week.`,
    `With ${usd(i.extraPerWeek)} extra per week going to principal, the loan is paid off ${plural(p.monthsSaved, 'month')} sooner, in ${monthName(p.withRoundUps.payoffDate)} instead of ${monthName(p.standard.payoffDate)}.`,
    `That saves ${usd(p.interestSaved)} in interest.`,
  ];
  if (i.preset === 'tight') {
    lines.push(`Paying half the payment every two weeks would save ${plural(b.monthsSaved, 'month')} and ${usd(b.interestSaved)} in interest.`);
    lines.push('A payment pause or a switch to bi-weekly can be requested; a Toyota Financial Services specialist reviews every request.');
  }
  return { preset: i.preset, lines, question: QUESTIONS[i.preset] };
}

export function templateExplanation(f: Facts): string {
  const [, , avg, plan, saved] = f.lines;
  switch (f.preset) {
    case 'worth': return `${avg} ${plan} ${saved} Round-ups go to principal, which is why they save interest.`;
    case 'double': return `Doubling it: ${plan} ${saved} Round-ups go to principal, which is why they save interest.`;
    case 'tight': return `${f.lines[5]} ${f.lines[6]} Round-ups are optional extra money, so you can lower them whenever you like.`;
  }
}

export function buildPrompt(f: Facts): string {
  return [
    'You are Gear, the loan guide inside RoundGear, a concept app for Toyota Financial Services customers, powered by Google Gemini. Answer the question in 2 to 3 short sentences of plain language.',
    'Use ONLY the facts below. Copy every number exactly as written. Do not add, compute, round or estimate any other number. Do not promise approval of any request.',
    `Question: ${f.question}`,
    'Facts:',
    ...f.lines.map((l) => `- ${l}`),
  ].join('\n');
}

// All numbers in a text, as values: "$1,234.50" -> 1234.5, "5.9%" -> 5.9.
export function numbersIn(text: string): number[] {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((s) => Number(s.replace(/,/g, '')));
}

// Returns the numbers in `reply` that are not in the facts (empty means the reply is safe to show).
export function unknownNumbers(reply: string, facts: Facts): number[] {
  const allowed = new Set(numbersIn(facts.lines.join(' ')));
  return numbersIn(reply).filter((n) => !allowed.has(n));
}

const TIMEOUT_MS = 8000;

// Tries each AI in order; the first reply that passes the number check wins. If none does, the standard text is used
// and `rejected` says why each one was not used.
export async function explain(input: ExplainInput, llms: Llm | Llm[] | null, timeoutMs = TIMEOUT_MS): Promise<Explanation> {
  const list = llms === null ? [] : Array.isArray(llms) ? llms : [llms];
  const facts = buildFacts(input);
  const template: Explanation = { text: templateExplanation(facts), source: 'template', label: LABELS.template, preset: input.preset };
  if (list.length === 0) return { ...template, rejected: 'No AI is connected' };
  const reasons: string[] = [];
  for (const llm of list) {
    const name = 'Gemini';
    try {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new Error(`${name} timed out`)), timeoutMs); });
      const raw = await Promise.race([llm.complete(buildPrompt(facts)), timeout]).finally(() => clearTimeout(timer));
      const reply = raw.trim();
      if (!reply) { reasons.push(`${name} returned an empty reply`); continue; }
      const bad = unknownNumbers(reply, facts);
      if (bad.length) { reasons.push(`${name} used numbers we did not send: ${bad.join(', ')}`); continue; }
      return { text: reply, source: llm.source, label: LABELS[llm.source], preset: input.preset, ...(reasons.length ? { rejected: reasons.join('; ') } : {}) };
    } catch (e) {
      reasons.push(`${name} failed: ${(e as Error).message.slice(0, 200)}`);
    }
  }
  return { ...template, rejected: reasons.join('; ') };
}
