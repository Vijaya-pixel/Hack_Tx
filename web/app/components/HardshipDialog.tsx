'use client';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, type HardshipKind, type HardshipResult, type Plan } from '@/lib/api';
import { monthYear, usd } from '@/lib/format';
import { Segmented } from './ui';

const KINDS: { value: HardshipKind; label: string }[] = [
  { value: 'pause', label: 'Pause' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'credit', label: 'Credit' },
];

export function HardshipDialog({ kind, plan, onKind, onClose }: { kind: HardshipKind | null; plan: Plan | null; onKind: (k: HardshipKind) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [sent, setSent] = useState<Partial<Record<HardshipKind, string>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (kind && !d.open) d.showModal();
    if (!kind && d.open) d.close();
  }, [kind]);

  async function send() {
    if (!kind) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<HardshipResult>('/api/hardship', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind }) });
      setSent((s) => ({ ...s, [kind]: r.message }));
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  const bi = plan?.biweekly;
  const copy: Record<HardshipKind, { title: string; text: string; button: string }> = {
    pause: { title: 'Request a payment pause', text: 'Need a breather? Ask Toyota Financial Services for a short pause. Interest may still build while paused, and a specialist decides.', button: 'Request a payment pause' },
    biweekly: {
      title: 'Switch to bi-weekly payments',
      text: bi ? `Half the payment every two weeks adds one extra payment a year. You’d finish ${bi.monthsSaved} months sooner (${monthYear(bi.newPayoffDate)}) and pay ${usd(bi.interestSaved)} less interest.` : 'Half the payment every two weeks adds one extra payment a year.',
      button: 'Request bi-weekly payments',
    },
    credit: { title: 'Apply a $50 maintenance credit', text: 'Ask for a $50 credit toward routine maintenance. A specialist reviews every request.', button: 'Request a $50 maintenance credit' },
  };

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="hd-title"
      className="m-auto w-[min(92vw,30rem)] rounded-[28px] bg-white p-0 text-ink shadow-2xl">
      {kind && (
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id="hd-title" className="text-xl font-semibold tracking-tight">{copy[kind].title}</h2>
            <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-soft"><X size={18} strokeWidth={1.5} /></button>
          </div>
          <div className="mt-4"><Segmented label="Request type" options={KINDS} value={kind} onChange={onKind} /></div>
          <p className="copy mt-5 text-[14px] leading-relaxed text-ink/80">{copy[kind].text}</p>
          {sent[kind] ? (
            <p role="status" className="mt-5 rounded-2xl bg-ink/5 p-4 text-sm font-medium">{sent[kind]}</p>
          ) : (
            <button onClick={send} disabled={busy} className="mt-5 w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">
              {busy ? 'Sending…' : copy[kind].button}
            </button>
          )}
          {error && <p role="alert" className="mt-3 text-sm text-toyota">{error}</p>}
          <p className="copy mt-4 text-xs text-grey">This is a request, not an instant change.</p>
        </div>
      )}
    </dialog>
  );
}
