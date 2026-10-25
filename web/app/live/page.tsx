'use client';
import { LiveCard } from '../components/LiveCard';
import { useShared } from '../components/Shell';

export default function LivePage() {
  const { feed, demoBusy, toggleDemo } = useShared();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl tracking-tight md:text-4xl">Live feed</h1>
      <p className="copy text-sm text-grey">Press play and a new purchase arrives every few seconds. Each one rounds up to the next dollar and goes toward your loan principal.</p>
      <LiveCard state={feed} busy={demoBusy} onToggle={toggleDemo} />
    </div>
  );
}
