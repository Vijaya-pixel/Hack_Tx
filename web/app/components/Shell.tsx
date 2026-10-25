'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import type { Customer, Health, Plan } from '@/lib/api';
import { usd } from '@/lib/format';
import { useApi, type Loaded } from '@/lib/useApi';
import { ErrorNote } from './ui';

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

// The extra-per-week choice and the plan built from it are shared, so every page agrees.
interface Shared { plan: Loaded<Plan>; extra: number | null; setExtra: (v: number) => void }
const Ctx = createContext<Shared | null>(null);
export const useShared = (): Shared => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useShared must be used inside Shell');
  return v;
};

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/roundups', label: 'Round-ups' },
  { href: '/live', label: 'Live feed' },
  { href: '/what-if', label: 'What if' },
  { href: '/ask', label: 'Ask' },
  { href: '/help', label: 'Money is tight?' },
];

const MODE_NAMES: Record<string, string> = { tigerdata: 'TigerData', postgres: 'Postgres', memory: 'demo memory', cortex: 'Snowflake Cortex', template: 'built-in template', snowflake: 'Snowflake', local: 'local seed' };

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const customer = useApi<Customer>('/api/customer');
  const health = useApi<Health>('/api/health', 10_000);
  const [extra, setExtra] = useState<number | null>(null);
  const debounced = useDebounced(extra, 150);
  const plan = useApi<Plan>(`/api/plan${debounced === null ? '' : `?extraPerWeek=${debounced}`}`);
  useEffect(() => { if (extra === null && plan.data) setExtra(plan.data.avgPerWeek); }, [extra, plan.data]);

  const c = customer.data;
  return (
    <Ctx.Provider value={{ plan, extra, setExtra }}>
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-toyota text-lg font-bold text-white" aria-hidden>R</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-toyota">Toyota Financial Services</p>
              <p className="-mt-0.5 text-xl font-semibold tracking-tight">Round-Up</p>
            </div>
          </Link>
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

        <nav aria-label="Sections" className="mt-4 flex gap-1 overflow-x-auto border-b border-line">
          {NAV.map((n) => {
            const active = n.href === '/' ? path === '/' : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${active ? 'border-toyota text-toyota-dark' : 'border-transparent text-muted hover:text-ink'}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>

        <main className="mt-5">{children}</main>

        <footer className="mt-8 border-t border-line pt-4 text-xs text-muted">
          <p>Concept for Toyota Financial Services. Not an official Toyota app. All data is synthetic.</p>
          {health.data && (
            <p className="mt-1">
              Transactions: {MODE_NAMES[health.data.database.mode] ?? health.data.database.mode} · Customer: {MODE_NAMES[health.data.snowflake.customerSource] ?? health.data.snowflake.customerSource} · Explanations: {MODE_NAMES[health.data.ai.mode] ?? health.data.ai.mode}
            </p>
          )}
        </footer>
      </div>
    </Ctx.Provider>
  );
}
