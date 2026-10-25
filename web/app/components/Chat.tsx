'use client';
import { Coins, HelpCircle, LifeBuoy, SendHorizontal, Sparkles, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, type Explanation, type Preset } from '@/lib/api';
import { withQs } from '@/lib/loanQuery';
import { DeleteButton } from './DeleteButton';

const QUESTIONS: { id: Preset; text: string; icon: LucideIcon }[] = [
  { id: 'worth', text: 'Is this worth it?', icon: HelpCircle },
  { id: 'double', text: 'What if I double it?', icon: Coins },
  { id: 'tight', text: 'What if money is tight?', icon: LifeBuoy },
];

interface Msg { id: number; role: 'user' | 'assistant'; text: string; label?: string; ai?: boolean; muted?: boolean; why?: string; loading?: boolean }
interface ChatResult { text: string; source: 'gemini' | 'standard' | 'refusal' | 'smalltalk'; label: string; rejected?: string }

// A chat-style page. The questions are fixed presets, so every answer comes from /api/explain,
// where the numbers are computed by the backend and checked before they are shown.
export function Chat({ extra, name, loanQuery }: { extra: number; name?: string; loanQuery: string }) {
  const greeting: Msg = { id: 0, role: 'assistant', text: `Hi${name ? ` ${name.split(' ')[0]}` : ''}! I’m Gear, your loan guide, powered by Google Gemini. I can explain how your round-ups help with your loan. Pick a question below.` };
  const [msgs, setMsgs] = useState<Msg[]>([greeting]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const next = useRef(1);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs]);

  async function ask(q: { id: Preset; text: string }) {
    if (busy) return;
    setBusy(true);
    const userId = next.current++, botId = next.current++;
    setMsgs((m) => [...m, { id: userId, role: 'user', text: q.text }, { id: botId, role: 'assistant', text: '', loading: true }]);
    try {
      const r = await api<Explanation>(withQs(`/api/explain?preset=${q.id}&extraPerWeek=${extra}`, loanQuery));
      setMsgs((m) => m.map((x) => (x.id === botId ? { id: botId, role: 'assistant', text: r.text, label: r.source === 'gemini' ? 'Powered by Google Gemini' : 'Standard answer', ai: r.source === 'gemini', why: r.rejected } : x)));
    } catch (e) {
      setMsgs((m) => m.map((x) => (x.id === botId ? { id: botId, role: 'assistant', text: `Sorry, I couldn’t get that answer. ${(e as Error).message}` } : x)));
    } finally { setBusy(false); }
  }

  // Free text: the backend decides whether it is about this app, and the numbers in any answer come from our loan engine.
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    setBusy(true);
    const userId = next.current++, botId = next.current++;
    setMsgs((m) => [...m, { id: userId, role: 'user', text }, { id: botId, role: 'assistant', text: '', loading: true }]);
    try {
      const r = await api<ChatResult>(withQs('/api/chat', loanQuery), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: text, extraPerWeek: extra }) });
      setMsgs((m) => m.map((x) => (x.id === botId ? { id: botId, role: 'assistant', text: r.text, label: r.label, ai: r.source === 'gemini', muted: r.source === 'refusal', why: r.rejected } : x)));
    } catch (err) {
      setMsgs((m) => m.map((x) => (x.id === botId ? { id: botId, role: 'assistant', text: `Sorry, I couldn’t get that answer. ${(err as Error).message}` } : x)));
    } finally { setBusy(false); }
  }

  return (
    <div className="card flex h-[min(70vh,640px)] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3 md:px-6">
        <p className="label">Conversation</p>
        <DeleteButton label="Clear chat" confirmLabel="Tap again to clear" disabled={busy || msgs.length <= 1} onConfirm={() => setMsgs([greeting])} />
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-5 md:p-6" aria-live="polite">
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-3xl px-5 py-3 ${m.role === 'user' ? 'rounded-br-lg bg-fill text-onfill' : 'rounded-bl-lg bg-panel'}`}>
              {m.loading ? (
                <span role="status" aria-label="Getting your answer" className="flex gap-1.5 py-2">
                  {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-grey" style={{ animationDelay: `${i * 120}ms` }} />)}
                </span>
              ) : (
                <>
                  {m.role === 'assistant' && <p className="label mb-1">Gear</p>}
                  <p className="copy text-[14px] leading-relaxed">{m.text}</p>
                  {m.label && (
                    <p className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-medium ${m.muted ? 'bg-toyota/15 text-toyota' : 'bg-soft text-grey'}`} title={m.why}>
                      {m.ai && <Sparkles size={12} strokeWidth={1.75} className="text-chart" />}{m.label}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="border-t border-line bg-panel p-4">
        <p className="label mb-2">Suggested questions</p>
        <div className="flex flex-wrap gap-2">
          {QUESTIONS.map((q) => {
            const Icon = q.icon;
            return (
              <button key={q.id} onClick={() => ask(q)} disabled={busy}
                className="pop flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2.5 text-sm font-medium transition-colors hover:bg-fill hover:text-onfill">
                <Icon size={16} strokeWidth={1.5} />{q.text}
              </button>
            );
          })}
        </div>
        <form onSubmit={send} className="mt-3 flex items-center gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={300} disabled={busy} aria-label="Ask Gear a question"
            placeholder="Ask about your loan, your car or your round-ups…"
            className="min-w-0 flex-1 rounded-full border border-line bg-soft px-5 py-3 text-[15px] text-ink outline-none placeholder:text-grey focus:border-edge" />
          <button type="submit" disabled={busy || draft.trim() === ''} aria-label="Send" className="skeu grid h-12 w-12 shrink-0 place-items-center">
            <SendHorizontal size={20} strokeWidth={1.75} />
          </button>
        </form>
        <p className="mt-2 text-[11px] text-grey">Gear only answers questions about your loan, car and data in RoundGear.</p>
      </div>
    </div>
  );
}
