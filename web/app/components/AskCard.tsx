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

export function AskCard({ id, state, preset, onPick }: { id: string; state: Loaded<Explanation>; preset: Preset; onPick: (p: Preset) => void }) {
  const { data, error, loading, reload } = state;
  return (
    <Card id={id}>
      <h2 className="text-xl tracking-tight">Ask</h2>
      <p className="text-sm text-grey">How can I help?</p>
      <ul className="mt-4 space-y-2">
        {ROWS.map((r) => {
          const Icon = r.icon;
          const on = preset === r.id;
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
      <div className="mt-4" aria-live="polite">
        {error && !data ? <ErrorNote message={error} retry={reload} />
          : loading || !data ? (
            <div role="status" aria-label="Getting your answer" className="space-y-2">
              <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-11/12" /><Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <>
              <p className="copy text-[14px] leading-relaxed">{data.text}</p>
              <p className="mt-3 inline-block rounded-full bg-soft px-3 py-1 text-xs font-medium text-grey" title={data.rejected}>
                {data.source === 'cortex' ? 'Snowflake Cortex' : 'Standard'}
              </p>
            </>
          )}
      </div>
    </Card>
  );
}
