'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { api, type Customer, type Feed, type Health, type Plan } from '@/lib/api';
import { loanQs, withQs, type LoanInput } from '@/lib/loanQuery';
import { useApi, type Loaded } from '@/lib/useApi';
import { Header } from './Header';

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

// State shared by every page: the customer, the live feed, and the chosen extra per week with its plan.
interface Shared {
  customer: Loaded<Customer>;
  feed: Loaded<Feed>;
  running: boolean;
  demoBusy: boolean;
  toggleDemo: () => void;
  loan: LoanInput | null; // typed-in loan values, or null for Vijay's
  setLoan: (l: LoanInput | null) => void;
  loanQuery: string;
  base: Loaded<Plan>; // Vijay's real average and the bi-weekly effect
  plan: Loaded<Plan>; // the plan for the chosen extra
  extra: number;
  setExtra: (v: number) => void;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
}
const Ctx = createContext<Shared | null>(null);
export const useShared = (): Shared => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useShared must be used inside Shell');
  return v;
};

const MODE_NAMES: Record<string, string> = { tigerdata: 'TigerData', postgres: 'Postgres', memory: 'demo memory', gemini: 'Google Gemini', template: 'standard text', local: 'demo seed' };

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [loan, setLoan] = useState<LoanInput | null>(null);
  const loanQuery = loanQs(loan);
  const customer = useApi<Customer>(withQs('/api/customer', loanQuery));
  const health = useApi<Health>('/api/health', 10_000);
  const feed = useApi<Feed>('/api/feed?limit=30', 3000);
  const running = feed.data?.running ?? false;
  const [demoBusy, setDemoBusy] = useState(false);
  async function toggleDemo() {
    setDemoBusy(true);
    try { await api(`/api/simulator/${running ? 'stop' : 'start'}`, { method: 'POST' }); feed.reload(); }
    finally { setDemoBusy(false); }
  }

  const [chosen, setChosen] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(true);
  const base = useApi<Plan>(withQs('/api/plan', loanQuery));
  const extra = chosen ?? base.data?.avgPerWeek ?? 0;
  const debounced = useDebounced(extra, 150);
  const plan = useApi<Plan>(base.data ? withQs(`/api/plan?extraPerWeek=${enabled ? debounced : 0}`, loanQuery) : null);

  return (
    <Ctx.Provider value={{ customer, loan, setLoan, loanQuery, feed, running, demoBusy, toggleDemo, base, plan, extra, setExtra: setChosen, enabled, setEnabled }}>
      <Header name={customer.data?.name} feed={feed.data} path={path} />
      <div className="mx-auto max-w-[1360px] px-4 py-8 md:px-8">{children}</div>
      <footer className="mx-auto max-w-[1360px] px-4 pb-8 text-xs text-grey md:px-8">
        <p>Concept for Toyota Financial Services. Not an official Toyota app. All data is synthetic.</p>
        {health.data && (
          <p className="mt-1">
            Transactions: {MODE_NAMES[health.data.database.mode] ?? health.data.database.mode} · Customer: {MODE_NAMES[health.data.customer.source] ?? health.data.customer.source} · Explanations: {MODE_NAMES[health.data.ai.mode] ?? health.data.ai.mode}
          </p>
        )}
        <Link href="/" className="sr-only">Home</Link>
      </footer>
    </Ctx.Provider>
  );
}
