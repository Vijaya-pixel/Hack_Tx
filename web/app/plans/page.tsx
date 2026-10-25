'use client';
import { useRouter } from 'next/navigation';
import { PayoffCard } from '../components/PayoffCard';
import { PlanCards, buildOptions } from '../components/PlanCards';
import { Sidebar } from '../components/Sidebar';
import { useShared } from '../components/Shell';
import { useApi } from '@/lib/useApi';
import type { Plan } from '@/lib/api';

export default function PlansPage() {
  const router = useRouter();
  const { customer, base, plan, extra, setExtra, enabled, setEnabled } = useShared();
  const others = { 0: useApi<Plan>('/api/plan?extraPerWeek=0'), 10: useApi<Plan>('/api/plan?extraPerWeek=10'), 25: useApi<Plan>('/api/plan?extraPerWeek=25'), 50: useApi<Plan>('/api/plan?extraPerWeek=50') };
  const options = buildOptions(base.data, others);
  return (
    <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
      <Sidebar plan={base.data} extra={extra} onExtra={setExtra} enabled={enabled} onEnabled={setEnabled} />
      <div className="min-w-0 space-y-6">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-3xl tracking-tight md:text-4xl">Payoff plans <span className="font-light text-grey">({options.length})</span></h1>
          <p className="hidden text-sm text-grey sm:block">Same loan, different extra per week</p>
        </div>
        <PlanCards options={options} extra={extra} onSelect={(v) => { setExtra(v); setEnabled(true); }} onBiweekly={() => router.push('/help#biweekly')} />
        <PayoffCard id="loan" customer={customer} plan={plan} />
      </div>
    </div>
  );
}
