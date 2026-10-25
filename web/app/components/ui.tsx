import type { ReactNode } from 'react';

export function Card({ title, pillar, children, className = '' }: { title: string; pillar?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-white p-5 shadow-sm md:p-6 ${className}`}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {pillar && <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">{pillar}</span>}
      </div>
      {children}
    </section>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div role="status" className="animate-pulse rounded-lg bg-canvas p-6 text-sm text-muted">{label}</div>;
}

export function ErrorNote({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-toyota/30 bg-toyota/5 p-4 text-sm">
      <p className="font-medium text-toyota-dark">We couldn’t load this.</p>
      <p className="mt-1 text-muted">{message}</p>
      {retry && <button onClick={retry} className="mt-3 rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium hover:bg-canvas">Try again</button>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg bg-canvas p-6 text-center text-sm text-muted">{children}</div>;
}
