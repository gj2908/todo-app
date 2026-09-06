import { useEffect, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import axios from "../axiosConfig";

interface SyllabusEntry {
  _id: string;
  title: string;
  subject: string | null;
  date: string | null;
}

interface Subject {
  _id: string;
  name: string;
}

interface UpcomingExamsWidgetProps {
  subjects: Subject[];
  onNavigate: (view: string) => void;
}

const countdownText = (dateStr: string) => {
  const days = differenceInCalendarDays(new Date(dateStr), new Date());
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
};

export default function UpcomingExamsWidget({ subjects, onNavigate }: UpcomingExamsWidgetProps) {
  const [entries, setEntries] = useState<SyllabusEntry[]>([]);

  useEffect(() => {
    axios.get("/documents", { params: { kind: "syllabus" } })
      .then((res) => {
        const now = new Date();
        const upcoming = res.data
          .filter((e: SyllabusEntry) => e.date && new Date(e.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
          .sort((a: SyllabusEntry, b: SyllabusEntry) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
          .slice(0, 3);
        setEntries(upcoming);
      })
      .catch(() => setEntries([]));
  }, []);

  if (entries.length === 0) return null;

  const subjectName = (id: string | null) => (id ? subjects.find((s) => s._id === id)?.name : null);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-text">Upcoming exams</h3>
        <button
          onClick={() => onNavigate("syllabus")}
          className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition"
        >
          View all
        </button>
      </div>
      <div className="space-y-1.5">
        {entries.map((entry) => (
          <div key={entry._id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-page px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text truncate">{entry.title}</p>
              {subjectName(entry.subject) && (
                <p className="text-xs text-muted mt-0.5">{subjectName(entry.subject)}</p>
              )}
            </div>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 shrink-0">
              {countdownText(entry.date!)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
