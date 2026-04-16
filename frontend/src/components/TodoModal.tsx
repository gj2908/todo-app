import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "../axiosConfig";

interface TodoModalProps {
  isOpen: boolean;
  todo: any | null;
  onClose: () => void;
  onSave: (todo: any) => void;
  defaultProject?: string | null;
}

interface Project {
  _id: string;
  name: string;
  icon: string;
}

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const priorityOptions = [
  { value: "low",    label: "Low",    color: "text-green-400", dot: "bg-green-500" },
  { value: "medium", label: "Medium", color: "text-amber-400", dot: "bg-amber-500" },
  { value: "high",   label: "High",   color: "text-red-400",   dot: "bg-red-500" },
];

const categoryOptions = [
  { value: "general",  label: "General",  emoji: "📋" },
  { value: "work",     label: "Work",     emoji: "💼" },
  { value: "personal", label: "Personal", emoji: "👤" },
  { value: "shopping", label: "Shopping", emoji: "🛒" },
  { value: "health",   label: "Health",   emoji: "❤️" },
];

const getBlankForm = (todo: any, defaultProject: string | null | undefined) => ({
  title:       todo?.title       || "",
  description: todo?.description || "",
  priority:    todo?.priority    || "medium",
  category:    todo?.category    || "general",
  dueDate:     todo?.dueDate ? new Date(todo.dueDate).toISOString().split("T")[0] : "",
  tags:        todo?.tags?.join(", ") || "",
  project:     todo?.project || defaultProject || "",
});

const TodoModal: React.FC<TodoModalProps> = ({ isOpen, todo, onClose, onSave, defaultProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState(() => getBlankForm(todo, defaultProject));
  const [saving, setSaving] = useState(false);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  // KEY FIX: Reset form whenever `todo` changes (fixes edit not populating)
  useEffect(() => {
    setFormData(getBlankForm(todo, defaultProject));
  }, [todo, defaultProject]);

  useEffect(() => {
    if (isOpen) fetchProjects();
  }, [isOpen]);

  const fetchProjects = async () => {
    try {
      const res = await axios.get("/projects");
      setProjects(res.data);
    } catch {
      console.error("Failed to fetch projects");
    }
  };

  const set = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) { toast.error("Project name required!"); return; }
    setCreatingProject(true);
    try {
      const res = await axios.post("/projects", {
        name: newProjectName.trim(),
        icon: "◆",
        color: "#f59e0b",
      });
      setProjects([res.data, ...projects]);
      set("project", res.data._id);
      setNewProjectName("");
      setShowNewProjectForm(false);
      toast.success("Project created!");
    } catch { toast.error("Failed to create project"); }
    finally { setCreatingProject(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { toast.error("Title is required!"); return; }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
      };

      if (todo?._id) {
        await axios.put(`/todos/${todo._id}`, payload);
        toast.success("✅ Task updated!");
      } else {
        await axios.post("/todos", payload);
        toast.success("✅ Task created!");
      }
      onSave(null);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error saving task");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[92vh] bg-zinc-900 border border-zinc-700 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-100">
              {todo ? "Edit Task" : "New Task"}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {todo ? "Update task details" : "Add a new task to your workspace"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Task Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={e => set("title", e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Add details (optional)..."
              rows={2}
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition resize-none"
            />
          </div>

          {/* Priority + Category row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <div className="flex gap-1.5">
                {priorityOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("priority", opt.value)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                      formData.priority === opt.value
                        ? `${opt.color} bg-zinc-700 border-zinc-500`
                        : "text-zinc-500 bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={formData.category}
                onChange={e => set("category", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-amber-500 transition appearance-none cursor-pointer"
              >
                {categoryOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.emoji} {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date + Project row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Due Date */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={e => set("dueDate", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-amber-500 transition [color-scheme:dark]"
              />
            </div>

            {/* Project */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Project
              </label>
              {!showNewProjectForm ? (
                <div className="flex gap-2">
                  <select
                    value={formData.project}
                    onChange={e => set("project", e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-amber-500 transition appearance-none cursor-pointer"
                  >
                    <option value="">No Project</option>
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>
                        ◆ {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewProjectForm(true)}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold rounded-lg transition"
                    title="Create new project"
                  >
                    +
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    placeholder="Project name..."
                    autoFocus
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-amber-500 transition"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateProject}
                      disabled={creatingProject}
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition disabled:opacity-50"
                    >
                      {creatingProject ? "Creating..." : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNewProjectForm(false); setNewProjectName(""); }}
                      className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Tags
              <span className="text-zinc-600 font-normal ml-1 normal-case">(comma separated)</span>
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={e => set("tags", e.target.value)}
              placeholder="e.g. urgent, review, frontend"
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 px-4 sm:px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-zinc-400 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold text-black bg-amber-500 hover:bg-amber-400 transition disabled:opacity-50 shadow-lg shadow-amber-500/20"
          >
            {saving ? "Saving..." : todo ? "Update Task" : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TodoModal;
