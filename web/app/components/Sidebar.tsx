'use client';
import { ChevronRight, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import type { Plan } from '@/lib/api';
import { usd2 } from '@/lib/format';
import { Segmented, Switch } from './ui';

type Quick = 0 | 10 | 'avg' | 25 | 50;
const QUICK: { value: Quick; label: string }[] = [
  { value: 0, label: '$0' }, { value: 10, label: '$10' }, { value: 'avg', label: 'Avg' }, { value: 25, label: '$25' }, { value: 50, label: '$50' },
];
const REQUESTS: { kind: string; label: string; sub: string }[] = [
  { kind: 'biweekly', label: 'Bi-weekly payments', sub: 'Half the payment every 2 weeks' },
  { kind: 'pause', label: 'Payment pause', sub: 'A short breather' },
  { kind: 'credit', label: 'Maintenance credit', sub: '$50 toward upkeep' },
];

export function Sidebar({ plan, extra, onExtra, enabled, onEnabled }: {
  plan: Plan | null; extra: number; onExtra: (v: number) => void; enabled: boolean; onEnabled: (v: boolean) => void;
}) {
  const selected: Quick | null = !plan ? null : (QUICK.find((q) => Math.abs((q.value === 'avg' ? plan.avgPerWeek : q.value) - extra) < 0.005)?.value ?? null);
  const max = plan?.maxExtraPerWeek ?? 100;
  return (
    <aside className="space-y-8">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full border border-line bg-panel"><SlidersHorizontal size={18} strokeWidth={1.5} /></span>
        <h2 className="text-xl font-medium tracking-tight">Your plan</h2>
      </div>

      <section>
        <p className="label mb-3">Extra per week</p>
        <Segmented<Quick> label="Extra dollars per week" options={QUICK} value={selected}
          onChange={(v) => { if (plan) onExtra(v === 'avg' ? plan.avgPerWeek : v); onEnabled(true); }} />
        <input type="range" className="tick mt-4" min={0} max={max} step="any" value={extra} aria-label="Extra dollars per week"
          onChange={(e) => { onExtra(Number(e.target.value)); onEnabled(true); }} />
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="rounded-2xl border border-line bg-panel px-4 py-2 font-medium">{usd2(extra)}</span>
          <span className="text-grey">to</span>
          <span className="rounded-2xl border border-line bg-panel px-4 py-2 text-grey">${max}</span>
        </div>
      </section>

      <section>
        <p className="label mb-3">Round-ups</p>
        <div className="pop flex items-center justify-between rounded-2xl border border-line bg-panel p-4">
          <span className="text-[15px]">Apply to my loan <span className="block text-xs text-grey">{enabled ? 'ON: going to principal' : 'OFF: plan shows $0 extra'}</span></span>
          <Switch on={enabled} onChange={onEnabled} label="Apply round-ups to the plan" />
        </div>
      </section>

      <section>
        <p className="label mb-3">Requests</p>
        <ul className="space-y-2">
          {REQUESTS.map((r) => (
            <li key={r.kind}>
              <Link href={`/help#${r.kind}`} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-4 text-left transition-colors hover:border-ink">
                <span className="text-[15px]">{r.label}<span className="block text-xs text-grey">{r.sub}</span></span>
                <ChevronRight size={18} strokeWidth={1.5} className="shrink-0 text-grey" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Link href="/help" className="pop flex items-center gap-4 rounded-3xl border border-line bg-panel p-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-toyota/15 text-toyota"><ShieldCheck size={24} strokeWidth={1.75} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg leading-tight">Money is tight?</h2>
          <p className="text-xs text-grey">We have lighter options.</p>
        </div>
        <ChevronRight size={20} strokeWidth={1.5} className="text-grey" />
      </Link>
    </aside>
  );
}
