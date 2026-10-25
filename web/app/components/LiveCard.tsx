'use client';
import { ChevronLeft, ChevronRight, Coffee, Fuel, Pause, Pill, Play, ShoppingBag, ShoppingCart, Store, Tv, Utensils, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { Feed } from '@/lib/api';
import { usd2 } from '@/lib/format';
import type { Loaded } from '@/lib/useApi';
import { Card, ErrorNote, Skeleton } from './ui';

// A small icon for each purchase category.
const ICONS: Record<string, LucideIcon> = {
  Coffee, Lunch: Utensils, Dining: Utensils, Groceries: ShoppingCart, Gas: Fuel, Convenience: Store, Shopping: ShoppingBag, Pharmacy: Pill, Subscriptions: Tv,
};

export function LiveCard({ state, busy, onToggle }: { state: Loaded<Feed>; busy: boolean; onToggle: () => void }) {
  const { data, error, reload } = state;
  const [pinned, setPinned] = useState<number | null>(null); // null follows the newest purchase
  const items = data?.items ?? [];
  const idx = pinned === null ? 0 : Math.max(0, items.findIndex((t) => t.id === pinned));
  const current = items[idx];
  const bars = [...items].reverse(); // oldest to newest, left to right
  const max = Math.max(0.01, ...bars.map((t) => t.roundup));
  const go = (to: number) => { const t = items[Math.min(items.length - 1, Math.max(0, to))]; if (t) setPinned(to <= 0 ? null : t.id); };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-xl tracking-tight">Live</h2>
        <span className="flex items-center gap-2 text-xs text-grey">
          <span className={`h-2 w-2 rounded-full ${data?.running ? 'animate-pulse bg-chart' : 'bg-track'}`} />
          {data?.running ? 'Demo running' : 'Demo stopped'}
        </span>
      </div>
      {error && !data ? <div className="mt-4"><ErrorNote message={error} retry={reload} /></div> : !data ? <Skeleton className="mt-4 h-64" /> : !current ? (
        <p className="mt-4 rounded-2xl bg-soft p-8 text-center text-sm text-grey">No purchases yet. Press play to start the demo feed.</p>
      ) : (
        <>
          {/* Keyed by the purchase, so each new one fades in. */}
          <div key={current.id} className="page-enter mt-4 overflow-hidden rounded-2xl border border-line bg-panel">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-grey">{pinned === null ? 'Latest purchase' : 'Earlier purchase'}</p>
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-grey">
                <span className={`h-2 w-2 rounded-full ${data?.running ? 'animate-pulse bg-chart' : 'bg-track'}`} />{data?.running ? 'Live' : 'Paused'}
              </span>
            </div>
            <div className="flex items-center gap-4 px-5 pt-5">
              {(() => { const Icon = ICONS[current.category] ?? Store; return <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-soft text-ink"><Icon size={22} strokeWidth={1.5} /></span>; })()}
              <div className="min-w-0">
                <p className="truncate text-[17px] font-medium leading-tight">{current.merchant}</p>
                <p className="mt-0.5 text-sm text-grey">{current.category} · {usd2(current.amount)}</p>
              </div>
            </div>
            <div className="px-5 pb-5 pt-4">
              <p className="big text-6xl font-medium text-chart">+{usd2(current.roundup)}</p>
              <p className="mt-1.5 text-sm text-grey">rounded up and added to your loan principal</p>
            </div>
          </div>
          <div className="mt-5 flex h-14 items-end gap-[3px]" role="img" aria-label="Last 30 round-ups">
            {bars.map((t) => (
              <button key={t.id} onClick={() => setPinned(t.id === items[0].id ? null : t.id)} aria-label={`${t.merchant} ${usd2(t.roundup)}`}
                className={`flex-1 rounded-full transition-colors ${t.id === current.id ? 'bg-chart' : 'bg-track hover:bg-grey'}`}
                style={{ height: `${Math.max(12, (t.roundup / max) * 100)}%` }} />
            ))}
          </div>
        </>
      )}
      <div className="mt-5 flex items-center justify-center gap-4">
        <button onClick={() => go(idx + 1)} disabled={!current || idx >= items.length - 1} aria-label="Previous purchase" className="grid h-11 w-11 place-items-center rounded-full bg-soft"><ChevronLeft size={22} strokeWidth={1.5} /></button>
        <button onClick={onToggle} disabled={busy || !data} aria-label={data?.running ? 'Stop the demo feed' : 'Start the demo feed'} className="skeu grid h-14 w-14 place-items-center rounded-full">
          {data?.running ? <Pause size={24} strokeWidth={1.5} /> : <Play size={24} strokeWidth={1.5} />}
        </button>
        <button onClick={() => go(idx - 1)} disabled={!current || idx <= 0} aria-label="Next purchase" className="grid h-11 w-11 place-items-center rounded-full bg-soft"><ChevronRight size={22} strokeWidth={1.5} /></button>
      </div>
    </Card>
  );
}
