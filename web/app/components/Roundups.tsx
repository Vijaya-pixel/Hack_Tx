'use client';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Roundups } from '@/lib/api';
import { shortDay, usd } from '@/lib/format';
import type { Loaded } from '@/lib/useApi';
import { Card, Empty, ErrorNote, Loading } from './ui';

export function RoundupsCard({ state }: { state: Loaded<Roundups> }) {
  const { data, error, loading, reload } = state;
  return (
    <Card title="Your round-ups" pillar="Personalize">
      {error && !data ? <ErrorNote message={error} retry={reload} /> : loading && !data ? <Loading /> : !data || data.weekly.length === 0 ? (
        <Empty>No purchases yet. Round-ups will show up here as you spend.</Empty>
      ) : (
        <>
          <p className="text-2xl font-semibold tracking-tight md:text-3xl">
            You’ve rounded up <span className="text-toyota">{usd(data.total)}</span> in {data.weeks} weeks.
          </p>
          <p className="mt-1 text-sm text-muted">That’s about {usd(data.avgPerWeek)} a week, from {data.source === 'tigerdata' ? 'TigerData' : 'demo'} transactions.</p>
          <div className="mt-4 h-56 w-full" role="img" aria-label="Weekly round-up totals">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weekly} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e7e5e4" />
                <XAxis dataKey="week" tickFormatter={shortDay} tick={{ fontSize: 12, fill: '#6b6b70' }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tickFormatter={(v: number) => `$${v}`} tick={{ fontSize: 12, fill: '#6b6b70' }} width={44} />
                <Tooltip formatter={(v) => [usd(Number(v)), 'Round-ups']} labelFormatter={(l) => `Week of ${shortDay(String(l))}`} cursor={{ fill: '#f3f1ee' }} />
                <Bar dataKey="amount" fill="#eb0a1e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted">The last bar is this week so far.</p>
        </>
      )}
    </Card>
  );
}
