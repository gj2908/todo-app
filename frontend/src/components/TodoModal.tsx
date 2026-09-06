import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "../axiosConfig";
import { createTodoOffline, updateTodoOffline, cacheSnapshot, getCachedSnapshot } from "../utils/offlineSync";

interface TodoModalProps {
  isOpen: boolean;
  todo: any | null;
  onClose: () => void;
  onSave: (todo: any) => void;
  defaultSubject?: string | null;
}

interface Subject {
  _id: string;
  name: string;
  icon: string;
}

interface Member {
  userId: string;
  email: string;
  role: "editor" | "viewer";
}

const getCurrentUser = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { id: payload.id, email: payload.email };
  } catch {
    return null;
  }
};

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

interface Subtask {
  title: string;
  completed: boolean;
}

interface AttachmentRef {
  _id: string;
  title: string;
}

const repeatOptions = [
  { value: "",        label: "None" },
  { value: "daily",   label: "Daily" },
  { value: "weekly",  label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const getBlankForm = (todo: any, defaultSubject: string | null | undefined) => ({
  title:       todo?.title       || "",
  description: todo?.description || "",
  priority:    todo?.priority    || "medium",
  category:    todo?.category    || "general",
  dueDate:     todo?.dueDate ? new Date(todo.dueDate).toISOString().split("T")[0] : "",
  tags:        todo?.tags?.join(", ") || "",
  subject:     todo?.subject || defaultSubject || "",
  assignee:    (typeof todo?.assignee === "object" ? todo?.assignee?._id : todo?.assignee) || "",
  recurFreq:     todo?.recurrence?.freq || "",
  recurInterval: todo?.recurrence?.interval || 1,
});

const TodoModal: React.FC<TodoModalProps> = ({ isOpen, todo, onClose, onSave, defaultSubject }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [formData, setFormData] = useState(() => getBlankForm(todo, defaultSubject));
  const [saving, setSaving] = useState(false);
  const [showNewSubjectForm, setShowNewSubjectForm] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>(todo?.subtasks || []);
  const [newSubtask, setNewSubtask] = useState("");
  const [attachments, setAttachments] = useState<AttachmentRef[]>(todo?.attachments || []);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const currentUser = getCurrentUser();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  // KEY FIX: Reset form whenever `todo` changes (fixes edit not populating)
  useEffect(() => {
    setFormData(getBlankForm(todo, defaultSubject));
    setSubtasks(todo?.subtasks || []);
    setAttachments(todo?.attachments || []);
  }, [todo, defaultSubject]);

  useEffect(() => {
    if (isOpen) fetchSubjects();
  }, [isOpen]);

  useEffect(() => {
    if (!formData.subject) { setMembers([]); return; }
    axios.get(`/subjects/${formData.subject}/members`)
      .then((res) => setMembers(res.data))
      .catch(() => setMembers([]));
  }, [formData.subject]);

  useEffect(() => {
    if (!isOpen || !todo?._id) { setComments([]); return; }
    setLoadingComments(true);
    axios.get(`/todos/${todo._id}/comments`)
      .then((res) => setComments(res.data))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [isOpen, todo?._id]);

  const handlePostComment = async () => {
    if (!newComment.trim() || !todo?._id) return;
    try {
      setPostingComment(true);
      const res = await axios.post(`/todos/${todo._id}/comments`, { text: newComment.trim() });
      setComments((prev) => [...prev, res.data]);
      setNewComment("");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await axios.get("/subjects");
      setSubjects(res.data);
    } catch {
      console.error("Failed to fetch subjects");
    }
  };

  const set = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) { toast.error("Subject name required!"); return; }
    setCreatingSubject(true);
    try {
      const res = await axios.post("/subjects", {
        name: newSubjectName.trim(),
        icon: "◆",
        color: "#f59e0b",
      });
      setSubjects([res.data, ...subjects]);
      window.dispatchEvent(new Event("subjects:changed"));
      set("subject", res.data._id);
      setNewSubjectName("");
      setShowNewSubjectForm(false);
      toast.success("Subject created!");
    } catch { toast.error("Failed to create subject"); }
    finally { setCreatingSubject(false); }
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks((prev) => [...prev, { title: newSubtask.trim(), completed: false }]);
    setNewSubtask("");
  };

  const toggleSubtask = (index: number) => {
    setSubtasks((prev) => prev.map((s, i) => (i === index ? { ...s, completed: !s.completed } : s)));
  };

  const removeSubtask = (index: number) => {
    setSubtasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAttachmentUpload = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    try {
      setUploadingAttachment(true);
      const res = await axios.post("/documents/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAttachments((prev) => [...prev, { _id: res.data._id, title: res.data.title }]);
    } catch {
      toast.error("Failed to upload attachment");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a._id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { toast.error("Title is required!"); return; }

    setSaving(true);
    try {
      const { recurFreq, recurInterval, ...rest } = formData;
      const payload = {
        ...rest,
        tags: formData.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
        subtasks,
        attachments: attachments.map((a) => a._id),
        recurrence: recurFreq ? { freq: recurFreq, interval: Number(recurInterval) || 1 } : null,
      };

      if (todo?._id) {
        const { synced, data } = await updateTodoOffline(todo._id, payload);
        if (synced) {
          toast.success("Task updated");
        } else {
          toast.info("You're offline - this will sync once you're back online");
          const cached = (await getCachedSnapshot("todos")) || [];
          await cacheSnapshot("todos", cached.map((t: any) => (t._id === todo._id ? { ...t, ...data } : t)));
        }
      } else {
        const { synced, data } = await createTodoOffline(payload);
        if (synced) {
          toast.success("Task created");
        } else {
          toast.info("You're offline - this will sync once you're back online");
          const cached = (await getCachedSnapshot("todos")) || [];
          await cacheSnapshot("todos", [...cached, data]);
        }
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
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
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
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
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
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
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
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
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

          {/* Due Date + Subject row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={e => set("dueDate", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-amber-500 transition [color-scheme:dark]"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Subject
              </label>
              {!showNewSubjectForm ? (
                <div className="flex gap-2">
                  <select
                    value={formData.subject}
                    onChange={e => set("subject", e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-amber-500 transition appearance-none cursor-pointer"
                  >
                    <option value="">No Subject</option>
                    {subjects.map(s => (
                      <option key={s._id} value={s._id}>
                        ◆ {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewSubjectForm(true)}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold rounded-lg transition"
                    title="Create new subject"
                  >
                    +
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={e => setNewSubjectName(e.target.value)}
                    placeholder="Subject name..."
                    autoFocus
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-amber-500 transition"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateSubject}
                      disabled={creatingSubject}
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition disabled:opacity-50"
                    >
                      {creatingSubject ? "Creating..." : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNewSubjectForm(false); setNewSubjectName(""); }}
                      className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Assignee
              </label>
              <select
                value={formData.assignee}
                onChange={e => set("assignee", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-amber-500 transition appearance-none cursor-pointer"
              >
                <option value="">Unassigned</option>
                {currentUser && <option value={currentUser.id}>Myself</option>}
                {formData.subject && members
                  .filter((m) => m.userId !== currentUser?.id)
                  .map((m) => (
                    <option key={m.userId} value={m.userId}>{m.email}</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Repeat */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Repeat</label>
            <div className="flex gap-2">
              <select
                value={formData.recurFreq}
                onChange={e => set("recurFreq", e.target.value)}
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-amber-500 transition appearance-none cursor-pointer"
              >
                {repeatOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {formData.recurFreq && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-zinc-500">every</span>
                  <input
                    type="number"
                    min={1}
                    value={formData.recurInterval}
                    onChange={e => set("recurInterval", e.target.value)}
                    className="w-16 px-2 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm text-center focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              )}
            </div>
            {formData.recurFreq && !formData.dueDate && (
              <p className="text-xs text-amber-400 mt-1.5">Add a due date so the next occurrence has something to count from.</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              Tags
              <span className="text-zinc-600 font-normal ml-1">(comma separated)</span>
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={e => set("tags", e.target.value)}
              placeholder="e.g. urgent, review, frontend"
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition"
            />
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Subtasks</label>
            {subtasks.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {subtasks.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
                    <input
                      type="checkbox"
                      checked={s.completed}
                      onChange={() => toggleSubtask(i)}
                      className="w-4 h-4 accent-amber-500 shrink-0"
                    />
                    <span className={`flex-1 text-sm ${s.completed ? "line-through text-zinc-500" : "text-zinc-200"}`}>
                      {s.title}
                    </span>
                    <button type="button" onClick={() => removeSubtask(i)} className="text-zinc-500 hover:text-red-400 transition shrink-0">
                      <CloseIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                placeholder="Add a subtask..."
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition"
              />
              <button
                type="button"
                onClick={addSubtask}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm font-semibold rounded-lg transition"
              >
                Add
              </button>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Attachments</label>
            {attachments.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {attachments.map((a) => (
                  <div key={a._id} className="flex items-center justify-between gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
                    <span className="text-sm text-zinc-200 truncate">{a.title}</span>
                    <button type="button" onClick={() => removeAttachment(a._id)} className="text-zinc-500 hover:text-red-400 transition shrink-0">
                      <CloseIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-dashed border-zinc-700 text-zinc-400 text-sm font-semibold rounded-lg transition cursor-pointer">
              {uploadingAttachment ? "Uploading..." : "Attach a file"}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                disabled={uploadingAttachment}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAttachmentUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {/* Comments & activity */}
          {todo?._id && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Activity</label>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-2">
                {loadingComments ? (
                  <p className="text-sm text-zinc-500">Loading...</p>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-zinc-500">No comments yet.</p>
                ) : (
                  comments.map((c, i) => (
                    <div key={i} className={c.type === "activity" ? "text-xs text-zinc-500 italic px-1" : "bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"}>
                      {c.type === "activity" ? (
                        <span>{c.user?.name || c.user?.email || "Someone"} {c.text}</span>
                      ) : (
                        <>
                          <p className="text-xs font-semibold text-amber-400">{c.user?.name || c.user?.email || "Someone"}</p>
                          <p className="text-sm text-zinc-200 mt-0.5">{c.text}</p>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handlePostComment())}
                  placeholder="Add a comment..."
                  className="flex-1 min-w-0 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition"
                />
                <button
                  type="button"
                  onClick={handlePostComment}
                  disabled={postingComment || !newComment.trim()}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold rounded-lg transition disabled:opacity-50 shrink-0"
                >
                  Post
                </button>
              </div>
            </div>
          )}
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
