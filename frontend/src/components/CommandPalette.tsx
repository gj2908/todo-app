import { useEffect, useMemo, useState } from "react";
import axios from "../axiosConfig";

interface Subject {
  _id: string;
  name: string;
}

interface CommandPaletteProps {
  subjects: Subject[];
  onViewChange: (view: string) => void;
  onSubjectSelect: (subjectId: string) => void;
  onNewTask: () => void;
  onOpenTodo: (todo: any) => void;
}

interface Command {
  id: string;
  label: string;
  group: string;
  action: () => void;
  matchText?: string;
}

export default function CommandPalette({ subjects, onViewChange, onSubjectSelect, onNewTask, onOpenTodo }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [todos, setTodos] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [contentLoaded, setContentLoaded] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      if (!contentLoaded) {
        setContentLoaded(true);
        Promise.all([
          axios.get("/todos").catch(() => ({ data: [] })),
          axios.get("/notes").catch(() => ({ data: [] })),
          axios.get("/documents").catch(() => ({ data: [] })),
        ]).then(([todosRes, notesRes, documentsRes]) => {
          setTodos(todosRes.data);
          setNotes(notesRes.data);
          setDocuments(documentsRes.data);
        });
      }
    }
  }, [open, contentLoaded]);

  const commands: Command[] = useMemo(() => {
    const run = (fn: () => void) => () => {
      fn();
      setOpen(false);
    };

    const viewCommands: Command[] = [
      { id: "inbox", label: "Go to Inbox", group: "Views", action: run(() => onViewChange("inbox")) },
      { id: "today", label: "Go to Today", group: "Views", action: run(() => onViewChange("today")) },
      { id: "upcoming", label: "Go to Upcoming", group: "Views", action: run(() => onViewChange("upcoming")) },
      { id: "completed", label: "Go to Completed", group: "Views", action: run(() => onViewChange("completed")) },
      { id: "calendar", label: "Go to Calendar", group: "Views", action: run(() => onViewChange("calendar")) },
      { id: "reminders", label: "Go to Reminders", group: "Views", action: run(() => onViewChange("reminders")) },
    ];

    const toolCommands: Command[] = [
      { id: "vault", label: "Go to Document Vault", group: "Tools", action: run(() => onViewChange("vault")) },
      { id: "notes", label: "Go to Notes", group: "Tools", action: run(() => onViewChange("notes")) },
      { id: "datesheet", label: "Go to Datesheet", group: "Tools", action: run(() => onViewChange("datesheet")) },
      { id: "syllabus", label: "Go to Syllabus", group: "Tools", action: run(() => onViewChange("syllabus")) },
      { id: "trash", label: "Go to Trash", group: "Tools", action: run(() => onViewChange("trash")) },
    ];

    const subjectCommands: Command[] = subjects.map((s) => ({
      id: `subject_${s._id}`,
      label: `Go to subject: ${s.name}`,
      group: "Subjects",
      action: run(() => onSubjectSelect(s._id)),
    }));

    const actionCommands: Command[] = [
      { id: "new-task", label: "New task", group: "Actions", action: run(onNewTask) },
    ];

    return [...actionCommands, ...viewCommands, ...toolCommands, ...subjectCommands];
  }, [subjects, onViewChange, onSubjectSelect, onNewTask]);

  const contentCommands: Command[] = useMemo(() => {
    const run = (fn: () => void) => () => {
      fn();
      setOpen(false);
    };

    const todoCommands: Command[] = todos.map((t) => ({
      id: `todo_${t._id}`,
      label: t.title,
      group: "Tasks",
      action: run(() => onOpenTodo(t)),
      matchText: [t.title, ...(t.tags || [])].join(" ").toLowerCase(),
    }));

    const noteCommands: Command[] = notes.map((n) => ({
      id: `note_${n._id}`,
      label: n.title,
      group: "Notes",
      action: run(() => onViewChange("notes")),
      matchText: [n.title, ...(n.tags || [])].join(" ").toLowerCase(),
    }));

    const documentCommands: Command[] = documents.map((d) => ({
      id: `document_${d._id}`,
      label: d.title,
      group: "Documents",
      action: run(() => onViewChange("vault")),
      matchText: [d.title, ...(d.tags || [])].join(" ").toLowerCase(),
    }));

    return [...todoCommands, ...noteCommands, ...documentCommands];
  }, [todos, notes, documents, onOpenTodo, onViewChange]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return [
      ...commands.filter((c) => c.label.toLowerCase().includes(q)),
      ...contentCommands.filter((c) => c.matchText?.includes(q)),
    ];
  }, [commands, contentCommands, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[activeIndex]) {
      e.preventDefault();
      filtered[activeIndex].action();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Jump to a view, subject, or action..."
          className="w-full px-5 py-4 bg-transparent text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none border-b border-zinc-800"
        />
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-5 py-6 text-sm text-zinc-500 text-center">No matches</p>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={cmd.action}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full flex items-center justify-between gap-3 px-5 py-2.5 text-left text-sm transition ${
                  i === activeIndex ? "bg-amber-500/15 text-amber-400" : "text-zinc-300"
                }`}
              >
                <span>{cmd.label}</span>
                <span className="text-[11px] text-zinc-600">{cmd.group}</span>
              </button>
            ))
          )}
        </div>
        <div className="px-5 py-2.5 border-t border-zinc-800 text-[11px] text-zinc-600 flex items-center gap-3">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
