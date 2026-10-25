'use client';
import Link from 'next/link';
import type { Feed, Roundups } from '@/lib/api';
import { monthYear, usd } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { useShared } from './components/Shell';

function Tile({ href, title, pillar, big, small }: { href: string; title: string; pillar?: string; big: string; small: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:border-toyota">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">{title}</h2>
        {pillar && <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">{pillar}</span>}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{big}</p>
      <p className="mt-1 text-sm text-muted">{small}</p>
      <p className="mt-3 text-sm font-medium text-toyota-dark group-hover:underline">Open →</p>
    </Link>
  );
}

export default function Overview() {
  const { plan } = useShared();
  const roundups = useApi<Roundups>('/api/roundups?range=12w');
  const feed = useApi<Feed>('/api/feed?limit=1');
  const r = roundups.data, p = plan.data, latest = feed.data?.items[0];
  const dash = '…';
  return (
    <>
      <p className="max-w-2xl text-lg">Round up everyday purchases to the next dollar and put the spare change toward your loan principal.</p>
      <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <Tile href="/roundups" title="Your round-ups" pillar="Personalize" big={r ? usd(r.total) : dash} small={r ? `rounded up in ${r.weeks} weeks` : 'Loading…'} />
        <Tile href="/live" title="Live feed" big={latest ? `${usd(latest.roundup)} to your loan` : dash} small={latest ? `${latest.category} · ${latest.merchant}` : 'Loading…'} />
        <Tile href="/what-if" title="What if" pillar="Simplify · Value" big={p ? `${p.kpis.monthsSaved} months sooner` : dash} small={p ? `${usd(p.kpis.interestSaved)} less interest, paid off ${monthYear(p.kpis.newPayoffDate)}` : 'Loading…'} />
        <Tile href="/ask" title="Ask" pillar="Guide" big="Is this worth it?" small="Plain-language answers to three common questions" />
        <Tile href="/help" title="Money is tight?" pillar="Self-service" big="Requests, not changes" small="Pause, bi-weekly or a maintenance credit" />
      </div>
    </>
  );
}
