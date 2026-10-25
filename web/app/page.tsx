'use client';
import { useEffect, useState } from 'react';
import { api, type Customer, type Explanation, type Feed, type HardshipKind, type Health, type Plan, type Preset, type Roundups } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { AskCard } from './components/AskCard';
import { Header } from './components/Header';
import { HardshipDialog } from './components/HardshipDialog';
import { LiveCard } from './components/LiveCard';
import { PayoffCard } from './components/PayoffCard';
import { PlanCards, buildOptions } from './components/PlanCards';
import { Sidebar } from './components/Sidebar';
import { RoundupsCard } from './components/RoundupsCard';

const MODE_NAMES: Record<string, string> = { tigerdata: 'TigerData', postgres: 'Postgres', memory: 'demo memory', cortex: 'Snowflake Cortex', template: 'built-in template', snowflake: 'Snowflake', local: 'local seed' };

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export default function Dashboard() {
  const customer = useApi<Customer>('/api/customer');
  const health = useApi<Health>('/api/health', 10_000);
  const feed = useApi<Feed>('/api/feed?limit=30', 3000);
  const running = feed.data?.running ?? false;
  const roundups = useApi<Roundups>('/api/roundups?range=12w', running ? 4000 : 0);

  // The chosen extra per week; round-ups OFF plans with $0.
  const [extra, setExtra] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(true);
  const debounced = useDebounced(extra, 150);
  const plan = useApi<Plan>(`/api/plan${debounced === null ? '' : `?extraPerWeek=${enabled ? debounced : 0}`}`);
  const base = useApi<Plan>('/api/plan'); // Alex's real average and the bi-weekly effect
  useEffect(() => { if (extra === null && base.data) setExtra(base.data.avgPerWeek); }, [extra, base.data]);
  const others = { 0: useApi<Plan>('/api/plan?extraPerWeek=0'), 10: useApi<Plan>('/api/plan?extraPerWeek=10'), 25: useApi<Plan>('/api/plan?extraPerWeek=25'), 50: useApi<Plan>('/api/plan?extraPerWeek=50') };
  const options = buildOptions(base.data, others);

  const [preset, setPreset] = useState<Preset>('worth');
  const settled = useDebounced(enabled ? extra : 0, 400);
  const explain = useApi<Explanation>(settled === null ? null : `/api/explain?preset=${preset}&extraPerWeek=${settled}`);

  const [dialog, setDialog] = useState<HardshipKind | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);
  async function toggleDemo() {
    setDemoBusy(true);
    try { await api(`/api/simulator/${running ? 'stop' : 'start'}`, { method: 'POST' }); feed.reload(); }
    finally { setDemoBusy(false); }
  }

  return (
    <div id="top">
      <Header name={customer.data?.name} feed={feed.data} onHelp={() => setDialog('biweekly')} />
      <div className="mx-auto grid max-w-[1360px] gap-10 px-4 py-8 md:px-8 lg:grid-cols-[280px_1fr]">
        <Sidebar plan={base.data} extra={extra ?? 0} onExtra={setExtra} enabled={enabled} onEnabled={setEnabled}
          dialogOpen={dialog !== null} onRequest={setDialog} onTight={(v) => setDialog(v ? 'biweekly' : null)} />
        <main className="min-w-0 space-y-6">
          <section id="plans" className="space-y-6">
            <div className="flex items-baseline justify-between gap-3">
              <h1 className="text-3xl font-medium tracking-tight md:text-4xl">Payoff plans <span className="font-light text-grey">({options.length})</span></h1>
              <p className="hidden text-sm text-grey sm:block">Pick one with the arrow</p>
            </div>
            <PlanCards options={options} extra={extra ?? 0} onSelect={(v) => { setExtra(v); setEnabled(true); }} onBiweekly={() => setDialog('biweekly')} />
          </section>
          <PayoffCard id="loan" customer={customer} plan={plan} />
          <RoundupsCard state={roundups} />
          <div className="grid items-start gap-6 md:grid-cols-2">
            <div id="live" className="min-w-0"><LiveCard state={feed} busy={demoBusy} onToggle={toggleDemo} /></div>
            <div className="min-w-0"><AskCard id="ask" state={explain} preset={preset} onPick={setPreset} /></div>
          </div>
        </main>
      </div>
      <HardshipDialog kind={dialog} plan={base.data} onKind={setDialog} onClose={() => setDialog(null)} />
      <footer className="mx-auto max-w-[1360px] px-4 pb-8 text-xs text-grey md:px-8">
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
