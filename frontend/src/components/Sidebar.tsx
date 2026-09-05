import { useState, useEffect } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import ConfirmDialog from "./ConfirmDialog";
import ManageSubjectModal from "./ManageSubjectModal";

interface Subject {
  _id: string;
  name: string;
  icon: string;
  color: string;
  role?: "owner" | "editor" | "viewer";
}

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onSubjectSelect?: (subjectId: string) => void;
  onSubjectNotesOpen?: (subjectId: string) => void;
  todoCounts?: { [key: string]: number };
  reminderCount?: number;
  /** Mobile drawer instance: always render fully expanded and hide the collapse toggle. */
  forceExpanded?: boolean;
}

const DashboardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="8.5" y="2" width="5.5" height="8.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="2" y="9.5" width="5.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="8.5" y="12.5" width="5.5" height="1.5" rx="0.75" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const InboxIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 10l2-7h8l2 7H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M2 10h3.5l1 2h3l1-2H14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const TasksGroupIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 4h10M3 8h10M3 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform ${open ? "rotate-90" : ""}`}>
    <path d="M4 2.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TodayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 2v2M11 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M2 7h12" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="8" cy="11" r="1.5" fill="currentColor" />
  </svg>
);

const UpcomingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CompletedIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ReminderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2.5a3.5 3.5 0 0 1 3.5 3.5v2.2c0 .7.2 1.3.6 1.8l.8 1H3.1l.8-1c.4-.5.6-1.1.6-1.8V6A3.5 3.5 0 0 1 8 2.5Z" stroke="currentColor" strokeWidth="1.4" />
    <path d="M6.5 12.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const VaultIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2.5 5.5h11v7a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 2.5 12.5v-7Z" stroke="currentColor" strokeWidth="1.4" />
    <path d="M5 5.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M6 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const NoteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 2.5h10v11H3v-11Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const DatesheetIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M4.5 9.5h2M8 9.5h2M4.5 12h2M8 12h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const SyllabusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 3h7l3 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M10 3v3h3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M4.5 9h5M4.5 11.5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const InsightsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2.5 13.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <rect x="4" y="8" width="2" height="4.5" rx="0.5" fill="currentColor" />
    <rect x="7.5" y="5" width="2" height="7.5" rx="0.5" fill="currentColor" />
    <rect x="11" y="2.5" width="2" height="10" rx="0.5" fill="currentColor" />
  </svg>
);

const NavTrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 4.5l.6 8.5a1.2 1.2 0 0 0 1.2 1.1h4.4a1.2 1.2 0 0 0 1.2-1.1l.6-8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M2 3.5h9M5 3.5V2.5h3v1M3.5 3.5l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ShareIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="10" cy="3" r="1.6" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="3" cy="6.5" r="1.6" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="10" cy="10" r="1.6" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4.4 5.6l4.2-1.8M4.4 7.4l4.2 1.8" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

const SubjectNotesSmallIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M2.5 2h8v9h-8V2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M4.5 5h4M4.5 7h4M4.5 9h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const CollapseIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    className={`transition-transform duration-300 ease-out ${collapsed ? "rotate-180" : ""}`}
  >
    <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SIDEBAR_COLLAPSED_KEY = "sidebar:collapsed";
const TASKS_OPEN_KEY = "sidebar:tasksOpen";

export default function Sidebar({ activeView, onViewChange, onSubjectSelect, onSubjectNotesOpen, todoCounts = {}, reminderCount = 0, forceExpanded = false }: SidebarProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [manageTarget, setManageTarget] = useState<Subject | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [tasksOpen, setTasksOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(TASKS_OPEN_KEY);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  const fetchSubjects = async () => {
    try {
      const res = await axios.get("/subjects");
      setSubjects(res.data);
    } catch {
      console.error("Failed to fetch subjects");
    }
  };

  useEffect(() => { fetchSubjects(); }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      // ignore storage failures (private browsing, etc.)
    }
  }, [collapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(TASKS_OPEN_KEY, String(tasksOpen));
    } catch {
      // ignore storage failures (private browsing, etc.)
    }
  }, [tasksOpen]);

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) { toast.error("Subject name required!"); return; }
    setLoading(true);
    try {
      const res = await axios.post("/subjects", {
        name: newSubjectName.trim(),
        icon: "◆",
        color: "#f59e0b",
      });
      setSubjects([res.data, ...subjects]);
      window.dispatchEvent(new Event("subjects:changed"));
      setNewSubjectName("");
      setShowNewSubject(false);
      toast.success("Subject created!");
    } catch { toast.error("Failed to create subject"); }
    finally { setLoading(false); }
  };

  const handleDeleteSubject = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget._id;
    setDeleteTarget(null);
    try {
      await axios.delete(`/subjects/${id}`);
      setSubjects(subjects.filter(s => s._id !== id));
      window.dispatchEvent(new Event("subjects:changed"));
      if (activeView === `subject_${id}`) onViewChange("inbox");
      toast.success("Subject deleted!");
    } catch { toast.error("Failed to delete subject"); }
  };

  const dashboardItem = { id: "dashboard", label: "Dashboard", Icon: DashboardIcon, key: "dashboard" };

  const taskItems = [
    { id: "inbox", label: "Inbox", Icon: InboxIcon, key: "inbox" },
    { id: "today", label: "Today", Icon: TodayIcon, key: "today" },
    { id: "upcoming", label: "Upcoming", Icon: UpcomingIcon, key: "upcoming" },
    { id: "completed", label: "Completed", Icon: CompletedIcon, key: "completed" },
  ];

  const viewItems = [
    dashboardItem,
    ...taskItems,
    { id: "calendar", label: "Calendar", Icon: CalendarIcon, key: "calendar" },
    { id: "reminders", label: "Reminders", Icon: ReminderIcon, key: "reminders" },
  ];

  const otherViewItems = [
    { id: "calendar", label: "Calendar", Icon: CalendarIcon, key: "calendar" },
    { id: "reminders", label: "Reminders", Icon: ReminderIcon, key: "reminders" },
  ];

  const isTaskViewActive = taskItems.some((i) => i.id === activeView);
  // The mobile drawer always renders fully expanded; only the desktop rail collapses.
  const isCollapsed = forceExpanded ? false : collapsed;

  const toolItems = [
    { id: "notes", label: "Notes", Icon: NoteIcon, key: "notes" },
    { id: "vault", label: "Document Vault", Icon: VaultIcon, key: "vault" },
    { id: "datesheet", label: "Datesheet", Icon: DatesheetIcon, key: "datesheet" },
    { id: "syllabus", label: "Syllabus", Icon: SyllabusIcon, key: "syllabus" },
    { id: "insights", label: "Insights", Icon: InsightsIcon, key: "insights" },
    { id: "trash", label: "Trash", Icon: NavTrashIcon, key: "trash" },
  ];

  const renderMenuItem = ({ id, label, Icon, key }: (typeof viewItems)[number], indent = false) => {
    const isActive = activeView === id;
    const count = key === "reminders" ? reminderCount : (todoCounts[key] ?? 0);
    return (
      <button
        key={id}
        onClick={() => onViewChange(id)}
        title={isCollapsed ? label : undefined}
        className={`w-full flex items-center rounded-lg text-sm font-semibold transition-all duration-200 ease-out active:scale-[0.97] group ${
          isCollapsed ? "justify-center px-2 py-2" : indent ? "justify-between pl-7 pr-2.5 py-1.5" : "justify-between px-2.5 py-1.5"
        } ${
          isActive
            ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Icon />
          <span className={`whitespace-nowrap overflow-hidden transition-all duration-200 ease-out ${
            isCollapsed ? "max-w-0 opacity-0" : "max-w-[10rem] opacity-100"
          }`}>
            {label}
          </span>
        </span>
        {!isCollapsed && count > 0 && (
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded transition-opacity duration-200 ${
            isActive ? "bg-amber-500/25 text-amber-400" : "bg-zinc-700 text-zinc-400"
          }`}>
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className={`sidebar bg-zinc-900 border-r border-zinc-800 flex flex-col h-full shrink-0 overflow-hidden transition-[width] duration-300 ease-out ${
      isCollapsed ? "w-14" : "w-64 sm:w-60 lg:w-56"
    }`}>
      {/* Collapse toggle (desktop rail only) */}
      {!forceExpanded && (
        <div className={`shrink-0 flex items-center py-2 px-2 border-b border-zinc-800 ${isCollapsed ? "justify-center" : "justify-end"}`}>
          <button
            onClick={() => setCollapsed((v) => !v)}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 active:scale-90 transition-all duration-150"
          >
            <CollapseIcon collapsed={isCollapsed} />
          </button>
        </div>
      )}

      {/* Scrollable nav + subjects */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Views */}
        <div className="p-2.5 pt-3">
          {!isCollapsed && <p className="text-[11px] font-bold text-zinc-500 tracking-widest uppercase px-2 mb-1.5">Views</p>}
          <nav className="space-y-0.5">
            {isCollapsed ? (
              viewItems.map((item) => renderMenuItem(item))
            ) : (
              <>
                {renderMenuItem(dashboardItem)}
                <button
                  onClick={() => setTasksOpen((v) => !v)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[0.97] ${
                    isTaskViewActive && !tasksOpen
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <TasksGroupIcon />
                    Tasks
                  </span>
                  <ChevronIcon open={tasksOpen} />
                </button>
                {tasksOpen && (
                  <div className="space-y-0.5 mt-0.5 animate-fadeSlideDown">
                    {taskItems.map((item) => renderMenuItem(item, true))}
                  </div>
                )}
                {otherViewItems.map((item) => renderMenuItem(item))}
              </>
            )}
          </nav>
        </div>

        {/* Tools */}
        <div className="p-2.5 pt-1">
          {!isCollapsed && <p className="text-[11px] font-bold text-zinc-500 tracking-widest uppercase px-2 mb-1.5">Tools</p>}
          <nav className="space-y-0.5">
            {toolItems.map((item) => renderMenuItem(item))}
          </nav>
        </div>

        {/* Subjects */}
        {!isCollapsed && (
          <div className="p-2.5 pt-1">
            <div className="flex items-center justify-between px-2 mb-1.5">
              <p className="text-[11px] font-bold text-zinc-500 tracking-widest uppercase">Subjects</p>
              <button
                onClick={() => setShowNewSubject(!showNewSubject)}
                className="text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 rounded-md active:scale-90 transition-all duration-150 p-1"
                title="New subject"
              >
                <PlusIcon />
              </button>
            </div>

            {showNewSubject && (
              <div className="mb-2 p-2 bg-zinc-800 rounded-lg border border-zinc-700 space-y-2 animate-fadeSlideDown">
                <input
                  type="text"
                  placeholder="Subject name..."
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreateSubject()}
                  autoFocus
                  className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={handleCreateSubject}
                    disabled={loading}
                    className="flex-1 py-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded transition disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => { setShowNewSubject(false); setNewSubjectName(""); }}
                    className="flex-1 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-0.5">
              {subjects.length === 0 && (
                <p className="text-xs text-zinc-500 px-2 py-2.5 text-center font-medium">No subjects yet</p>
              )}
              {subjects.map(subject => {
                const isActive = activeView === `subject_${subject._id}`;
                const isOwner = !subject.role || subject.role === "owner";
                return (
                  <div
                    key={subject._id}
                    onClick={() => onSubjectSelect?.(subject._id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer group transition-all duration-150 active:scale-[0.99] ${
                      isActive
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold min-w-0">
                      <span className="text-xs" style={{ color: subject.color || "#f59e0b" }}>{subject.icon || "◆"}</span>
                      <span className="truncate">{subject.name}</span>
                      {!isOwner && (
                        <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-zinc-700 text-zinc-400 capitalize shrink-0">
                          {subject.role}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); onSubjectNotesOpen?.(subject._id); }}
                        className="p-1.5 rounded-md text-zinc-500 hover:text-amber-400 hover:bg-zinc-700/60 active:scale-90 transition-all duration-150"
                        title="Subject notes"
                      >
                        <SubjectNotesSmallIcon />
                      </button>
                      {isOwner && (
                        <button
                          onClick={e => { e.stopPropagation(); setManageTarget(subject); }}
                          className="p-1.5 rounded-md text-zinc-500 hover:text-amber-400 hover:bg-zinc-700/60 active:scale-90 transition-all duration-150"
                          title="Share subject"
                        >
                          <ShareIcon />
                        </button>
                      )}
                      {isOwner && (
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteTarget(subject); }}
                          className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all duration-150"
                          title="Delete subject"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <div className="shrink-0 py-1.5 border-t border-zinc-800">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-center">Taskflow</p>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete subject"
        message={deleteTarget ? `"${deleteTarget.name}" will be deleted. Tasks inside it will stay in your workspace but lose their subject.` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteSubject}
        onCancel={() => setDeleteTarget(null)}
      />

      <ManageSubjectModal
        isOpen={!!manageTarget}
        subjectId={manageTarget?._id || null}
        subjectName={manageTarget?.name || ""}
        subjectColor={manageTarget?.color}
        subjectIcon={manageTarget?.icon}
        onClose={() => setManageTarget(null)}
        onUpdated={(id, changes) => {
          setSubjects((prev) => prev.map((s) => (s._id === id ? { ...s, ...changes } : s)));
          setManageTarget((prev) => (prev && prev._id === id ? { ...prev, ...changes } : prev));
          window.dispatchEvent(new Event("subjects:changed"));
        }}
      />
    </div>
  );
}
