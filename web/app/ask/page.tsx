'use client';
import { Chat } from '../components/Chat';
import { useShared } from '../components/Shell';

export default function AskPage() {
  const { customer, extra, enabled, loanQuery } = useShared();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl tracking-tight md:text-4xl">Ask</h1>
      <p className="copy text-sm text-grey">Answers use your plan of {enabled ? 'your chosen extra per week' : '$0 extra (round-ups are off)'}. Every number comes from our loan calculator.</p>
      <Chat extra={enabled ? extra : 0} name={customer.data?.name} loanQuery={loanQuery} />
    </div>
  );
}
