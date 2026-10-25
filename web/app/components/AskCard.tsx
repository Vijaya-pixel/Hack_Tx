'use client';
import { Coins, HelpCircle, LifeBuoy, type LucideIcon } from 'lucide-react';
import type { Explanation, Preset } from '@/lib/api';
import type { Loaded } from '@/lib/useApi';
import { Card, ErrorNote, Skeleton } from './ui';

const ROWS: { id: Preset; title: string; sub: string; icon: LucideIcon }[] = [
  { id: 'worth', title: 'Is this worth it?', sub: 'What round-ups add up to', icon: HelpCircle },
  { id: 'double', title: 'What if I double it?', sub: 'Twice the spare change', icon: Coins },
  { id: 'tight', title: 'What if money is tight?', sub: 'Lighter options for you', icon: LifeBuoy },
];

export function AskCard({ id, state, preset, asked, onPick, onAsk }: {
  id: string; state: Loaded<Explanation>; preset: Preset; asked: boolean; onPick: (p: Preset) => void; onAsk: () => void;
}) {
  const { data, error, loading, reload } = state;
  return (
    <Card id={id}>
      <h2 className="text-xl font-semibold tracking-tight">Ask</h2>
      <p className="text-sm text-grey">How can I help?</p>
      <ul className="mt-4 space-y-2">
        {ROWS.map((r) => {
          const Icon = r.icon;
          const on = asked && preset === r.id;
          return (
            <li key={r.id}>
              <button onClick={() => onPick(r.id)} aria-pressed={on}
                className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${on ? 'bg-ink text-white' : 'bg-soft hover:bg-[#e9e9e9]'}`}>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${on ? 'bg-white/15' : 'bg-white'}`}><Icon size={20} strokeWidth={1.5} /></span>
                <span>
                  <span className="block text-[15px] font-medium leading-tight">{r.title}</span>
                  <span className={`block text-xs ${on ? 'text-white/60' : 'text-grey'}`}>{r.sub}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 min-h-24" aria-live="polite">
        {!asked ? <p className="text-sm text-grey">Pick a question to see a short, plain-language answer.</p>
          : error && !data ? <ErrorNote message={error} retry={reload} />
          : !data ? <Skeleton className="h-24" /> : (
            <>
              <p className={`text-[15px] leading-relaxed transition-opacity ${loading ? 'opacity-40' : ''}`}>{data.text}</p>
              <p className="mt-3 inline-block rounded-full bg-soft px-3 py-1 text-xs font-medium text-grey" title={data.rejected}>{data.label}</p>
            </>
          )}
      </div>
      <button onClick={onAsk} className="mt-4 rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-white">Ask</button>
    </Card>
  );
}
