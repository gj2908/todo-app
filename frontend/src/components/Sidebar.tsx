import { useState, useEffect } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";

interface Project {
  _id: string;
  name: string;
  icon: string;
  color: string;
}

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onProjectSelect?: (projectId: string) => void;
  todoCounts?: { [key: string]: number };
  reminderCount?: number;
}

const InboxIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 10l2-7h8l2 7H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M2 10h3.5l1 2h3l1-2H14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
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

export default function Sidebar({ activeView, onViewChange, onProjectSelect, todoCounts = {}, reminderCount = 0 }: SidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await axios.get("/projects");
      setProjects(res.data);
    } catch {
      console.error("Failed to fetch projects");
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) { toast.error("Project name required!"); return; }
    setLoading(true);
    try {
      const res = await axios.post("/projects", {
        name: newProjectName.trim(),
        icon: "◆",
        color: "#f59e0b",
      });
      setProjects([res.data, ...projects]);
      window.dispatchEvent(new Event("projects:changed"));
      setNewProjectName("");
      setShowNewProject(false);
      toast.success("Project created!");
    } catch { toast.error("Failed to create project"); }
    finally { setLoading(false); }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this project?")) return;
    try {
      await axios.delete(`/projects/${id}`);
      setProjects(projects.filter(p => p._id !== id));
      window.dispatchEvent(new Event("projects:changed"));
      if (activeView === `project_${id}`) onViewChange("inbox");
      toast.success("Project deleted!");
    } catch { toast.error("Failed to delete project"); }
  };

  const menuItems = [
    { id: "inbox", label: "Inbox", Icon: InboxIcon, key: "inbox" },
    { id: "today", label: "Today", Icon: TodayIcon, key: "today" },
    { id: "upcoming", label: "Upcoming", Icon: UpcomingIcon, key: "upcoming" },
    { id: "completed", label: "Completed", Icon: CompletedIcon, key: "completed" },
    { id: "calendar", label: "Calendar", Icon: CalendarIcon, key: "calendar" },
    { id: "reminders", label: "Reminders", Icon: ReminderIcon, key: "reminders" },
    { id: "vault", label: "Document Vault", Icon: VaultIcon, key: "vault" },
  ];

  return (
    <div className="sidebar w-72 sm:w-64 lg:w-60 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full shrink-0">
      {/* Views */}
      <div className="p-3 border-b border-zinc-800">
        <p className="text-xs font-bold text-zinc-500 tracking-widest uppercase px-2 mb-2">Views</p>
        <nav className="space-y-0.5">
          {menuItems.map(({ id, label, Icon, key }) => {
            const isActive = activeView === id;
            const count = key === "reminders" ? reminderCount : (todoCounts[key] ?? 0);
            return (
              <button
                key={id}
                onClick={() => onViewChange(id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-base font-semibold transition-all group ${
                  isActive
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon />
                  {label}
                </span>
                {count > 0 && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    isActive ? "bg-amber-500/25 text-amber-400" : "bg-zinc-700 text-zinc-400"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Projects */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="flex items-center justify-between px-2 mb-2">
          <p className="text-xs font-bold text-zinc-500 tracking-widest uppercase">Projects</p>
          <button
            onClick={() => setShowNewProject(!showNewProject)}
            className="text-zinc-500 hover:text-amber-400 transition-colors p-0.5"
            title="New project"
          >
            <PlusIcon />
          </button>
        </div>

        {showNewProject && (
          <div className="mb-3 p-2 bg-zinc-800 rounded-lg border border-zinc-700 space-y-2">
            <input
              type="text"
              placeholder="Project name..."
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreateProject()}
              autoFocus
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleCreateProject}
                disabled={loading}
                className="flex-1 py-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded transition disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => { setShowNewProject(false); setNewProjectName(""); }}
                className="flex-1 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-0.5">
          {projects.length === 0 && (
            <p className="text-sm text-zinc-500 px-2 py-3 text-center font-medium">No projects yet</p>
          )}
          {projects.map(project => {
            const isActive = activeView === `project_${project._id}`;
            return (
              <div
                key={project._id}
                onClick={() => onProjectSelect?.(project._id)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer group transition-all ${
                  isActive
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                <span className="flex items-center gap-2 text-base font-semibold min-w-0">
                  <span className="text-amber-500 text-xs">◆</span>
                  <span className="truncate">{project.name}</span>
                </span>
                <button
                  onClick={e => handleDeleteProject(project._id, e)}
                  className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition ml-1 shrink-0"
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800">
        <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest text-center">Taskflow</p>
      </div>
    </div>
  );
}
