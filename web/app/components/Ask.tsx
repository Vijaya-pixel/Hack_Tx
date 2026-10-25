'use client';
import type { Explanation, Preset } from '@/lib/api';
import type { Loaded } from '@/lib/useApi';
import { Card, ErrorNote, Loading } from './ui';

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'worth', label: 'Is this worth it?' },
  { id: 'double', label: 'What if I double it?' },
  { id: 'tight', label: 'What if money is tight?' },
];

interface Props { state: Loaded<Explanation>; preset: Preset; onPreset: (p: Preset) => void }

export function AskCard({ state, preset, onPreset }: Props) {
  const { data, error, loading, reload } = state;
  return (
    <Card title="Ask" pillar="Guide">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Questions">
        {PRESETS.map((p) => (
          <button key={p.id} onClick={() => onPreset(p.id)} aria-pressed={preset === p.id}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${preset === p.id ? 'border-toyota bg-toyota text-white' : 'border-line bg-white hover:bg-canvas'}`}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-4 min-h-24" aria-live="polite">
        {error && !data ? <ErrorNote message={error} retry={reload} /> : loading && !data ? <Loading label="Thinking…" /> : data && (
          <>
            <p className={`text-base leading-relaxed ${loading ? 'opacity-50' : ''}`}>{data.text}</p>
            <p className="mt-3 inline-block rounded-full bg-canvas px-3 py-1 text-xs font-medium text-muted" title={data.rejected}>{data.label}</p>
          </>
        )}
      </div>
    </Card>
  );
}
