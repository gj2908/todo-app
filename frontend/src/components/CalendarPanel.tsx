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
  compact?: boolean;
}

export default function CalendarPanel({ todos, compact = false }: CalendarPanelProps) {
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
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className={`flex items-center justify-between gap-2 ${compact ? "flex-col items-start sm:flex-row sm:items-center" : ""}`}>
        <h3 className={compact ? "text-sm font-bold text-zinc-100" : "text-lg font-bold text-zinc-100"}>
          Monthly Deadlines
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className={`${compact ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm"} rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition`}
          >
            Prev
          </button>
          <span className={`${compact ? "text-xs min-w-[96px]" : "text-sm min-w-[120px]"} font-semibold text-zinc-300 text-center`}>
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className={`${compact ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm"} rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition`}
          >
            Next
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-7 ${compact ? "gap-1.5" : "gap-2"} text-center text-[11px] font-bold uppercase tracking-wider text-zinc-500`}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className={compact ? "py-1" : "py-2"}>{d}</div>
        ))}
      </div>

      <div className={`grid grid-cols-7 ${compact ? "gap-1.5" : "gap-2"}`}>
        {emptyDays.map((_, idx) => (
          <div key={`empty-${idx}`} className="aspect-square" />
        ))}

        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayTodos = dueMap.get(dayKey) || [];
          const firstTitle = dayTodos[0]?.title || "";
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={dayKey}
              onClick={() => setSelectedDate(day)}
              className={`aspect-square rounded-xl border ${compact ? "p-1" : "p-1.5"} text-left transition ${
                isSelected
                  ? "bg-amber-500/15 border-amber-500/40"
                  : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
              } ${!isSameMonth(day, currentMonth) ? "opacity-40" : "opacity-100"}`}
            >
              <p className={`${compact ? "text-[10px]" : "text-xs"} font-bold ${isToday ? "text-amber-400" : "text-zinc-300"}`}>{format(day, "d")}</p>
              {dayTodos.length > 0 && (
                <>
                  <p className={`${compact ? "text-[9px] mt-0.5" : "text-[10px] mt-1"} text-zinc-300 leading-tight truncate`} title={firstTitle}>
                    {firstTitle}
                  </p>
                  {dayTodos.length > 1 && (
                    <p className={`${compact ? "text-[9px]" : "text-[10px]"} text-zinc-500 leading-tight`}>+{dayTodos.length - 1} more</p>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className={`rounded-xl border border-zinc-800 bg-zinc-900 ${compact ? "p-3" : "p-4"}`}>
        <p className={`${compact ? "text-xs" : "text-sm"} font-semibold text-zinc-200 mb-2`}>
          {format(selectedDate, "EEE, MMM d")} deadlines
        </p>
        {selectedTodos.length > 0 ? (
          <div className={compact ? "space-y-1.5" : "space-y-2"}>
            {selectedTodos.map((t) => (
              <div key={t._id} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                <p className={compact ? "text-xs text-zinc-200" : "text-sm text-zinc-200"}>{t.title}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className={compact ? "text-xs text-zinc-500" : "text-sm text-zinc-500"}>No due tasks for this day.</p>
        )}
      </div>
    </div>
  );
}
