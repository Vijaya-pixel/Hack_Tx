'use client';
import { ShieldCheck } from 'lucide-react';
import { HelpPanel } from '../components/HelpPanel';
import { useShared } from '../components/Shell';

export default function HelpPage() {
  const { base } = useShared();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-3xl bg-toyota p-6 text-white">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-toyota"><ShieldCheck size={28} strokeWidth={1.5} /></span>
        <div>
          <h1 className="text-2xl tracking-tight md:text-3xl">Money is tight?</h1>
          <p className="copy text-sm text-white/85">These are requests, not instant changes. A Toyota Financial Services specialist reviews each one.</p>
        </div>
      </div>
      <HelpPanel plan={base.data} />
    </div>
  );
}
