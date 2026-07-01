import type { ReactNode } from 'react';

export function MetricCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5 shadow-glow">
      <p className="text-sm text-muted">{label}</p>
      <div className={`mt-2 text-2xl font-semibold ${accent ? 'text-accent' : 'text-foreground'}`}>
        {value}
      </div>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
