'use client';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { Roundups } from '@/lib/api';
import { usd, usd2 } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { Car } from './components/Car';
import { PixelScene } from './components/PixelScene';
import { Gauge } from './components/PayoffCard';
import { RoundupsCard } from './components/RoundupsCard';
import { useShared } from './components/Shell';
import { LoanForm } from './components/LoanForm';
import { Card, ErrorNote, Skeleton } from './components/ui';

const LINKS = [
  { href: '/plans', title: 'Payoff plans', text: 'Compare extra-per-week plans and see months and interest saved.' },
  { href: '/live', title: 'Live feed', text: 'Watch purchases round up as they happen.' },
  { href: '/ask', title: 'Ask', text: 'Plain-language answers about your loan.' },
  { href: '/help', title: 'Help', text: 'Request a pause, bi-weekly payments or a credit.' },
];

function HeroStat({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 rounded-xl bg-soft px-4 py-3 text-[15px] text-ink">{value ?? <span className="text-grey">…</span>}</div>
    </div>
  );
}

export default function Home() {
  const { customer, running, loan, setLoan } = useShared();
  const roundups = useApi<Roundups>('/api/roundups?range=12w', running ? 4000 : 0);
  const c = customer.data;
  return (
    <div className="space-y-24 md:space-y-32">
      {/* Hero: photo, big headline, and a card of the loan's key numbers that overlaps the bottom edge */}
      <section className="relative pb-24 md:pb-20">
        <div className="scene-sky relative h-[500px] overflow-hidden border-[3px] border-edge shadow-[8px_8px_0_var(--edge)] md:h-[620px]">
          <PixelScene />
          <div className="relative z-10 p-6 md:p-12">
            <p className="label !text-ink">{c ? `Hi, ${c.name.split(' ')[0]}` : 'Welcome'}</p>
            <h1 className="press mt-4 text-[24px] md:text-[50px]" style={{ textShadow: '4px 4px 0 var(--toyota)' }}>ROUND UP.<br />PAY OFF<br />SOONER.</h1>
          </div>
          <div className="scene-road absolute inset-x-0 bottom-0 h-24" />
          <div className="scene-car absolute bottom-6 right-2 w-[78%] md:bottom-4 md:right-14 md:w-[46%]"><Car /></div>
        </div>
        <div className="absolute inset-x-4 bottom-0 border-[3px] border-edge bg-panel p-5 shadow-[6px_6px_0_var(--edge)] md:inset-x-12 md:p-6">
          {customer.error && !c ? <ErrorNote message={customer.error} retry={customer.reload} /> : (
            <div className="grid items-end gap-4 md:grid-cols-[repeat(4,1fr)_auto]">
              <HeroStat label="Vehicle" value={c?.vehicle.replace(/^2024 Toyota /, '2024 ')} />
              <HeroStat label="Loan balance" value={c ? usd(c.balance) : undefined} />
              <HeroStat label="APR · months left" value={c ? `${c.apr}% · ${c.monthsRemaining} mo` : undefined} />
              <HeroStat label="Monthly payment" value={c ? usd2(c.monthlyPayment) : undefined} />
              <Link href="/plans" className="skeu rounded-full px-7 py-3.5 text-center text-sm font-semibold">See my plan</Link>
            </div>
          )}
        </div>
      </section>

      {/* Editorial intro */}
      <section className="grid gap-8 md:grid-cols-2 md:items-start">
        <h2 className="pix-shadow text-5xl font-semibold leading-[1] md:text-7xl">Spare change,<br />real progress.</h2>
        <div>
          <p className="copy text-lg leading-relaxed text-grey">
            Every card purchase rounds up to the next dollar. That spare change goes straight to your loan principal, so you pay off sooner and owe less interest. It adds up quietly in the background.
          </p>
          <Link href="/plans" className="skeu mt-6 inline-block rounded-full px-7 py-3.5 text-sm font-semibold">Explore the plans</Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card id="your-loan">
          {customer.error && !c ? <ErrorNote message={customer.error} retry={customer.reload} /> : !c ? <Skeleton className="h-80" /> : (
            <>
              <p className="label">Your loan</p>
              <h2 className="mt-1 text-3xl tracking-tight">{c.vehicle}</h2>
              <p className="text-sm text-grey">{usd(c.balance)} · {c.apr}% APR · {c.monthsRemaining} months left</p>
              <div className="my-4 w-full"><Car /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-3xl bg-panel p-4"><p className="label">Monthly payment</p><p className="big mt-3 text-3xl">{usd2(c.monthlyPayment)}</p></div>
                <div className="rounded-3xl bg-panel p-4"><p className="label">Loan paid off</p><div className="mt-2">{c.percentPaid === null ? <p className="copy text-xs text-grey">Add the original amount to see this.</p> : <Gauge pct={c.percentPaid} />}</div></div>
              </div>
              <LoanForm customer={c} active={loan !== null} onApply={setLoan} onReset={() => setLoan(null)} />
            </>
          )}
        </Card>
        <RoundupsCard state={roundups} />
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {LINKS.map((l, i) => (
          <Link key={l.href} href={l.href} className="card group flex min-h-56 flex-col justify-between gap-6 p-6">
            <div>
              <p className="label">0{i + 1}</p>
              <h2 className="mt-3 text-2xl tracking-tight">{l.title}</h2>
              <p className="copy mt-2 text-[14px] text-grey">{l.text}</p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-full border border-line bg-panel transition-colors group-hover:bg-fill group-hover:text-onfill"><ArrowUpRight size={18} strokeWidth={1.5} /></span>
          </Link>
        ))}
      </section>

      {/* Closing band */}
      <section className="border-[3px] border-edge bg-[#0b0b0b] px-6 py-16 text-center text-white shadow-[8px_8px_0_var(--toyota)] md:py-24">
        <h2 className="press text-xl leading-[1.4] md:text-4xl">READY TO PAY OFF SOONER?</h2>
        <p className="copy mx-auto mt-4 max-w-xl text-white/60">Pick how much extra you put in each week and watch the months fall away.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/plans" className="border-[3px] border-white bg-white px-7 py-3.5 text-sm font-semibold text-black shadow-[4px_4px_0_var(--toyota)] transition-transform hover:-translate-y-0.5">Get started</Link>
          <Link href="/live" className="rounded-full border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10">Watch it live</Link>
        </div>
      </section>
    </div>
  );
}
