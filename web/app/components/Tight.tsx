'use client';
import { useState } from 'react';
import { api, type HardshipKind, type HardshipResult, type Plan } from '@/lib/api';
import { monthYear, usd } from '@/lib/format';
import { Card } from './ui';

export function TightCard({ plan }: { plan: Plan | null }) {
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
  const options: { kind: HardshipKind; title: string; text: string; button: string }[] = [
    { kind: 'pause', title: 'Pause a payment', text: 'Need a breather? Ask for a short pause. Interest may still build while paused.', button: 'Request a payment pause' },
    { kind: 'biweekly', title: 'Pay every two weeks', text: bi
        ? `Half the payment every two weeks adds one extra payment a year: ${bi.monthsSaved} months sooner (${monthYear(bi.newPayoffDate)}) and ${usd(bi.interestSaved)} less interest.`
        : 'Half the payment every two weeks adds one extra payment a year.', button: 'Request bi-weekly payments' },
    { kind: 'credit', title: 'Maintenance credit', text: 'Ask to apply a $50 credit toward routine maintenance.', button: 'Request a $50 maintenance credit' },
  ];

  return (
    <Card title="Money is tight?" pillar="Self-service">
      <div className="grid gap-3 md:grid-cols-3">
        {options.map((o) => (
          <div key={o.kind} className="flex flex-col rounded-xl border border-line p-4">
            <h3 className="font-semibold">{o.title}</h3>
            <p className="mt-1 flex-1 text-sm text-muted">{o.text}</p>
            {sent[o.kind] ? (
              <p role="status" className="mt-3 rounded-lg bg-green-50 p-2 text-sm font-medium text-green-800">{sent[o.kind]}</p>
            ) : (
              <button onClick={() => send(o.kind)} disabled={busy !== null}
                className="mt-3 rounded-lg border border-toyota px-3 py-2 text-sm font-semibold text-toyota-dark hover:bg-toyota/5 disabled:opacity-50">
                {busy === o.kind ? 'Sending…' : o.button}
              </button>
            )}
          </div>
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-toyota-dark">{error}</p>}
    </Card>
  );
}
