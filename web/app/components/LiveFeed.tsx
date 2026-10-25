'use client';
import { useState } from 'react';
import { api, type Feed } from '@/lib/api';
import { usd } from '@/lib/format';
import type { Loaded } from '@/lib/useApi';
import { Card, Empty, ErrorNote, Loading } from './ui';

export function LiveFeedCard({ state }: { state: Loaded<Feed> }) {
  const { data, error, loading, reload } = state;
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggle() {
    if (!data) return;
    setBusy(true);
    setActionError(null);
    try {
      await api(`/api/simulator/${data.running ? 'stop' : 'start'}`, { method: 'POST' });
      reload();
    } catch (e) { setActionError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <Card title="Live feed">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-muted">
          <span className={`h-2 w-2 rounded-full ${data?.running ? 'animate-pulse bg-green-600' : 'bg-line'}`} />
          {data?.running ? 'Demo running: a new purchase every 3 seconds' : 'Demo stopped'}
        </p>
        <button onClick={toggle} disabled={busy || !data}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${data?.running ? 'border border-line bg-white hover:bg-canvas' : 'bg-toyota text-white hover:bg-toyota-dark'} disabled:opacity-50`}>
          {data?.running ? 'Stop demo' : 'Start demo'}
        </button>
      </div>
      {actionError && <p role="alert" className="mb-2 text-sm text-toyota-dark">{actionError}</p>}
      {error && !data ? <ErrorNote message={error} retry={reload} /> : loading && !data ? <Loading /> : !data || data.items.length === 0 ? (
        <Empty>No purchases yet. Press “Start demo” to see round-ups arrive.</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {data.items.map((t) => (
            <li key={t.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
              <span><span className="font-medium">{t.category}</span> <span className="text-muted">· {t.merchant} · {usd(t.amount)}</span></span>
              <span className="whitespace-nowrap font-semibold text-toyota">→ {usd(t.roundup)} to your loan</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
