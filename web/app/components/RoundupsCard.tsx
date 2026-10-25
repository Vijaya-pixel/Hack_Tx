'use client';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { Roundups } from '@/lib/api';
import { shortDay, usd, usd2 } from '@/lib/format';
import type { Loaded } from '@/lib/useApi';
import { AnimatedNumber, Card, ErrorNote, Skeleton } from './ui';

export function RoundupsCard({ state }: { state: Loaded<Roundups> }) {
  const { data, error, reload } = state;
  return (
    <Card>
      <p className="label">Your Round-Ups</p>
      {error && !data ? <div className="mt-4"><ErrorNote message={error} retry={reload} /></div> : !data ? (
        <><Skeleton className="mt-4 h-14 w-48" /><Skeleton className="mt-5 h-72" /></>
      ) : (
        <>
          <p className="big mt-3 text-5xl md:text-6xl"><AnimatedNumber value={data.total} format={usd} /></p>
          <p className="mt-2 text-sm text-grey">rounded up in {data.weeks} weeks · about {usd2(data.avgPerWeek)} a week</p>
          {data.weekly.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-soft p-6 text-center text-sm text-grey">No purchases yet. Start the demo feed to see round-ups.</p>
          ) : (
            <div className="mt-5 rounded-3xl bg-soft p-3">
              <div className="h-48 w-full" role="img" aria-label="Weekly round-up totals">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weekly} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="22%">
                    <XAxis dataKey="week" tickFormatter={shortDay} tick={{ fontSize: 11, fill: '#9a9a9a' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} formatter={(v) => [usd2(Number(v)), 'Round-ups']} labelFormatter={(l) => `Week of ${shortDay(String(l))}`} contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.15)' }} />
                    <Bar dataKey="amount" fill="#ffc83d" radius={[8, 8, 8, 8]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 rounded-2xl bg-ink p-4 text-white">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm text-white/70">{data.highlight.label}</p>
                  <p className="text-sm"><span className="text-xl font-light"><AnimatedNumber value={data.highlight.amount} format={usd2} /></span> → toward principal</p>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-label="Progress toward your weekly average" aria-valuenow={Math.round(data.highlight.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${data.highlight.progress * 100}%` }} />
                </div>
                <p className="mt-1.5 text-[11px] text-white/50">toward your {usd2(data.avgPerWeek)} weekly average</p>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
