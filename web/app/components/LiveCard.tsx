'use client';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useState } from 'react';
import type { Feed } from '@/lib/api';
import { usd2 } from '@/lib/format';
import type { Loaded } from '@/lib/useApi';
import { Card, ErrorNote, Skeleton } from './ui';

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
        <h2 className="text-xl font-semibold tracking-tight">Live</h2>
        <span className="flex items-center gap-2 text-xs text-grey">
          <span className={`h-2 w-2 rounded-full ${data?.running ? 'animate-pulse bg-accent' : 'bg-[#cfcfcf]'}`} />
          {data?.running ? 'Demo running' : 'Demo stopped'}
        </span>
      </div>
      {error && !data ? <div className="mt-4"><ErrorNote message={error} retry={reload} /></div> : !data ? <Skeleton className="mt-4 h-64" /> : !current ? (
        <p className="mt-4 rounded-2xl bg-soft p-8 text-center text-sm text-grey">No purchases yet. Press play to start the demo feed.</p>
      ) : (
        <>
          <div className="mt-4 rounded-3xl bg-accent p-5 text-white">
            <p className="text-xs font-medium uppercase tracking-widest opacity-60">{pinned === null ? 'Latest purchase' : 'Earlier purchase'}</p>
            <p className="mt-6 text-2xl font-light leading-tight">{current.category} {usd2(current.amount)}</p>
            <p className="big mt-1 text-6xl font-light">+{usd2(current.roundup)}</p>
            <p className="mt-2 text-sm opacity-70">{current.merchant} · to your loan</p>
          </div>
          <div className="mt-5 flex h-14 items-end gap-[3px]" role="img" aria-label="Last 30 round-ups">
            {bars.map((t) => (
              <button key={t.id} onClick={() => setPinned(t.id === items[0].id ? null : t.id)} aria-label={`${t.merchant} ${usd2(t.roundup)}`}
                className={`flex-1 rounded-full transition-colors ${t.id === current.id ? 'bg-accent' : 'bg-[#dcdcdc] hover:bg-[#bdbdbd]'}`}
                style={{ height: `${Math.max(12, (t.roundup / max) * 100)}%` }} />
            ))}
          </div>
        </>
      )}
      <div className="mt-5 flex items-center justify-center gap-4">
        <button onClick={() => go(idx + 1)} disabled={!current || idx >= items.length - 1} aria-label="Previous purchase" className="grid h-11 w-11 place-items-center rounded-full bg-soft"><ChevronLeft size={22} strokeWidth={1.5} /></button>
        <button onClick={onToggle} disabled={busy || !data} aria-label={data?.running ? 'Stop the demo feed' : 'Start the demo feed'} className="grid h-14 w-14 place-items-center rounded-full bg-ink text-white">
          {data?.running ? <Pause size={24} strokeWidth={1.5} /> : <Play size={24} strokeWidth={1.5} />}
        </button>
        <button onClick={() => go(idx - 1)} disabled={!current || idx <= 0} aria-label="Next purchase" className="grid h-11 w-11 place-items-center rounded-full bg-soft"><ChevronRight size={22} strokeWidth={1.5} /></button>
      </div>
    </Card>
  );
}
