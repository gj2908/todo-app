import { useEffect, useState } from "react";

interface PersonalReminderModalProps {
  isOpen: boolean;
  onSave: (reminder: { title: string; dateTime: string; notes: string }) => void;
  onClose: () => void;
}

const pad = (value: number) => String(value).padStart(2, "0");

const toLocalDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const toLocalTime = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export default function PersonalReminderModal({ isOpen, onSave, onClose }: PersonalReminderModalProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const defaultDate = new Date();
    defaultDate.setHours(defaultDate.getHours() + 1);
    setTitle("");
    setDate(toLocalDate(defaultDate));
    setTime(toLocalTime(defaultDate));
    setNotes("");
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim() || !date || !time) return;
    onSave({
      title: title.trim(),
      dateTime: `${date}T${time}`,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
        <h3 className="text-base font-bold text-zinc-100">Add reminder</h3>
        <p className="text-sm text-zinc-500 mt-1">Choose the exact date and time you want to be notified.</p>

        <div className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Reminder title"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional note"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || !date || !time}
            className="flex-1 rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}