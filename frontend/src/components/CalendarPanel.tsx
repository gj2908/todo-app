import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isSameDay, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { useMemo, useState } from "react";

interface TodoLite {
  _id: string;
  title: string;
  dueDate?: string;
  completed: boolean;
}

interface CalendarPanelProps {
  todos: TodoLite[];
}

export default function CalendarPanel({ todos }: CalendarPanelProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const emptyDays = Array(getDay(monthStart)).fill(null);

  const dueMap = useMemo(() => {
    const m = new Map<string, TodoLite[]>();
    todos.forEach((todo) => {
      if (!todo.dueDate || todo.completed) return;
      const key = format(new Date(todo.dueDate), "yyyy-MM-dd");
      const prev = m.get(key) || [];
      prev.push(todo);
      m.set(key, prev);
    });
    return m;
  }, [todos]);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedTodos = dueMap.get(selectedKey) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-zinc-100">Monthly Deadlines</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="px-2.5 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            Prev
          </button>
          <span className="text-sm font-semibold text-zinc-300 min-w-[120px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="px-2.5 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-wider text-zinc-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {emptyDays.map((_, idx) => (
          <div key={`empty-${idx}`} className="aspect-square" />
        ))}

        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayTodos = dueMap.get(dayKey) || [];
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={dayKey}
              onClick={() => setSelectedDate(day)}
              className={`aspect-square rounded-xl border p-1.5 text-left transition ${
                isSelected
                  ? "bg-amber-500/15 border-amber-500/40"
                  : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
              } ${!isSameMonth(day, currentMonth) ? "opacity-40" : "opacity-100"}`}
            >
              <p className={`text-xs font-bold ${isToday ? "text-amber-400" : "text-zinc-300"}`}>{format(day, "d")}</p>
              {dayTodos.length > 0 && (
                <p className="text-[10px] text-zinc-400 mt-1 leading-tight">
                  {dayTodos.length} due
                </p>
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-sm font-semibold text-zinc-200 mb-2">
          {format(selectedDate, "EEE, MMM d")} deadlines
        </p>
        {selectedTodos.length > 0 ? (
          <div className="space-y-2">
            {selectedTodos.map((t) => (
              <div key={t._id} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                <p className="text-sm text-zinc-200">{t.title}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No due tasks for this day.</p>
        )}
      </div>
    </div>
  );
}
