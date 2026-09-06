interface StatsStripProps {
  today: number;
  overdue: number;
  next24h: number;
}

export default function StatsStrip({ today, overdue, next24h }: StatsStripProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-xl border border-border bg-surface p-3">
        <p className="text-xs font-medium text-muted">Today</p>
        <p className="text-xl font-bold text-amber-400 mt-1">{today}</p>
      </div>
      <div className="rounded-xl border border-border bg-surface p-3">
        <p className="text-xs font-medium text-muted">Overdue</p>
        <p className="text-xl font-bold text-red-400 mt-1">{overdue}</p>
      </div>
      <div className="rounded-xl border border-border bg-surface p-3">
        <p className="text-xs font-medium text-muted">Next 24h</p>
        <p className="text-xl font-bold text-green-400 mt-1">{next24h}</p>
      </div>
    </div>
  );
}
