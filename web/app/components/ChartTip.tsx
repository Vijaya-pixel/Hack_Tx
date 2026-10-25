'use client';

// A small rounded tooltip card shared by both charts. `rows` are label/value pairs already formatted for display.
export function ChartTip({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="min-w-40 rounded-2xl pix px-4 py-3 text-ink">
      <p className="label mb-2">{title}</p>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-6 text-sm">
            <span className="flex items-center gap-2 text-grey">{r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}{r.label}</span>
            <span className="font-medium">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
