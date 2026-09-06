import { useEffect, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import ConfirmDialog from "./ConfirmDialog";
import { btn } from "../lib/ui";

interface Subject {
  _id: string;
  name: string;
}

interface ChecklistItem {
  text: string;
  done: boolean;
}

interface SyllabusDocument {
  _id: string;
  title: string;
  fileType: "image" | "pdf";
  url: string;
  subject: string | null;
  date: string | null;
  createdAt: string;
  checklist?: ChecklistItem[];
}

const countdownLabel = (dateStr: string | null) => {
  if (!dateStr) return null;
  const days = differenceInCalendarDays(new Date(dateStr), new Date());
  if (days < 0) return { text: "Past", cls: "bg-surface-alt text-muted" };
  if (days === 0) return { text: "Today", cls: "bg-red-500/15 text-red-400" };
  if (days === 1) return { text: "1 day left", cls: "bg-amber-500/15 text-amber-400" };
  if (days <= 7) return { text: `${days} days left`, cls: "bg-amber-500/15 text-amber-400" };
  return { text: `${days} days left`, cls: "bg-surface-alt text-muted" };
};

export default function SyllabusPanel() {
  const [entries, setEntries] = useState<SyllabusDocument[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<SyllabusDocument | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/documents", { params: { kind: "syllabus" } });
      setEntries(res.data);
    } catch {
      toast.error("Failed to load syllabus");
    } finally {
      setLoading(false);
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

  useEffect(() => {
    fetchEntries();
    fetchSubjects();
  }, []);

  const subjectName = (id: string | null) => {
    if (!id) return "All subjects";
    return subjects.find((s) => s._id === id)?.name || "Unknown subject";
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please choose an image or PDF file");
      return;
    }
    if (!date) {
      toast.error("Please pick a date");
      return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("kind", "syllabus");
    form.append("date", date);
    if (subjectId) form.append("subject", subjectId);
    if (title.trim()) form.append("title", title.trim());

    try {
      setUploading(true);
      const res = await axios.post("/documents/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setEntries((prev) => [...prev, res.data].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()));
      setFile(null);
      setTitle("");
      setDate("");
      toast.success("Syllabus entry added");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget._id;
    setDeleteTarget(null);
    try {
      await axios.delete(`/documents/${id}`);
      setEntries((prev) => prev.filter((e) => e._id !== id));
      toast.success("Syllabus entry deleted");
    } catch {
      toast.error("Failed to delete entry");
    }
  };

  const saveChecklist = async (entry: SyllabusDocument, checklist: ChecklistItem[]) => {
    setEntries((prev) => prev.map((e) => (e._id === entry._id ? { ...e, checklist } : e)));
    try {
      await axios.put(`/documents/${entry._id}`, { title: entry.title, checklist });
    } catch {
      toast.error("Failed to update checklist");
    }
  };

  const handleAddChecklistItem = (entry: SyllabusDocument) => {
    if (!newItemText.trim()) return;
    const checklist = [...(entry.checklist || []), { text: newItemText.trim(), done: false }];
    setNewItemText("");
    saveChecklist(entry, checklist);
  };

  const handleToggleChecklistItem = (entry: SyllabusDocument, index: number) => {
    const checklist = (entry.checklist || []).map((item, i) => (i === index ? { ...item, done: !item.done } : item));
    saveChecklist(entry, checklist);
  };

  const handleRemoveChecklistItem = (entry: SyllabusDocument, index: number) => {
    const checklist = (entry.checklist || []).filter((_, i) => i !== index);
    saveChecklist(entry, checklist);
  };

  return (
    <div className="max-w-5xl space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm text-muted">Date-wise syllabus files, per subject or combined for all subjects.</p>
      </div>

      <form onSubmit={handleUpload} className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional title..."
            className="w-full rounded-lg border border-border-strong bg-surface-alt px-3 py-2 text-sm text-text placeholder-muted focus:outline-none focus:border-amber-500"
          />
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full rounded-lg border border-border-strong bg-surface-alt px-3 py-2 text-sm text-text focus:outline-none focus:border-amber-500 appearance-none cursor-pointer"
          >
            <option value="">Combined (all subjects)</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-border-strong bg-surface-alt px-3 py-2 text-sm text-text focus:outline-none focus:border-amber-500 [color-scheme:dark]"
          />
        </div>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full rounded-lg border border-border-strong bg-surface-alt px-3 py-2 text-sm text-text file:mr-3 file:rounded-md file:border-0 file:bg-amber-500 file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-black"
        />
        <button
          type="submit"
          disabled={uploading}
          className={`px-4 py-2 text-sm ${btn.primary}`}
        >
          {uploading ? "Uploading..." : "Add Syllabus Entry"}
        </button>
      </form>

      <div className="rounded-xl border border-border bg-surface p-4">
        <h4 className="text-sm font-bold text-text mb-3">Entries</h4>
        {loading ? (
          <p className="text-sm text-muted">Loading syllabus...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted">No syllabus entries yet.</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const countdown = countdownLabel(entry.date);
              const checklist = entry.checklist || [];
              const isExpanded = expandedId === entry._id;
              return (
                <div key={entry._id} className="rounded-lg border border-border bg-page px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 shrink-0">
                          {entry.date ? new Date(entry.date).toLocaleDateString() : "No date"}
                        </span>
                        {countdown && (
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${countdown.cls}`}>
                            {countdown.text}
                          </span>
                        )}
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-surface-alt text-muted shrink-0">
                          {subjectName(entry.subject)}
                        </span>
                      </div>
                      <p className="text-sm text-text truncate mt-1">{entry.title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { setExpandedId(isExpanded ? null : entry._id); setNewItemText(""); }}
                        className={`px-2.5 py-1.5 text-xs ${btn.secondary}`}
                      >
                        {checklist.length > 0 ? `Checklist (${checklist.filter((c) => c.done).length}/${checklist.length})` : "Checklist"}
                      </button>
                      <a
                        href={`/document-vault/${entry._id}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`px-2.5 py-1.5 text-xs ${btn.secondary}`}
                      >
                        Open
                      </a>
                      <button
                        onClick={() => setDeleteTarget(entry)}
                        className={`px-2.5 py-1.5 text-xs ${btn.dangerGhost}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                      {checklist.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() => handleToggleChecklistItem(entry, i)}
                            className="w-3.5 h-3.5 rounded accent-amber-500 shrink-0"
                          />
                          <span className={`text-sm flex-1 min-w-0 truncate ${item.done ? "text-muted line-through" : "text-text"}`}>
                            {item.text}
                          </span>
                          <button
                            onClick={() => handleRemoveChecklistItem(entry, i)}
                            className="text-xs text-muted hover:text-red-400 transition shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <input
                          value={newItemText}
                          onChange={(e) => setNewItemText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddChecklistItem(entry)}
                          placeholder="Add a prep item..."
                          className="flex-1 min-w-0 rounded-lg border border-border-strong bg-surface-alt px-3 py-1.5 text-sm text-text placeholder-muted focus:outline-none focus:border-amber-500"
                        />
                        <button
                          onClick={() => handleAddChecklistItem(entry)}
                          className={`px-3 py-1.5 text-xs ${btn.primary}`}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete syllabus entry"
        message={deleteTarget ? `"${deleteTarget.title}" will be permanently removed.` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
