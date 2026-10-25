'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export function Card({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`card p-6 ${className}`}>{children}</section>;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-2xl bg-soft ${className}`} />;
}

export function ErrorNote({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl bg-soft p-4 text-sm">
      <p className="font-medium">We couldn’t load this.</p>
      <p className="mt-1 text-grey">{message}</p>
      {retry && <button onClick={retry} className="mt-3 rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-white">Try again</button>}
    </div>
  );
}

// Black pill = selected.
export function Segmented<T extends string | number>({ options, value, onChange, label }: {
  options: { value: T; label: string }[]; value: T | null; onChange: (v: T) => void; label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-full bg-soft p-1">
      {options.map((o) => (
        <button key={String(o.value)} onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          className={`flex-1 rounded-full px-2 py-2 text-sm font-medium transition-colors ${value === o.value ? 'bg-ink text-white' : 'text-ink hover:bg-white'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${on ? 'bg-ink' : 'bg-[#d4d4d4]'}`}>
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-7' : 'left-1'}`} />
    </button>
  );
}

// Eases from the previous value to the new one. The numbers still come from the API; this only animates them.
export function AnimatedNumber({ value, format, ms = 450 }: { value: number; format: (n: number) => string; ms?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { from.current = value; setShown(value); return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const v = start + (value - start) * (1 - Math.pow(1 - p, 3));
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return <>{format(shown)}</>;
}
