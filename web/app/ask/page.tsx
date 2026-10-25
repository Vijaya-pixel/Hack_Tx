'use client';
import { Calculator, ShieldCheck, Sparkles, Type } from 'lucide-react';
import { Chat } from '../components/Chat';
import { useShared } from '../components/Shell';

const STEPS = [
  { icon: Calculator, title: 'Our loan engine does the math', text: 'Your payment, months saved, interest saved and payoff date are calculated by tested code, never by an AI.' },
  { icon: Sparkles, title: 'Gear (Gemini) explains it', text: 'Gear is an assistant powered by Google Gemini. It gets only those finished numbers and turns them into plain language.' },
  { icon: ShieldCheck, title: 'Every number is checked', text: 'If an answer contains any number our engine did not provide, it is thrown away and the standard text is shown instead.' },
  { icon: Type, title: 'Always a safe fallback', text: 'No key, no internet, or an error? You still get a correct standard answer, labeled as such.' },
];

export default function AskPage() {
  const { customer, extra, enabled, loanQuery, health } = useShared();
  const live = health.data?.ai.mode === 'gemini';
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl tracking-tight md:text-4xl">Ask Gear</h1>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${live ? 'border-chart text-chart' : 'border-line text-grey'}`}>
          <Sparkles size={14} strokeWidth={1.75} />
          {live ? 'Powered by Google Gemini' : 'Gemini not connected · standard answers'}
        </span>
      </div>
      <p className="copy text-sm text-grey">
        Gear is RoundGear’s loan guide, an AI assistant powered by Google Gemini. It explains your plan using {enabled ? 'your chosen extra per week' : '$0 extra (round-ups are off)'}.
      </p>
      <Chat extra={enabled ? extra : 0} name={customer.data?.name} loanQuery={loanQuery} />

      <section className="card p-6">
        <h2 className="text-xl tracking-tight">How Gear works</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.title} className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-soft text-ink"><Icon size={18} strokeWidth={1.75} /></span>
                <div>
                  <p className="text-[15px] font-medium"><span className="text-grey">{i + 1}. </span>{s.title}</p>
                  <p className="copy mt-0.5 text-[13px] leading-relaxed text-grey">{s.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
