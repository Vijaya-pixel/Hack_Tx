'use client';
import { useState } from 'react';
import { CartesianGrid, Line, ReferenceDot, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Customer, Plan } from '@/lib/api';
import { monthYear, usd, usd2 } from '@/lib/format';
import type { Loaded } from '@/lib/useApi';
import { Car } from './Car';
import { AnimatedNumber, Card, ErrorNote, Segmented, Skeleton, Switch } from './ui';

const ARC = Math.PI * 80; // length of the semicircle gauge (radius 80)

function Gauge({ pct }: { pct: number }) {
  return (
    <div className="relative mx-auto w-full max-w-[200px]">
      <svg viewBox="0 0 200 110" className="w-full" role="img" aria-label={`${pct}% of the loan paid off`}>
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#ececec" strokeWidth="16" strokeLinecap="round" />
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#ffc83d" strokeWidth="16" strokeLinecap="round"
          strokeDasharray={ARC} strokeDashoffset={ARC * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <p className="big absolute inset-x-0 bottom-0 text-center text-4xl"><AnimatedNumber value={pct} format={(n) => `${n.toFixed(0)}%`} /></p>
    </div>
  );
}

type View = 'last18' | 'full';
type Quick = 0 | 10 | 'avg' | 25 | 50;

export function LoanCard({ id, customer, plan, extra, onExtra, enabled, onEnabled }: {
  id: string; customer: Loaded<Customer>; plan: Loaded<Plan>; extra: number; onExtra: (v: number) => void; enabled: boolean; onEnabled: (v: boolean) => void;
}) {
  const [view, setView] = useState<View>('last18');
  const c = customer.data, p = plan.data;
  const quick: { value: Quick; label: string }[] = [
    { value: 0, label: '$0' }, { value: 10, label: '$10' }, { value: 'avg', label: 'Avg' }, { value: 25, label: '$25' }, { value: 50, label: '$50' },
  ];
  const selected: Quick | null = !p ? null : (quick.find((q) => Math.abs((q.value === 'avg' ? p.avgPerWeek : q.value) - extra) < 0.005)?.value ?? null);

  const months = p ? Math.max(p.standard.schedule.length, p.withRoundUps.schedule.length) : 0;
  const all = p ? Array.from({ length: months }, (_, m) => ({
    month: m, standard: p.standard.schedule[m]?.balance ?? 0, withRoundUps: p.withRoundUps.schedule[m]?.balance ?? 0,
  })) : [];
  // The last 18 months of the standard loan, where the two lines pull apart.
  const data = view === 'last18' ? all.slice(Math.max(0, months - 19)) : all;

  return (
    <Card id={id} className="flex h-full flex-col gap-5">
      {customer.error && !c ? <ErrorNote message={customer.error} retry={customer.reload} /> : !c ? <Skeleton className="h-16" /> : (
        <div>
          <p className="label">Your Loan</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{c.vehicle.replace(/^2024 Toyota /, '2024 ')}</h2>
          <p className="text-sm text-grey">{usd(c.balance)} · {c.apr}% APR · {c.monthsRemaining} months left</p>
        </div>
      )}
      <div className="rounded-3xl bg-soft px-4 py-6"><Car /></div>

      <div>
        <p className="label mb-2">Extra per week</p>
        <Segmented<Quick> label="Extra dollars per week" options={quick} value={selected}
          onChange={(v) => { if (p) onExtra(v === 'avg' ? p.avgPerWeek : v); onEnabled(true); }} />
      </div>

      {plan.error && !p ? <ErrorNote message={plan.error} retry={plan.reload} /> : !p ? <Skeleton className="h-60" /> : (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-4 text-xs text-grey">
              <span className="flex items-center gap-1.5"><span className="h-1 w-5 rounded-full bg-[#b5b5b5]" />Standard</span>
              <span className="flex items-center gap-1.5"><span className="h-1 w-5 rounded-full bg-accent" />With round-ups</span>
            </div>
            <div className="w-64 [&_button]:whitespace-nowrap"><Segmented<View> label="Chart range" options={[{ value: 'last18', label: 'Last 18 months' }, { value: 'full', label: 'Full loan' }]} value={view} onChange={setView} /></div>
          </div>
          {p.kpis.monthsSaved > 0 && (
            <p className="mb-1 inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Paid off {p.kpis.monthsSaved} {p.kpis.monthsSaved === 1 ? 'month' : 'months'} earlier · {usd(p.kpis.interestSaved)} interest saved
            </p>
          )}
          <div className="h-56 w-full" role="img" aria-label="Loan balance over time, standard versus with round-ups">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 6, right: 6, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="#eeeeee" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9a9a9a' }} axisLine={false} tickLine={false} tickFormatter={(m: number) => `M${m}`} interval="preserveStartEnd" minTickGap={30} />
                <YAxis tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: '#9a9a9a' }} axisLine={false} tickLine={false} width={44} />
                <Tooltip formatter={(v) => usd(Number(v))} labelFormatter={(m) => `Month ${m}`} contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.15)' }} />
                <Line type="monotone" dataKey="standard" stroke="#b5b5b5" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="withRoundUps" stroke="#ffc83d" strokeWidth={3.5} dot={false} isAnimationActive={false} />
                {p.kpis.monthsSaved > 0 && <ReferenceDot x={p.withRoundUps.months} y={0} r={7} fill="#ffc83d" stroke="#0b0b0b" strokeWidth={2} ifOverflow="visible" />}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-grey">Round-ups go to principal, which is why they save interest.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div className="rounded-3xl bg-soft p-4">
          <p className="label">Time saved</p>
          {!p ? <Skeleton className="mt-3 h-24 bg-white" /> : (
            <>
              <p className="big mt-3 text-4xl"><AnimatedNumber value={p.kpis.monthsSaved} format={(n) => `${Math.round(n)}`} /> <span className="text-xl">months</span></p>
              <p className="mt-1 text-xs text-grey">new payoff {monthYear(p.kpis.newPayoffDate)} · saves <AnimatedNumber value={p.kpis.interestSaved} format={usd} /> interest</p>
              <input type="range" className="tick mt-3" min={0} max={p.maxExtraPerWeek} step="any" value={extra} aria-label="Extra dollars per week"
                onChange={(e) => { onExtra(Number(e.target.value)); onEnabled(true); }} />
              <div className="flex justify-between text-[11px] text-grey"><span>$0</span><span className="font-medium text-ink">{usd2(extra)}/week</span><span>${p.maxExtraPerWeek}</span></div>
            </>
          )}
        </div>
        <div className="rounded-3xl bg-soft p-4">
          <p className="label">Loan paid off</p>
          {!c ? <Skeleton className="mt-3 h-24 bg-white" /> : (
            <>
              <div className="mt-3"><Gauge pct={c.percentPaid} /></div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-grey">Round-ups {enabled ? 'ON' : 'OFF'}</span>
                <Switch on={enabled} onChange={onEnabled} label="Apply round-ups to the plan" />
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
