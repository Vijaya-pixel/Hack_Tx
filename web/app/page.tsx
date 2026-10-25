'use client';
import { useEffect, useState } from 'react';
import { api, type Customer, type Explanation, type Feed, type HardshipKind, type Health, type Plan, type Preset, type Roundups } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { AskCard } from './components/AskCard';
import { Header } from './components/Header';
import { HardshipDialog } from './components/HardshipDialog';
import { LiveCard } from './components/LiveCard';
import { LoanCard } from './components/LoanCard';
import { RoundupsCard } from './components/RoundupsCard';
import { Tiles } from './components/Tiles';
import { TightCard } from './components/TightCard';

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

  // The slider value; round-ups OFF plans with $0.
  const [extra, setExtra] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(true);
  const debounced = useDebounced(extra, 150);
  const plan = useApi<Plan>(`/api/plan${debounced === null ? '' : `?extraPerWeek=${enabled ? debounced : 0}`}`);
  useEffect(() => { if (extra === null && plan.data) setExtra(plan.data.avgPerWeek); }, [extra, plan.data]);

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
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-5 md:px-8 md:py-8">
      <Header name={customer.data?.name} feed={feed.data} />
      <main className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6">
          <RoundupsCard state={roundups} />
          <Tiles running={running} busy={demoBusy} onToggleDemo={toggleDemo} onRequest={setDialog}
            onPlan={() => scrollTo('loan')} onAsk={() => scrollTo('ask')} />
          <TightCard open={dialog !== null} onToggle={(v) => setDialog(v ? 'biweekly' : null)} />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <AskCard id="ask" state={explain} preset={preset} onPick={setPreset} />
          <LiveCard state={feed} busy={demoBusy} onToggle={toggleDemo} />
        </div>
        <LoanCard id="loan" customer={customer} plan={plan} extra={extra ?? 0} onExtra={setExtra} enabled={enabled} onEnabled={setEnabled} />
      </main>
      <HardshipDialog kind={dialog} plan={plan.data} onKind={setDialog} onClose={() => setDialog(null)} />
      <footer className="mt-8 text-xs text-grey">
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
