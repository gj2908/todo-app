interface Subject {
  _id: string;
  name: string;
}

interface BulkActionToolbarProps {
  count: number;
  subjects: Subject[];
  onComplete: () => void;
  onMove: (subjectId: string) => void;
  onDelete: () => void;
  onExport: () => void;
  onClear: () => void;
}

export default function BulkActionToolbar({ count, subjects, onComplete, onMove, onDelete, onExport, onClear }: BulkActionToolbarProps) {
  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-zinc-900 px-3 py-2.5 mb-3 shadow-lg">
      <span className="text-sm font-bold text-amber-400 whitespace-nowrap">{count} selected</span>

      <button
        onClick={onComplete}
        className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
      >
        Mark complete
      </button>

      {subjects.length > 0 && (
        <select
          onChange={(e) => { if (e.target.value) { onMove(e.target.value); e.target.value = ""; } }}
          defaultValue=""
          className="rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-amber-500"
        >
          <option value="" disabled>Move to...</option>
          {subjects.map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </select>
      )}

      <button
        onClick={onExport}
        className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
      >
        Export (.ics)
      </button>

      <button
        onClick={onDelete}
        className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition"
      >
        Delete
      </button>

      <button
        onClick={onClear}
        className="ml-auto rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition"
      >
        Clear
      </button>
    </div>
  );
}
