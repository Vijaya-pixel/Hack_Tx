'use client';
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Roundups } from '@/lib/api';
import { shortDay, usd, usd2 } from '@/lib/format';
import type { Loaded } from '@/lib/useApi';
import { ChartTip } from './ChartTip';
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
          <p className="mt-2 text-sm text-grey">rounded up in {data.weeks} weeks · the dashed line is your {usd2(data.avgPerWeek)} weekly average</p>
          {data.weekly.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-soft p-6 text-center text-sm text-grey">No purchases yet. Start the demo feed to see round-ups.</p>
          ) : (
            <div className="mt-5 rounded-3xl bg-soft p-3">
              <div className="h-56 w-full" role="img" aria-label="Weekly round-up totals">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weekly} margin={{ top: 14, right: 8, left: -14, bottom: 0 }} barCategoryGap="24%">
                    <defs>
                      <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" style={{ stopColor: 'var(--chart)', stopOpacity: 0.95 }} />
                        <stop offset="1" style={{ stopColor: 'var(--chart)', stopOpacity: 0.35 }} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="week" tickFormatter={shortDay} tick={{ fontSize: 11, fill: 'var(--color-grey)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
                    <YAxis tickFormatter={(v: number) => `$${v}`} tick={{ fontSize: 11, fill: 'var(--color-grey)' }} axisLine={false} tickLine={false} width={44} tickCount={4} />
                    <Tooltip cursor={{ fill: 'var(--color-soft)', radius: 12 }} content={({ active, payload, label }) => active && payload?.length
                      ? <ChartTip title={`Week of ${shortDay(String(label))}`} rows={[{ label: 'Round-ups', value: usd2(Number(payload[0].value)), color: 'var(--chart)' }, { label: 'Purchases', value: String(payload[0].payload.count) }]} /> : null} />
                    <ReferenceLine y={data.avgPerWeek} stroke="var(--color-grey)" strokeDasharray="5 5" />
                    <Bar dataKey="amount" radius={[10, 10, 10, 10]} isAnimationActive={false}>
                      {data.weekly.map((w, i) => <Cell key={w.week} fill={i === data.weekly.length - 1 ? 'var(--chart)' : 'url(#barFill)'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 rounded-2xl bg-fill p-4 text-onfill">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm text-onfill/70">{data.highlight.label}</p>
                  <p className="text-sm"><span className="text-xl font-light"><AnimatedNumber value={data.highlight.amount} format={usd2} /></span> → toward principal</p>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-onfill/20" role="progressbar" aria-label="Progress toward your weekly average" aria-valuenow={Math.round(data.highlight.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-onfill transition-all duration-500" style={{ width: `${data.highlight.progress * 100}%` }} />
                </div>
                <p className="mt-1.5 text-[11px] text-onfill/50">toward your {usd2(data.avgPerWeek)} weekly average</p>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
