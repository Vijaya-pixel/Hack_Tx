// Types for what the API returns, and a small fetch helper. No money math lives here.
export interface Customer { id: string; name: string; vehicle: string; balance: number; apr: number; monthsRemaining: number; monthlyPayment: number; source: string }
export interface Roundups {
  range: string; source: string; weeks: number; total: number; avgPerWeek: number;
  weekly: { week: string; amount: number; count: number }[];
}
export interface FeedItem { id: number; ts: string; merchant: string; category: string; amount: number; roundup: number }
export interface Feed { running: boolean; items: FeedItem[] }
export interface Curve { months: number; totalInterest: number; payoffDate: string; schedule: { month: number; balance: number }[] }
export interface Plan {
  extraPerWeek: number; avgPerWeek: number; maxExtraPerWeek: number; monthlyPayment: number;
  standard: Curve; withRoundUps: Curve;
  kpis: { monthsSaved: number; interestSaved: number; newPayoffDate: string };
  biweekly: { monthsSaved: number; interestSaved: number; newPayoffDate: string };
}
export interface Explanation { text: string; source: 'cortex' | 'template'; label: string; preset: Preset; rejected?: string; extraPerWeek: number }
export type Preset = 'worth' | 'double' | 'tight';
export type HardshipKind = 'pause' | 'biweekly' | 'credit';
export interface HardshipResult { id: string; kind: HardshipKind; status: string; message: string }
export interface Health {
  database: { mode: string; fallbackReason?: string };
  snowflake: { connected: boolean; customerSource: string };
  ai: { mode: string; model?: string };
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}
