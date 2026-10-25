'use client';
import { useEffect, useState } from 'react';
import type { Customer, Explanation, Feed, Health, Plan, Preset, Roundups } from '@/lib/api';
import { usd } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { AskCard } from './components/Ask';
import { LiveFeedCard } from './components/LiveFeed';
import { RoundupsCard } from './components/Roundups';
import { TightCard } from './components/Tight';
import { WhatIfCard } from './components/WhatIf';
import { ErrorNote } from './components/ui';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

const MODE_NAMES: Record<string, string> = { tigerdata: 'TigerData', postgres: 'Postgres', memory: 'demo memory', cortex: 'Snowflake Cortex', template: 'built-in template', snowflake: 'Snowflake', local: 'local seed' };

export default function Dashboard() {
  const customer = useApi<Customer>('/api/customer');
  const health = useApi<Health>('/api/health', 10_000);
  const feed = useApi<Feed>('/api/feed?limit=8', 3000);
  const running = feed.data?.running ?? false;
  const roundups = useApi<Roundups>('/api/roundups?range=12w', running ? 4000 : 0);

  const [extra, setExtra] = useState<number | null>(null);
  const debounced = useDebounced(extra, 150);
  const plan = useApi<Plan>(`/api/plan${debounced === null ? '' : `?extraPerWeek=${debounced}`}`);
  useEffect(() => { if (extra === null && plan.data) setExtra(plan.data.avgPerWeek); }, [extra, plan.data]);

  const [preset, setPreset] = useState<Preset>('worth');
  const settled = useDebounced(extra, 500);
  const explain = useApi<Explanation>(settled === null ? null : `/api/explain?preset=${preset}&extraPerWeek=${settled}`);

  const c = customer.data;
  return (
    <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-toyota text-lg font-bold text-white" aria-hidden>R</div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-toyota">Toyota Financial Services</p>
            <p className="-mt-0.5 text-xl font-semibold tracking-tight">Round-Up</p>
          </div>
        </div>
        <span className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-muted">Demo data</span>
      </header>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink p-5 text-white">
        {customer.error && !c ? <ErrorNote message={customer.error} retry={customer.reload} /> : (
          <>
            <div>
              <p className="text-lg font-semibold">{c ? `${c.name} · ${c.vehicle}` : 'Loading…'}</p>
              <p className="text-sm text-white/70">Your auto loan</p>
            </div>
            {c && <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium">
              {usd(c.balance)} · {c.apr}% APR · {c.monthsRemaining} months left
            </span>}
          </>
        )}
      </div>

      <main className="mt-5 grid gap-5 lg:grid-cols-2">
        <RoundupsCard state={roundups} />
        <LiveFeedCard state={feed} />
        <div className="lg:col-span-2"><WhatIfCard state={plan} extra={extra ?? 0} onChange={setExtra} /></div>
        <div className="lg:col-span-2"><AskCard state={explain} preset={preset} onPreset={setPreset} /></div>
        <div className="lg:col-span-2"><TightCard plan={plan.data} /></div>
      </main>

      <footer className="mt-8 border-t border-line pt-4 text-xs text-muted">
        <p>Concept for Toyota Financial Services. Not an official Toyota app. All data is synthetic.</p>
        {health.data && (
          <p className="mt-1">
            Transactions: {MODE_NAMES[health.data.database.mode] ?? health.data.database.mode} · Customer: {MODE_NAMES[health.data.snowflake.customerSource] ?? health.data.snowflake.customerSource} · Explanations: {MODE_NAMES[health.data.ai.mode] ?? health.data.ai.mode}
          </p>
        )}
      </footer>
    </div>
  );
}
