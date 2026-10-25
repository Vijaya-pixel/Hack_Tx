'use client';
import { useState } from 'react';
import { api, type HardshipKind, type HardshipResult, type Plan } from '@/lib/api';
import { monthYear, usd } from '@/lib/format';
import { Card } from './ui';

export function HelpPanel({ plan }: { plan: Plan | null }) {
  const [sent, setSent] = useState<Partial<Record<HardshipKind, string>>>({});
  const [busy, setBusy] = useState<HardshipKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(kind: HardshipKind) {
    setBusy(kind);
    setError(null);
    try {
      const r = await api<HardshipResult>('/api/hardship', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind }) });
      setSent((s) => ({ ...s, [kind]: r.message }));
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  }

  const bi = plan?.biweekly;
  const options: { kind: HardshipKind; title: string; text: string; effect?: string; button: string }[] = [
    { kind: 'pause', title: 'Payment pause', text: 'Need a breather? Ask for a short pause. Interest may still build while paused, and a specialist decides.', button: 'Request a payment pause' },
    { kind: 'biweekly', title: 'Bi-weekly payments', text: 'Half the payment every two weeks adds one extra payment a year.',
      effect: bi ? `You’d finish ${bi.monthsSaved} months sooner (${monthYear(bi.newPayoffDate)}) and pay ${usd(bi.interestSaved)} less interest.` : undefined, button: 'Request bi-weekly payments' },
    { kind: 'credit', title: 'Maintenance credit', text: 'Ask for a $50 credit toward routine maintenance. A specialist reviews every request.', button: 'Request a $50 maintenance credit' },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {options.map((o) => (
        <Card key={o.kind} id={o.kind} className="flex flex-col scroll-mt-6">
          <h2 className="text-xl tracking-tight">{o.title}</h2>
          <p className="copy mt-2 text-[14px] leading-relaxed text-ink/80">{o.text}</p>
          {o.effect && <p className="copy mt-3 rounded-2xl bg-white p-3 text-[13px] font-medium">{o.effect}</p>}
          <div className="mt-auto pt-5">
            {sent[o.kind] ? (
              <p role="status" className="rounded-2xl bg-ink/5 p-4 text-sm font-medium">{sent[o.kind]}</p>
            ) : (
              <button onClick={() => send(o.kind)} disabled={busy !== null} className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">
                {busy === o.kind ? 'Sending…' : o.button}
              </button>
            )}
          </div>
        </Card>
      ))}
      {error && <p role="alert" className="text-sm text-toyota md:col-span-3">{error}</p>}
    </div>
  );
}
