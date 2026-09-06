import { useEffect, useRef, useState } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";

interface Subject {
  _id: string;
  name: string;
  color?: string;
}

interface StudyTimerWidgetProps {
  subjects: Subject[];
}

const formatElapsed = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export default function StudyTimerWidget({ subjects }: StudyTimerWidgetProps) {
  const [subjectId, setSubjectId] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const startedAtRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);

  const handleStart = () => {
    startedAtRef.current = new Date();
    setElapsed(0);
    setRunning(true);
  };

  const handleStop = async () => {
    setRunning(false);
    const durationMinutes = Math.round(elapsed / 60);
    const startedAt = startedAtRef.current;
    setElapsed(0);
    startedAtRef.current = null;

    if (durationMinutes < 1) return;

    try {
      setSaving(true);
      await axios.post("/study-sessions", {
        subject: subjectId || null,
        durationMinutes,
        startedAt,
      });
      toast.success(`Logged ${durationMinutes} min of study time`);
    } catch {
      toast.error("Failed to log study session");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-zinc-100">Focus timer</h3>
        <span className="text-lg font-mono font-bold text-amber-400 tabular-nums">{formatElapsed(elapsed)}</span>
      </div>

      <select
        value={subjectId}
        onChange={(e) => setSubjectId(e.target.value)}
        disabled={running}
        className="w-full mb-3 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-amber-500 transition disabled:opacity-50"
      >
        <option value="">No subject</option>
        {subjects.map((s) => (
          <option key={s._id} value={s._id}>{s.name}</option>
        ))}
      </select>

      {running ? (
        <button
          onClick={handleStop}
          disabled={saving}
          className="w-full py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-bold transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Stop"}
        </button>
      ) : (
        <button
          onClick={handleStart}
          className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition"
        >
          Start studying
        </button>
      )}
    </div>
  );
}
