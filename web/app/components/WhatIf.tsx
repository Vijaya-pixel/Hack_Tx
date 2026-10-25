'use client';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Plan } from '@/lib/api';
import { monthYear, usd } from '@/lib/format';
import type { Loaded } from '@/lib/useApi';
import { Card, ErrorNote, Loading } from './ui';

interface Props { state: Loaded<Plan>; extra: number; onChange: (v: number) => void }

export function WhatIfCard({ state, extra, onChange }: Props) {
  const { data: plan, error, loading, reload } = state;
  if (error && !plan) return <Card title="What if" pillar="Simplify · Value"><ErrorNote message={error} retry={reload} /></Card>;
  if (loading && !plan) return <Card title="What if" pillar="Simplify · Value"><Loading /></Card>;
  if (!plan) return null;

  const months = Math.max(plan.standard.schedule.length, plan.withRoundUps.schedule.length);
  const data = Array.from({ length: months }, (_, m) => ({
    month: m,
    standard: plan.standard.schedule[m]?.balance ?? 0,
    withRoundUps: plan.withRoundUps.schedule[m]?.balance ?? 0,
  }));
  const max = plan.maxExtraPerWeek;
  const kpis = [
    { label: 'Months saved', value: String(plan.kpis.monthsSaved) },
    { label: 'Interest saved', value: usd(plan.kpis.interestSaved) },
    { label: 'New payoff date', value: monthYear(plan.kpis.newPayoffDate), sub: `was ${monthYear(plan.standard.payoffDate)}` },
  ];

  return (
    <Card title="What if" pillar="Simplify · Value">
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl bg-canvas p-3 md:p-4">
            <p className="text-xs text-muted">{k.label}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">{k.value}</p>
            {k.sub && <p className="text-xs text-muted">{k.sub}</p>}
          </div>
        ))}
      </div>

      <div className="mt-5">
        <label htmlFor="extra" className="flex items-baseline justify-between text-sm font-medium">
          <span>Extra per week toward principal</span>
          <span className="text-lg font-semibold text-toyota">{usd(extra)}</span>
        </label>
        <div className="relative mt-3 pb-8">
          <input id="extra" type="range" min={0} max={max} step="any" value={extra}
            onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-toyota" />
          <div className="pointer-events-none absolute top-5 -translate-x-1/2 text-center text-[11px] leading-tight text-muted"
            style={{ left: `calc(${(plan.avgPerWeek / max) * 100}% + ${8 - (plan.avgPerWeek / max) * 16}px)` }}>
            <div className="mx-auto h-2 w-px bg-ink" />
            Your average {usd(plan.avgPerWeek)}
          </div>
        </div>
        {Math.abs(extra - plan.avgPerWeek) > 0.005 && (
          <button onClick={() => onChange(plan.avgPerWeek)} className="text-sm font-medium text-toyota-dark underline underline-offset-2">Reset to my average</button>
        )}
      </div>

      <div className="mt-3 h-64 w-full" role="img" aria-label="Loan balance over time, standard versus with round-ups">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -4, bottom: 0 }}>
            <CartesianGrid stroke="#e7e5e4" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b6b70' }} tickFormatter={(m: number) => `${m}`} label={{ value: 'Months from now', position: 'insideBottom', offset: -2, fontSize: 12, fill: '#6b6b70' }} height={36} />
            <YAxis tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 12, fill: '#6b6b70' }} width={48} />
            <Tooltip formatter={(v) => usd(Number(v))} labelFormatter={(m) => `Month ${m}`} />
            <Legend verticalAlign="top" height={28} />
            <Line type="monotone" dataKey="standard" name="Standard" stroke="#6b6b70" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="withRoundUps" name="With round-ups" stroke="#eb0a1e" strokeWidth={3} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-sm text-muted">Round-ups go to principal, which is why they save interest.</p>
    </Card>
  );
}
