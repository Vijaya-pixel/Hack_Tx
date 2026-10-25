'use client';
import { ShieldCheck } from 'lucide-react';
import { Card, Switch } from './ui';

export function TightCard({ open, onToggle }: { open: boolean; onToggle: (v: boolean) => void }) {
  return (
    <Card className="flex items-center gap-4">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-toyota text-white"><ShieldCheck size={26} strokeWidth={1.5} /></span>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold tracking-tight">Money is tight?</h2>
        <p className="text-sm text-grey">Ask for a pause, bi-weekly payments or a maintenance credit.</p>
      </div>
      <Switch on={open} onChange={onToggle} label="Open the request panel" />
    </Card>
  );
}
