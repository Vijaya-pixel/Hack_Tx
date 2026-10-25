'use client';
import { ArrowUpRight } from 'lucide-react';
import type { Plan } from '@/lib/api';
import { monthYear, usd } from '@/lib/format';
import type { Loaded } from '@/lib/useApi';
import { Car } from './Car';
import { Skeleton } from './ui';

export interface PlanOption {
  key: string; title: string; sub: string; extra: number | null; // null = bi-weekly
  kpis: { monthsSaved: number; interestSaved: number; newPayoffDate: string } | null;
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="px-2 text-center first:pl-0 last:pr-0"><p className="text-lg font-semibold">{value}</p><p className="text-xs text-grey">{label}</p></div>;
}

export function PlanCards({ options, extra, onSelect, onBiweekly }: {
  options: PlanOption[]; extra: number; onSelect: (v: number) => void; onBiweekly: () => void;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {options.map((o) => {
        const k = o.kpis;
        const active = o.extra !== null && Math.abs(o.extra - extra) < 0.005;
        const act = () => (o.extra === null ? onBiweekly() : onSelect(o.extra));
        return (
          <article key={o.key} aria-current={active ? 'true' : undefined}
            className={`card relative overflow-hidden p-6 ${active ? 'md:-rotate-1 !border-transparent bg-gradient-to-br from-[#fde3e5] via-[#f7f7f7] to-[#f7f7f7] !shadow-[0_18px_44px_rgba(235,10,30,0.18)]' : ''}`}>
            {active && <span aria-hidden className="pointer-events-none absolute right-2 top-16 select-none text-[120px] font-black leading-none tracking-tighter text-toyota/[0.07]">{o.extra === 0 ? '$0' : `$${Math.round(o.extra!)}`}</span>}
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">{o.title}</h3>
                <p className="text-xs text-grey">{o.sub}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold">{k ? (k.interestSaved > 0 ? `${usd(k.interestSaved)} saved` : 'No extra') : '…'}</span>
                <button onClick={act} aria-label={o.extra === null ? `Request ${o.title}` : `Use the ${o.title} plan`}
                  className="grid h-10 w-10 place-items-center rounded-full border border-[#e2e2e2] bg-white transition-colors hover:bg-ink hover:text-white">
                  <ArrowUpRight size={18} strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <div className="relative mx-auto my-4 w-4/5"><Car /></div>
            {k ? (
              <div className="relative grid grid-cols-3 divide-x divide-[#dedede]">
                <Stat value={`${k.monthsSaved} mo`} label="Time saved" />
                <Stat value={usd(k.interestSaved)} label="Interest saved" />
                <Stat value={monthYear(k.newPayoffDate)} label="Paid off" />
              </div>
            ) : <Skeleton className="h-12" />}
          </article>
        );
      })}
    </div>
  );
}

export function buildOptions(base: Plan | null, others: Record<number, Loaded<Plan>>): PlanOption[] {
  const k = (p: Plan | null) => (p ? p.kpis : null);
  return [
    { key: '0', title: 'Standard', sub: 'No extra payments', extra: 0, kpis: k(others[0].data) },
    { key: '10', title: '$10 a week', sub: 'A little extra', extra: 10, kpis: k(others[10].data) },
    { key: 'avg', title: 'Your average', sub: base ? `${usd(base.avgPerWeek)} a week from your round-ups` : 'From your round-ups', extra: base ? base.avgPerWeek : 0, kpis: k(base) },
    { key: '25', title: '$25 a week', sub: 'Round-ups plus a bit more', extra: 25, kpis: k(others[25].data) },
    { key: '50', title: '$50 a week', sub: 'The fast lane', extra: 50, kpis: k(others[50].data) },
    { key: 'bi', title: 'Bi-weekly', sub: 'Half the payment every 2 weeks', extra: null, kpis: base ? base.biweekly : null },
  ];
}
