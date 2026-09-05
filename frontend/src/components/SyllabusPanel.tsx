import { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import ConfirmDialog from "./ConfirmDialog";
import { btn } from "../lib/ui";

interface Subject {
  _id: string;
  name: string;
}

interface SyllabusDocument {
  _id: string;
  title: string;
  fileType: "image" | "pdf";
  url: string;
  subject: string | null;
  date: string | null;
  createdAt: string;
}

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

  return (
    <div className="max-w-5xl space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-sm text-zinc-500">Date-wise syllabus files, per subject or combined for all subjects.</p>
      </div>

      <form onSubmit={handleUpload} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional title..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500 appearance-none cursor-pointer"
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
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500 [color-scheme:dark]"
          />
        </div>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 file:mr-3 file:rounded-md file:border-0 file:bg-amber-500 file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-black"
        />
        <button
          type="submit"
          disabled={uploading}
          className={`px-4 py-2 text-sm ${btn.primary}`}
        >
          {uploading ? "Uploading..." : "Add Syllabus Entry"}
        </button>
      </form>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h4 className="text-sm font-bold text-zinc-200 mb-3">Entries</h4>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading syllabus...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-zinc-500">No syllabus entries yet.</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry._id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 shrink-0">
                      {entry.date ? new Date(entry.date).toLocaleDateString() : "No date"}
                    </span>
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
                      {subjectName(entry.subject)}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-100 truncate mt-1">{entry.title}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/document-vault/${entry._id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
                  >
                    Open
                  </a>
                  <button
                    onClick={() => setDeleteTarget(entry)}
                    className="rounded-md bg-red-500/10 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
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
