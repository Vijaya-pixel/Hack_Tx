'use client';
import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

// Two-step delete: the first press arms it (red, "Tap again"), the second press does it. It disarms itself after 3 seconds.
export function DeleteButton({ label, confirmLabel = 'Tap again to confirm', onConfirm, disabled }: {
  label: string; confirmLabel?: string; onConfirm: () => void; disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  useEffect(() => { if (disabled) setArmed(false); }, [disabled]);

  return (
    <button onClick={() => { if (armed) { setArmed(false); onConfirm(); } else setArmed(true); }} disabled={disabled}
      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${armed ? 'border-toyota bg-toyota text-white' : 'border-line bg-panel text-grey hover:text-ink'}`}>
      <Trash2 size={16} strokeWidth={1.5} className={armed ? 'shake' : ''} />
      {armed ? confirmLabel : label}
    </button>
  );
}
