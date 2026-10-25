'use client';
import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Customer, Plan } from '@/lib/api';
import { monthYear, usd } from '@/lib/format';
import type { Loaded } from '@/lib/useApi';
import { AnimatedNumber, Card, ErrorNote, Segmented, Skeleton } from './ui';

const ARC = Math.PI * 80; // length of the semicircle gauge (radius 80)

function Gauge({ pct }: { pct: number }) {
  return (
    <div className="relative mx-auto w-full max-w-[200px]">
      <svg viewBox="0 0 200 110" className="w-full" role="img" aria-label={`${pct}% of the loan paid off`}>
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#e4e4e4" strokeWidth="16" strokeLinecap="round" />
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#eb0a1e" strokeWidth="16" strokeLinecap="round"
          strokeDasharray={ARC} strokeDashoffset={ARC * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <p className="big absolute inset-x-0 bottom-0 text-center text-4xl"><AnimatedNumber value={pct} format={(n) => `${n.toFixed(0)}%`} /></p>
    </div>
  );
}

type View = 'last18' | 'full';

export function PayoffCard({ id, customer, plan }: { id: string; customer: Loaded<Customer>; plan: Loaded<Plan> }) {
  const [view, setView] = useState<View>('last18');
  const c = customer.data, p = plan.data;
  const months = p ? Math.max(p.standard.schedule.length, p.withRoundUps.schedule.length) : 0;
  const all = p ? Array.from({ length: months }, (_, m) => ({
    month: m, standard: p.standard.schedule[m]?.balance ?? 0, withRoundUps: p.withRoundUps.schedule[m]?.balance ?? 0,
  })) : [];
  // The last 18 months of the standard loan, where the two lines pull apart.
  const data = view === 'last18' ? all.slice(Math.max(0, months - 19)) : all;

  return (
    <Card id={id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        {customer.error && !c ? <ErrorNote message={customer.error} retry={customer.reload} /> : !c ? <Skeleton className="h-14 w-64" /> : (
          <div>
            <p className="label">Your loan</p>
            <h2 className="mt-1 text-2xl font-medium tracking-tight">{c.vehicle.replace(/^2024 Toyota /, '2024 ')}</h2>
            <p className="text-sm text-grey">{usd(c.balance)} · {c.apr}% APR · {c.monthsRemaining} months left</p>
          </div>
        )}
        <div className="w-64 [&_button]:whitespace-nowrap"><Segmented<View> label="Chart range" options={[{ value: 'last18', label: 'Last 18 months' }, { value: 'full', label: 'Full loan' }]} value={view} onChange={setView} /></div>
      </div>

      {plan.error && !p ? <div className="mt-4"><ErrorNote message={plan.error} retry={plan.reload} /></div> : !p ? <Skeleton className="mt-4 h-72" /> : (
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_260px]">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-grey">
              <span className="flex items-center gap-1.5"><span className="h-1 w-5 rounded-full bg-[#b5b5b5]" />Standard</span>
              <span className="flex items-center gap-1.5"><span className="h-1 w-5 rounded-full bg-accent" />With round-ups</span>
              {p.kpis.monthsSaved > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 font-medium text-white">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  Paid off {p.kpis.monthsSaved} {p.kpis.monthsSaved === 1 ? 'month' : 'months'} earlier · {usd(p.kpis.interestSaved)} interest saved
                </span>
              )}
            </div>
            <div className="h-64 w-full" role="img" aria-label="Loan balance over time, standard versus with round-ups">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 6, right: 10, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="#e8e8e8" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false} tickFormatter={(m: number) => `M${m}`} interval="preserveStartEnd" minTickGap={30} />
                  <YAxis tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip formatter={(v) => usd(Number(v))} labelFormatter={(m) => `Month ${m}`} contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.15)' }} />
                  <Line type="monotone" dataKey="standard" stroke="#b5b5b5" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="withRoundUps" stroke="#eb0a1e" strokeWidth={3.5} dot={false} isAnimationActive={false} />
                  {p.kpis.monthsSaved > 0 && <ReferenceDot x={p.withRoundUps.months} y={0} r={7} fill="#eb0a1e" stroke="#0b0b0b" strokeWidth={2} ifOverflow="visible" />}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-grey">Round-ups go to principal, which is why they save interest.</p>
          </div>
          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-4">
              <p className="label">Time saved</p>
              <p className="big mt-3 text-4xl"><AnimatedNumber value={p.kpis.monthsSaved} format={(n) => `${Math.round(n)}`} /> <span className="text-xl">months</span></p>
              <p className="mt-1 text-xs text-grey">new payoff {monthYear(p.kpis.newPayoffDate)}</p>
            </div>
            <div className="rounded-3xl bg-white p-4">
              <p className="label">Loan paid off</p>
              <div className="mt-3">{c ? <Gauge pct={c.percentPaid} /> : <Skeleton className="h-24" />}</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
