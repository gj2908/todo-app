import { useState } from "react";

interface ReminderModalProps {
  isOpen: boolean;
  defaultMinutes: number;
  onSave: (minutesBefore: number) => void;
  onClose: () => void;
}

export default function ReminderModal({ isOpen, defaultMinutes, onSave, onClose }: ReminderModalProps) {
  const [minutes, setMinutes] = useState(defaultMinutes);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
        <h3 className="text-base font-bold text-zinc-100">Reminder Settings</h3>
        <p className="text-sm text-zinc-500 mt-1">Set how early you want due-date notifications.</p>

        <div className="mt-4 space-y-2">
          {[5, 10, 15, 30, 60].map((m) => (
            <button
              key={m}
              onClick={() => setMinutes(m)}
              className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition ${
                minutes === m
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                  : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              {m} minutes before
            </button>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(minutes);
              onClose();
            }}
            className="flex-1 rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-black hover:bg-amber-400"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
