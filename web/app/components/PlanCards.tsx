'use client';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { Plan } from '@/lib/api';
import { monthYear, usd, usd2 } from '@/lib/format';
import type { Loaded } from '@/lib/useApi';
import { Car } from './Car';
import { AnimatedNumber, Skeleton } from './ui';

function Stat({ children, label }: { children: React.ReactNode; label: string }) {
  return <div className="px-2 text-center first:pl-0 last:pr-0"><p className="text-2xl font-medium md:text-3xl">{children}</p><p className="mt-1 text-xs text-grey">{label}</p></div>;
}

// One plan card. It follows the extra-per-week choice, so picking $10, $25, $50 or sliding shows each plan in turn.
export function PlanCard({ plan, base, extra, enabled }: { plan: Loaded<Plan>; base: Plan | null; extra: number; enabled: boolean }) {
  const p = plan.data;
  const amount = enabled ? extra : 0;
  const isAvg = base !== null && Math.abs(amount - base.avgPerWeek) < 0.005;
  const title = amount === 0 ? 'Standard' : `${usd2(amount)} a week`;
  const sub = amount === 0 ? 'No extra payments' : isAvg ? 'Your average, from your round-ups' : 'Extra to principal each week';
  return (
    <article className="card relative overflow-hidden bg-gradient-to-br from-[#fde3e5] via-[#f7f7f7] to-[#f7f7f7] p-6 md:p-8">
      <span aria-hidden className="pointer-events-none absolute -right-2 top-20 select-none text-[160px] font-black leading-none tracking-tighter text-toyota/[0.07]">${Math.round(amount)}</span>
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl tracking-tight md:text-3xl">{title}</h2>
          <p className="text-sm text-grey">{sub}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="whitespace-nowrap text-lg font-medium">{p ? (p.kpis.interestSaved > 0 ? <><AnimatedNumber value={p.kpis.interestSaved} format={usd} /> saved</> : 'No extra') : '…'}</span>
          <Link href="/help#biweekly" aria-label="See the bi-weekly option" className="grid h-10 w-10 place-items-center rounded-full border border-[#e2e2e2] bg-white transition-colors hover:bg-ink hover:text-white">
            <ArrowUpRight size={18} strokeWidth={1.5} />
          </Link>
        </div>
      </div>
      <div className="relative mx-auto my-6 w-3/5 min-w-[220px]"><Car /></div>
      {p ? (
        <div className="relative grid grid-cols-3 divide-x divide-[#dedede]">
          <Stat label="Time saved"><AnimatedNumber value={p.kpis.monthsSaved} format={(n) => `${Math.round(n)} mo`} /></Stat>
          <Stat label="Interest saved"><AnimatedNumber value={p.kpis.interestSaved} format={usd} /></Stat>
          <Stat label="Paid off">{monthYear(p.kpis.newPayoffDate)}</Stat>
        </div>
      ) : plan.error ? <p role="alert" className="relative text-sm text-toyota">{plan.error}</p> : <Skeleton className="relative h-16" />}
    </article>
  );
}
