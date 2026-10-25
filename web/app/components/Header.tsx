'use client';
import { Bell } from 'lucide-react';
import { useState } from 'react';
import type { Feed } from '@/lib/api';
import { usd2 } from '@/lib/format';

export function Header({ name, feed }: { name?: string; feed: Feed | null }) {
  const [open, setOpen] = useState(false);
  const items = feed?.items.slice(0, 5) ?? [];
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="leading-none">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-toyota">Toyota Financial Services</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">Round-Up</p>
        </div>
        <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-medium text-grey sm:inline">Demo data</span>
      </div>
      <div className="relative flex items-center gap-3">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-grey sm:hidden">Demo data</span>
        <button onClick={() => setOpen((o) => !o)} aria-label="Recent round-ups" aria-expanded={open}
          className="relative grid h-11 w-11 place-items-center rounded-full bg-white shadow-sm">
          <Bell size={20} strokeWidth={1.5} />
          {feed?.running && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-neon" />}
        </button>
        {open && (
          <div className="absolute right-0 top-14 z-20 w-72 rounded-3xl bg-white p-4 shadow-2xl">
            <p className="label mb-2">Recent round-ups</p>
            {items.length === 0 ? <p className="text-sm text-grey">Nothing yet. Start the demo feed.</p> : (
              <ul className="space-y-2">
                {items.map((t) => (
                  <li key={t.id} className="flex justify-between gap-2 text-sm">
                    <span className="truncate">{t.merchant}</span>
                    <span className="font-medium">+{usd2(t.roundup)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-4 shadow-sm">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-semibold text-white" aria-hidden>
            {name ? name.split(' ').map((p) => p[0]).join('').slice(0, 2) : '…'}
          </span>
          <span className="hidden text-sm font-medium sm:inline">{name ?? 'Loading…'}</span>
        </div>
      </div>
    </header>
  );
}
