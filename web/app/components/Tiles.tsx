'use client';
import { CalendarClock, LineChart, MessageCircle, Pause, Play, Wrench, type LucideIcon } from 'lucide-react';
import type { HardshipKind } from '@/lib/api';

interface Tile { key: string; label: string; icon: LucideIcon; onClick: () => void }

export function Tiles({ running, busy, onToggleDemo, onRequest, onPlan, onAsk }: {
  running: boolean; busy: boolean; onToggleDemo: () => void; onRequest: (k: HardshipKind) => void; onPlan: () => void; onAsk: () => void;
}) {
  const tiles: Tile[] = [
    { key: 'demo', label: running ? 'Stop demo feed' : 'Start demo feed', icon: running ? Pause : Play, onClick: onToggleDemo },
    { key: 'bi', label: 'Bi-weekly', icon: CalendarClock, onClick: () => onRequest('biweekly') },
    { key: 'pause', label: 'Pause request', icon: Pause, onClick: () => onRequest('pause') },
    { key: 'credit', label: 'Maintenance credit', icon: Wrench, onClick: () => onRequest('credit') },
    { key: 'plan', label: 'Payoff plan', icon: LineChart, onClick: onPlan },
    { key: 'ask', label: 'Ask', icon: MessageCircle, onClick: onAsk },
  ];
  return (
    <div className="grid grid-cols-3 gap-4 md:gap-6">
      {tiles.map((t, i) => {
        const dark = (Math.floor(i / 3) + i) % 2 === 0; // checkerboard
        const Icon = t.icon;
        return (
          <button key={t.key} onClick={t.onClick} disabled={t.key === 'demo' && busy}
            className={`card flex aspect-square flex-col justify-between p-4 text-left md:p-5 ${dark ? '!bg-ink text-white' : 'text-ink'}`}>
            <Icon size={26} strokeWidth={1.5} />
            <span className="flex h-9 items-end text-[13px] font-medium leading-tight md:text-sm">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
