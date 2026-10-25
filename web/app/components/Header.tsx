'use client';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { useState } from 'react';
import type { Feed } from '@/lib/api';
import { usd2 } from '@/lib/format';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/plans', label: 'Plans' },
  { href: '/live', label: 'Live' },
  { href: '/ask', label: 'Ask' },
  { href: '/help', label: 'Help' },
];

export function Header({ name, feed, path }: { name?: string; feed: Feed | null; path: string }) {
  const [open, setOpen] = useState(false);
  const items = feed?.items.slice(0, 5) ?? [];
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  const link = (href: string, label: string, size: string) => (
    <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
      className={`${size} whitespace-nowrap transition-colors ${active(href) ? 'font-semibold text-ink underline decoration-toyota decoration-[3px] underline-offset-[10px]' : 'text-grey hover:text-ink'}`}>{label}</Link>
  );
  return (
    <header className="dark sticky top-0 z-40 border-b-[3px] border-edge bg-page text-ink">
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4 md:px-6">
        <div className="col-start-1 text-left">
          <Link href="/" className="block" aria-label="RoundGear home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/roundgear-logo.png" alt="RoundGear" width={900} height={153} className="h-9 w-auto md:h-11" />
          </Link>
        </div>
        <nav aria-label="Sections" className="hidden items-center justify-center gap-8 md:col-start-2 md:flex xl:gap-12">
          {NAV.map((n) => link(n.href, n.label, 'text-lg xl:text-xl'))}
        </nav>
        <div className="relative col-start-3 flex items-center justify-end gap-3">
          <ThemeToggle />
          <button onClick={() => setOpen((o) => !o)} aria-label="Recent round-ups" aria-expanded={open}
            className="relative grid h-11 w-11 place-items-center rounded-full border border-line bg-panel">
            <Bell size={20} strokeWidth={1.5} />
            {feed?.running && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-accent" />}
          </button>
          {open && (
            <div className="absolute right-0 top-14 z-20 w-72 rounded-3xl border border-line bg-panel p-4 shadow-2xl">
              <p className="label mb-2">Recent round-ups</p>
              {items.length === 0 ? <p className="text-sm text-grey">Nothing yet. Start the demo on the Live page.</p> : (
                <ul className="space-y-2">
                  {items.map((t) => (
                    <li key={t.id} className="flex justify-between gap-2 text-sm"><span className="truncate">{t.merchant}</span><span className="font-medium">+{usd2(t.roundup)}</span></li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <span className="grid h-11 w-11 place-items-center rounded-full bg-fill text-xs font-semibold text-onfill" title={name} aria-label={name ?? 'Account'}>
            {name ? name.split(' ').map((p) => p[0]).join('').slice(0, 2) : '…'}
          </span>
        </div>
      </div>
      <nav aria-label="Sections" className="flex gap-6 overflow-x-auto px-4 pb-3 md:hidden">
        {NAV.map((n) => link(n.href, n.label, 'text-sm'))}
      </nav>
    </header>
  );
}
