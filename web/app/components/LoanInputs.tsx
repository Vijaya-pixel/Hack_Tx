'use client';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { api, type Customer } from '@/lib/api';
import { LOAN_HINTS, type LoanInput } from '@/lib/loanQuery';
import { usd, usd2 } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { Skeleton } from './ui';

const DEFAULT_VEHICLE = '2024 Toyota GR86';

const lbl = 'block text-[11px] font-medium uppercase leading-none tracking-wider text-grey'; // normal font, not the pixel one

// A nav-style item: a small label over the current value with a chevron. Pressed, it turns blue with an up chevron and
// opens a dark list of rows below it.
function Menu({ id, open, setOpen, label, value, children, wide = false }: {
  id: string; open: string | null; setOpen: (id: string | null) => void; label: string; value: string; children: React.ReactNode; wide?: boolean;
}) {
  const isOpen = open === id;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [isOpen, setOpen]);
  const Chevron = isOpen ? ChevronUp : ChevronDown;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(isOpen ? null : id)} aria-expanded={isOpen} aria-haspopup="true"
        className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-left transition-colors ${isOpen ? 'bg-soft' : 'hover:bg-soft'}`}>
        <span>
          <span className={lbl}>{label}</span>
          <span className={`mt-1.5 block text-[16px] font-medium leading-none ${isOpen ? 'text-chart' : 'text-ink'}`}>{value}</span>
        </span>
        <Chevron size={17} strokeWidth={1.75} className={isOpen ? 'text-chart' : 'text-grey'} />
      </button>
      {isOpen && (
        <div className={`absolute bottom-full left-0 z-50 mb-3 rounded-xl border-2 border-line bg-page py-2 shadow-2xl ${wide ? 'w-72' : 'w-64'}`}>{children}</div>
      )}
    </div>
  );
}

const row = 'flex w-full items-center justify-between gap-3 px-6 py-3 text-left text-[17px] text-ink transition-colors hover:bg-soft';

// Preset rows to pick from, plus a field for any other number.
function NumberMenu({ value, onChange, onDone, error, presets, unit, step = 'any', min, max }: {
  value: string; onChange: (v: string) => void; onDone: () => void; error: string; presets: { value: string; label: string }[]; unit: string; step?: string; min: number; max: number;
}) {
  return (
    <div>
      <ul>
        {presets.map((p) => (
          <li key={p.value}>
            <button onClick={() => { onChange(p.value); onDone(); }} className={`${row} ${p.value === value ? 'text-chart' : ''}`}>
              {p.label}{p.value === value && <Check size={16} strokeWidth={2} />}
            </button>
          </li>
        ))}
      </ul>
      <div className="mx-4 mt-1 border-t border-line pt-3">
        <label className="block text-[12px] text-grey">Other amount
          <input autoFocus type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onDone(); }}
            min={min} max={max} step={step} aria-label={unit}
            className="mt-1 h-10 w-full rounded-lg border border-line bg-soft px-3 text-[16px] text-ink outline-none focus:border-chart" />
        </label>
        {error && <p className="mt-1.5 text-[12px] text-toyota">{error}</p>}
      </div>
    </div>
  );
}

// The loan the page works with. Changing anything recalculates everything: the monthly payment comes from the backend,
// and the plan, chart and answers use these numbers. Each applied change is also saved (encrypted) by the backend.
export function LoanInputs({ customer, loan, onChange }: { customer: Customer | null; loan: LoanInput | null; onChange: (l: LoanInput | null) => void }) {
  const vehicles = useApi<{ vehicles: string[] }>('/api/vehicles');
  const [open, setOpen] = useState<string | null>(null);
  const [balance, setBalance] = useState('');
  const [apr, setApr] = useState('');
  const [months, setMonths] = useState('');
  const [vehicle, setVehicle] = useState(DEFAULT_VEHICLE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (customer && !ready) {
      setBalance(String(customer.balance)); setApr(String(customer.apr)); setMonths(String(customer.monthsRemaining)); setVehicle(customer.vehicle); setReady(true);
    }
  }, [customer, ready]);

  const b = Number(balance), a = Number(apr), m = Number(months);
  const errors = {
    balance: balance === '' || !(b >= LOAN_HINTS.balance[0] && b <= LOAN_HINTS.balance[1]) ? `Use $${LOAN_HINTS.balance[0].toLocaleString()} to $${LOAN_HINTS.balance[1].toLocaleString()}` : '',
    apr: apr === '' || !(a >= LOAN_HINTS.apr[0] && a <= LOAN_HINTS.apr[1]) ? `Use ${LOAN_HINTS.apr[0]}% to ${LOAN_HINTS.apr[1]}%` : '',
    months: months === '' || !Number.isInteger(m) || !(m >= LOAN_HINTS.months[0] && m <= LOAN_HINTS.months[1]) ? `Use ${LOAN_HINTS.months[0]} to ${LOAN_HINTS.months[1]} whole months` : '',
  };
  const valid = !errors.balance && !errors.apr && !errors.months;

  useEffect(() => {
    if (!ready || !valid) return;
    const same = loan === null && b === customer?.balance && a === customer?.apr && m === customer?.monthsRemaining && vehicle === customer?.vehicle;
    if (same) return;
    const t = setTimeout(() => {
      onChange({ balance: b, apr: a, months: m, vehicle });
      api('/api/inputs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ balance: b, apr: a, months: m, vehicle }) }).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, valid, b, a, m, vehicle]);

  function reset() {
    setBalance('28000'); setApr('5.9'); setMonths('48'); setVehicle(DEFAULT_VEHICLE);
    onChange(null);
    setOpen(null);
  }

  const options = [...new Set([vehicle, ...(vehicles.data?.vehicles ?? [])])];
  return (
    <section aria-label="Your loan" className="card px-3 py-2">
      {!ready ? <Skeleton className="h-11" /> : (
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
          <Menu id="car" open={open} setOpen={setOpen} label="Car" value={vehicle.replace(/^2024 Toyota /, '2024 ')} wide>
            <ul role="listbox" aria-label="Car model">
              {options.map((v) => (
                <li key={v}>
                  <button role="option" aria-selected={v === vehicle} onClick={() => { setVehicle(v); setOpen(null); }} className={`${row} ${v === vehicle ? 'text-chart' : ''}`}>
                    {v}{v === vehicle && <Check size={16} strokeWidth={2} />}
                  </button>
                </li>
              ))}
            </ul>
          </Menu>
          <Menu id="balance" open={open} setOpen={setOpen} label="Loan amount" value={errors.balance ? '—' : usd(b)}>
            <NumberMenu value={balance} onChange={setBalance} onDone={() => setOpen(null)} error={errors.balance} unit="Loan amount in dollars" min={LOAN_HINTS.balance[0]} max={LOAN_HINTS.balance[1]} presets={[15000, 20000, 28000, 35000].map((n) => ({ value: String(n), label: usd(n) }))} />
          </Menu>
          <Menu id="apr" open={open} setOpen={setOpen} label="APR" value={errors.apr ? '—' : `${a}%`}>
            <NumberMenu value={apr} onChange={setApr} onDone={() => setOpen(null)} error={errors.apr} unit="APR in percent" min={LOAN_HINTS.apr[0]} max={LOAN_HINTS.apr[1]} presets={['3.9', '4.9', '5.9', '7.9'].map((n) => ({ value: n, label: `${n}%` }))} />
          </Menu>
          <Menu id="months" open={open} setOpen={setOpen} label="Months left" value={errors.months ? '—' : `${m} mo`}>
            <NumberMenu value={months} onChange={setMonths} onDone={() => setOpen(null)} error={errors.months} unit="Months left" step="1" min={LOAN_HINTS.months[0]} max={LOAN_HINTS.months[1]} presets={['24', '36', '48', '60'].map((n) => ({ value: n, label: `${n} months` }))} />
          </Menu>
          <div className="px-3.5 py-2" aria-live="polite" title="Calculated from the loan amount, APR and months">
            <span className={lbl}>Monthly payment</span>
            <span className="mt-1.5 block text-[16px] font-medium leading-none text-ink">{valid && customer ? usd2(customer.monthlyPayment) : '—'}</span>
          </div>
          {loan && <button onClick={reset} className="rounded-full px-3 py-1.5 text-xs font-medium text-grey underline underline-offset-2 hover:text-ink">Reset</button>}
          <Link href="/plans" className="skeu ml-auto flex h-10 items-center justify-center whitespace-nowrap px-6 text-sm font-semibold">See my plan</Link>
        </div>
      )}
    </section>
  );
}
