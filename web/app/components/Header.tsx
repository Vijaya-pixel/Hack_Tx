'use client';
import { Bell } from 'lucide-react';
import { useState } from 'react';
import type { Feed } from '@/lib/api';
import { usd2 } from '@/lib/format';

const NAV = [
  { id: 'top', label: 'Home' },
  { id: 'plans', label: 'Plans' },
  { id: 'live', label: 'Live' },
  { id: 'ask', label: 'Ask' },
];

export function Header({ name, feed, onHelp }: { name?: string; feed: Feed | null; onHelp: () => void }) {
  const [open, setOpen] = useState(false);
  const items = feed?.items.slice(0, 5) ?? [];
  const go = (id: string) => (id === 'top' ? window.scrollTo({ top: 0, behavior: 'smooth' }) : document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  return (
    <header className="border-b border-[#eee] bg-white">
      <div className="mx-auto grid max-w-[1360px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4 md:px-8">
        <nav aria-label="Sections" className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => go(n.id)} className="text-[15px] text-grey transition-colors hover:text-ink">{n.label}</button>
          ))}
          <button onClick={onHelp} className="text-[15px] text-grey transition-colors hover:text-ink">Help</button>
        </nav>
        <div className="col-start-1 text-left md:col-start-2 md:text-center">
          <p className="text-lg font-medium uppercase tracking-[0.4em] md:text-xl">Round·Up</p>
          <p className="-mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-toyota">Toyota Financial Services · Concept</p>
        </div>
        <div className="relative col-start-3 flex items-center justify-end gap-3">
          <span className="hidden rounded-full bg-[#f3f3f3] px-3 py-1 text-xs font-medium text-grey lg:inline">Demo data</span>
          <button onClick={() => setOpen((o) => !o)} aria-label="Recent round-ups" aria-expanded={open}
            className="relative grid h-11 w-11 place-items-center rounded-full border border-[#eee] bg-white">
            <Bell size={20} strokeWidth={1.5} />
            {feed?.running && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-accent" />}
          </button>
          {open && (
            <div className="absolute right-0 top-14 z-20 w-72 rounded-3xl border border-[#eee] bg-white p-4 shadow-2xl">
              <p className="label mb-2">Recent round-ups</p>
              {items.length === 0 ? <p className="text-sm text-grey">Nothing yet. Start the demo on the Live card.</p> : (
                <ul className="space-y-2">
                  {items.map((t) => (
                    <li key={t.id} className="flex justify-between gap-2 text-sm"><span className="truncate">{t.merchant}</span><span className="font-medium">+{usd2(t.roundup)}</span></li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-xs font-semibold text-white" title={name} aria-label={name ?? 'Account'}>
            {name ? name.split(' ').map((p) => p[0]).join('').slice(0, 2) : '…'}
          </span>
        </div>
      </div>
      <nav aria-label="Sections" className="flex gap-6 overflow-x-auto px-4 pb-3 md:hidden">
        {NAV.map((n) => <button key={n.id} onClick={() => go(n.id)} className="whitespace-nowrap text-sm text-grey">{n.label}</button>)}
        <button onClick={onHelp} className="whitespace-nowrap text-sm text-grey">Help</button>
      </nav>
    </header>
  );
}
