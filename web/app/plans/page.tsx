'use client';
import { PayoffCard } from '../components/PayoffCard';
import { PlanCard } from '../components/PlanCards';
import { Sidebar } from '../components/Sidebar';
import { useShared } from '../components/Shell';

export default function PlansPage() {
  const { customer, base, plan, extra, setExtra, enabled, setEnabled } = useShared();
  return (
    <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
      <Sidebar plan={base.data} extra={extra} onExtra={setExtra} enabled={enabled} onEnabled={setEnabled} />
      <div className="min-w-0 space-y-6">
        <h1 className="text-3xl tracking-tight md:text-4xl">Your payoff plan</h1>
        <p className="copy -mt-3 text-sm text-grey">Choose how much extra you put toward the loan each week. The card and chart update as you go.</p>
        <PlanCard plan={plan} base={base.data} extra={extra} enabled={enabled} />
        <PayoffCard id="loan" customer={customer} plan={plan} />
      </div>
    </div>
  );
}
