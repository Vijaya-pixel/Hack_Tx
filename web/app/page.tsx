'use client';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { Roundups } from '@/lib/api';
import { usd, usd2 } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { Car } from './components/Car';
import { Gauge } from './components/PayoffCard';
import { RoundupsCard } from './components/RoundupsCard';
import { useShared } from './components/Shell';
import { Card, ErrorNote, Skeleton } from './components/ui';

const LINKS = [
  { href: '/plans', title: 'Payoff plans', text: 'Compare extra-per-week plans and see months and interest saved.' },
  { href: '/live', title: 'Live feed', text: 'Watch purchases round up as they happen.' },
  { href: '/ask', title: 'Ask', text: 'Plain-language answers about your loan.' },
  { href: '/help', title: 'Help', text: 'Request a pause, bi-weekly payments or a credit.' },
];

export default function Home() {
  const { customer, running } = useShared();
  const roundups = useApi<Roundups>('/api/roundups?range=12w', running ? 4000 : 0);
  const c = customer.data;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl tracking-tight md:text-4xl">{c ? `Hi, ${c.name.split(' ')[0]}` : 'Welcome'}</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          {customer.error && !c ? <ErrorNote message={customer.error} retry={customer.reload} /> : !c ? <Skeleton className="h-80" /> : (
            <>
              <p className="label">Your loan</p>
              <h2 className="mt-1 text-2xl tracking-tight">{c.vehicle}</h2>
              <p className="text-sm text-grey">{usd(c.balance)} · {c.apr}% APR · {c.monthsRemaining} months left</p>
              <div className="mx-auto my-4 w-4/5"><Car /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-3xl bg-white p-4"><p className="label">Monthly payment</p><p className="big mt-3 text-3xl">{usd2(c.monthlyPayment)}</p></div>
                <div className="rounded-3xl bg-white p-4"><p className="label">Loan paid off</p><div className="mt-2"><Gauge pct={c.percentPaid} /></div></div>
              </div>
            </>
          )}
        </Card>
        <RoundupsCard state={roundups} />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="card group flex flex-col justify-between gap-6 p-6">
            <div>
              <h2 className="text-lg tracking-tight">{l.title}</h2>
              <p className="copy mt-1 text-[13px] text-grey">{l.text}</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-full border border-[#e2e2e2] bg-white transition-colors group-hover:bg-ink group-hover:text-white"><ArrowUpRight size={18} strokeWidth={1.5} /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
