import { format, isPast, isToday, isTomorrow } from "date-fns";

interface TodoItemProps {
  todo: any;
  projectName?: string | null;
  onEdit: (todo: any) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, completed: boolean) => void;
}

const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M9.5 2L11 3.5l-7 7H2.5V9l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M8 3.5l1.5 1.5" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const DeleteIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M2 3.5h9M5 3.5V2.5h3v1M3.5 3.5l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const priorityConfig: Record<string, { dot: string; badge: string; border: string }> = {
  high:   { dot: "bg-red-500",    badge: "bg-red-500/15 text-red-400 border-red-500/30",    border: "border-l-red-500" },
  medium: { dot: "bg-amber-500",  badge: "bg-amber-500/15 text-amber-400 border-amber-500/30", border: "border-l-amber-500" },
  low:    { dot: "bg-green-500",  badge: "bg-green-500/15 text-green-400 border-green-500/30", border: "border-l-green-500" },
};

const categoryColors: Record<string, string> = {
  work:     "bg-blue-500/15 text-blue-400 border-blue-500/25",
  personal: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  shopping: "bg-pink-500/15 text-pink-400 border-pink-500/25",
  health:   "bg-teal-500/15 text-teal-400 border-teal-500/25",
  general:  "bg-zinc-700 text-zinc-400 border-zinc-600",
};

export default function TodoItem({ todo, projectName, onEdit, onDelete, onToggle }: TodoItemProps) {
  const pc = priorityConfig[todo.priority] || priorityConfig.medium;

  const getDateInfo = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isPast(d) && !isToday(d)) return { label: "Overdue", cls: "text-red-400 bg-red-500/10 border-red-500/20" };
    if (isToday(d)) return { label: "Today", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    if (isTomorrow(d)) return { label: "Tomorrow", cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
    return { label: format(d, "MMM d"), cls: "text-zinc-400 bg-zinc-800 border-zinc-700" };
  };

  const dateInfo = todo.dueDate ? getDateInfo(todo.dueDate) : null;

  return (
    <div
      className={`group relative flex items-start gap-3 p-3.5 sm:gap-3.5 sm:p-4 rounded-xl border-l-2 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/70 hover:border-zinc-700 transition-all duration-150 ${pc.border} ${
        todo.completed ? "opacity-50" : ""
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(todo._id, !todo.completed)}
        className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          todo.completed
            ? "bg-amber-500 border-amber-500"
            : "border-zinc-600 hover:border-amber-500"
        }`}
        aria-label="Toggle complete"
      >
        {todo.completed && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2 2 4-4" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <h3 className={`text-sm font-semibold leading-snug ${todo.completed ? "line-through text-zinc-500" : "text-zinc-100"}`}>
            {todo.title}
          </h3>

          {/* Actions - visible on hover */}
          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={() => onEdit(todo)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all"
            >
              <EditIcon />
              Edit
            </button>
            <button
              onClick={() => onDelete(todo._id)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
            >
              <DeleteIcon />
            </button>
          </div>
        </div>

        {todo.description && (
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed line-clamp-2">{todo.description}</p>
        )}

        {/* Tags row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {/* Project name */}
          {projectName && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/30">
              ◆ {projectName}
            </span>
          )}

          {/* Priority */}
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${pc.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
            {todo.priority}
          </span>

          {/* Category */}
          {todo.category && todo.category !== "general" && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border uppercase tracking-wider ${categoryColors[todo.category] || categoryColors.general}`}>
              {todo.category}
            </span>
          )}

          {/* Due date */}
          {dateInfo && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${dateInfo.cls}`}>
              ⏰ {dateInfo.label}
            </span>
          )}

          {/* Tags */}
          {todo.tags?.map((tag: string, idx: number) => (
            <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
