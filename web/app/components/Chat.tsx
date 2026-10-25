'use client';
import { Coins, HelpCircle, LifeBuoy, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, type Explanation, type Preset } from '@/lib/api';

const QUESTIONS: { id: Preset; text: string; icon: LucideIcon }[] = [
  { id: 'worth', text: 'Is this worth it?', icon: HelpCircle },
  { id: 'double', text: 'What if I double it?', icon: Coins },
  { id: 'tight', text: 'What if money is tight?', icon: LifeBuoy },
];

interface Msg { id: number; role: 'user' | 'assistant'; text: string; label?: string; why?: string; loading?: boolean }

// A chat-style page. The questions are fixed presets, so every answer comes from /api/explain,
// where the numbers are computed by the backend and checked before they are shown.
export function Chat({ extra, name }: { extra: number; name?: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, role: 'assistant', text: `Hi${name ? ` ${name.split(' ')[0]}` : ''}! I can explain how your round-ups help with your loan. Pick a question below.` }]);
  const [busy, setBusy] = useState(false);
  const next = useRef(1);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs]);

  async function ask(q: { id: Preset; text: string }) {
    if (busy) return;
    setBusy(true);
    const userId = next.current++, botId = next.current++;
    setMsgs((m) => [...m, { id: userId, role: 'user', text: q.text }, { id: botId, role: 'assistant', text: '', loading: true }]);
    try {
      const r = await api<Explanation>(`/api/explain?preset=${q.id}&extraPerWeek=${extra}`);
      setMsgs((m) => m.map((x) => (x.id === botId ? { id: botId, role: 'assistant', text: r.text, label: r.source === 'cortex' ? 'Snowflake Cortex' : 'Standard', why: r.rejected } : x)));
    } catch (e) {
      setMsgs((m) => m.map((x) => (x.id === botId ? { id: botId, role: 'assistant', text: `Sorry, I couldn’t get that answer. ${(e as Error).message}` } : x)));
    } finally { setBusy(false); }
  }

  return (
    <div className="card flex h-[min(70vh,640px)] flex-col overflow-hidden">
      <div className="flex-1 space-y-4 overflow-y-auto p-5 md:p-6" aria-live="polite">
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-3xl px-5 py-3 ${m.role === 'user' ? 'rounded-br-lg bg-ink text-white' : 'rounded-bl-lg bg-white'}`}>
              {m.loading ? (
                <span role="status" aria-label="Getting your answer" className="flex gap-1.5 py-2">
                  {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-grey" style={{ animationDelay: `${i * 120}ms` }} />)}
                </span>
              ) : (
                <>
                  <p className="copy text-[14px] leading-relaxed">{m.text}</p>
                  {m.label && <p className="mt-2 inline-block rounded-full bg-soft px-3 py-0.5 text-xs font-medium text-grey" title={m.why}>{m.label}</p>}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="border-t border-[#eaeaea] bg-white p-4">
        <p className="label mb-2">Ask about your loan</p>
        <div className="flex flex-wrap gap-2">
          {QUESTIONS.map((q) => {
            const Icon = q.icon;
            return (
              <button key={q.id} onClick={() => ask(q)} disabled={busy}
                className="flex items-center gap-2 rounded-full border border-[#e2e2e2] bg-white px-4 py-2.5 text-sm font-medium transition-colors hover:bg-ink hover:text-white">
                <Icon size={16} strokeWidth={1.5} />{q.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
