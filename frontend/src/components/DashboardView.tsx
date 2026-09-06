import { useMemo } from "react";
import { isPast, isToday } from "date-fns";
import TodoItem from "./TodoItem";
import CalendarPanel from "./CalendarPanel";
import StatsStrip from "./StatsStrip";
import InsightsPanel from "./InsightsPanel";
import OnboardingChecklist from "./OnboardingChecklist";
import StudyTimerWidget from "./StudyTimerWidget";
import { btn } from "../lib/ui";

interface Subject {
  _id: string;
  name: string;
  icon: string;
  color: string;
}

interface DashboardViewProps {
  todos: any[];
  subjects: Subject[];
  todoCounts: { today: number };
  overdueCount: number;
  next24h: number;
  getSubjectName: (subjectId: string | undefined) => string | null;
  onEdit: (todo: any) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, completed: boolean) => void;
  onAddTask: () => void;
  onNavigate: (view: string) => void;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

export default function DashboardView({
  todos,
  subjects,
  todoCounts,
  overdueCount,
  next24h,
  getSubjectName,
  onEdit,
  onDelete,
  onToggle,
  onAddTask,
  onNavigate,
}: DashboardViewProps) {
  const focusTodos = useMemo(() => {
    return todos
      .filter((t) => t.dueDate && !t.completed && (isPast(new Date(t.dueDate)) || isToday(new Date(t.dueDate))))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 6);
  }, [todos]);

  const subjectMeta = (id: string | undefined) => (id ? subjects.find((s) => s._id === id) : undefined);

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">{getGreeting()}</h2>
          <p className="text-sm text-zinc-500 mt-1">Here's where things stand today.</p>
        </div>
        <button
          onClick={onAddTask}
          className={`px-4 py-2.5 text-sm whitespace-nowrap ${btn.primary}`}
        >
          + New Task
        </button>
      </div>

      <OnboardingChecklist hasSubject={subjects.length > 0} hasTask={todos.length > 0} onAddTask={onAddTask} />

      <StatsStrip today={todoCounts.today} overdue={overdueCount} next24h={next24h} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-zinc-100">Needs attention</h3>
            <button
              onClick={() => onNavigate("inbox")}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition"
            >
              View all
            </button>
          </div>
          {focusTodos.length > 0 ? (
            <div className="space-y-1.5">
              {focusTodos.map((todo) => {
                const meta = subjectMeta(todo.subject);
                return (
                  <TodoItem
                    key={todo._id}
                    todo={todo}
                    subjectName={getSubjectName(todo.subject)}
                    subjectColor={meta?.color}
                    subjectIcon={meta?.icon}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggle={onToggle}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Nothing due or overdue - you're on top of things.</p>
          )}
        </div>

        <div className="space-y-3">
          <StudyTimerWidget subjects={subjects} />
          <CalendarPanel todos={todos} subjects={subjects} compact />
        </div>
      </div>

      <InsightsPanel todos={todos} subjects={subjects} />
    </div>
  );
}
