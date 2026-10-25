'use client';
import { useState } from 'react';
import type { Customer } from '@/lib/api';
import { LOAN_HINTS, type LoanInput } from '@/lib/loanQuery';

function Field({ label, suffix, value, onChange, min, max, step, required = true }: {
  label: string; suffix: string; value: string; onChange: (v: string) => void; min?: number; max?: number; step?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="mt-1 flex items-center rounded-2xl border border-[#e2e2e2] bg-white px-3 focus-within:border-ink">
        <input type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} min={min} max={max} step={step ?? 'any'} required={required}
          className="w-full bg-transparent py-2.5 text-[15px] outline-none" />
        <span className="text-sm text-grey">{suffix}</span>
      </span>
    </label>
  );
}

// Lets a judge type their own loan. We only send the numbers; the backend validates them and does all the math.
export function LoanForm({ customer, active, onApply, onReset }: {
  customer: Customer; active: boolean; onApply: (l: LoanInput) => void; onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState(String(customer.balance));
  const [apr, setApr] = useState(String(customer.apr));
  const [months, setMonths] = useState(String(customer.monthsRemaining));
  const [original, setOriginal] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onApply({ balance: Number(balance), apr: Number(apr), months: Number(months), ...(original !== '' ? { original: Number(original) } : {}) });
  }
  function reset() {
    setBalance('28000'); setApr('5.9'); setMonths('48'); setOriginal('');
    onReset();
  }

  return (
    <div className="mt-5 border-t border-[#e6e6e6] pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="rounded-full border border-[#e2e2e2] bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-ink hover:text-white">
          {open ? 'Hide the form' : 'Try your own loan'}
        </button>
        {active && <span className="rounded-full bg-toyota px-3 py-1 text-xs font-medium text-white">Showing your numbers</span>}
      </div>
      {open && (
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Loan balance" suffix="$" value={balance} onChange={setBalance} min={LOAN_HINTS.balance[0]} max={LOAN_HINTS.balance[1]} />
          <Field label="APR" suffix="%" value={apr} onChange={setApr} min={LOAN_HINTS.apr[0]} max={LOAN_HINTS.apr[1]} />
          <Field label="Months left" suffix="mo" value={months} onChange={setMonths} min={LOAN_HINTS.months[0]} max={LOAN_HINTS.months[1]} step="1" />
          <Field label="Original amount (optional)" suffix="$" value={original} onChange={setOriginal} min={LOAN_HINTS.balance[0]} max={LOAN_HINTS.balance[1]} required={false} />
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">Recalculate</button>
            <button type="button" onClick={reset} className="rounded-full border border-[#e2e2e2] bg-white px-5 py-2.5 text-sm font-medium">Back to Alex’s loan</button>
          </div>
          <p className="copy text-xs text-grey sm:col-span-2">Your numbers stay in this browser tab. The plan, chart, payoff dates and answers all recompute from them.</p>
        </form>
      )}
    </div>
  );
}
