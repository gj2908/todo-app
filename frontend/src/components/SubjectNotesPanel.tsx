import { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import ConfirmDialog from "./ConfirmDialog";

interface NoteDocument {
  _id: string;
  title: string;
  originalName: string;
  fileType: "image" | "pdf";
  url: string;
  bytes: number;
  createdAt: string;
}

interface SubjectNotesPanelProps {
  subjectId: string;
  subjectName: string;
}

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

export default function SubjectNotesPanel({ subjectId, subjectName }: SubjectNotesPanelProps) {
  const [notes, setNotes] = useState<NoteDocument[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<NoteDocument | null>(null);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/documents", { params: { kind: "note", subject: subjectId } });
      setNotes(res.data);
    } catch {
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please choose an image or PDF file");
      return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("kind", "note");
    form.append("subject", subjectId);
    if (title.trim()) form.append("title", title.trim());

    try {
      setUploading(true);
      const res = await axios.post("/documents/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setNotes((prev) => [res.data, ...prev]);
      setFile(null);
      setTitle("");
      toast.success("Note uploaded");
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
      setNotes((prev) => prev.filter((n) => n._id !== id));
      toast.success("Note deleted");
    } catch {
      toast.error("Failed to delete note");
    }
  };

  return (
    <div className="max-w-5xl space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="text-lg font-bold text-zinc-100">{subjectName} — Notes</h3>
        <p className="text-sm text-zinc-500 mt-1">Upload PDFs, images, or any file as notes for this subject.</p>
      </div>

      <form onSubmit={handleUpload} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional title..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 file:mr-3 file:rounded-md file:border-0 file:bg-amber-500 file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-black"
          />
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Add Note"}
        </button>
      </form>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h4 className="text-sm font-bold text-zinc-200 mb-3">Notes</h4>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading notes...</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-zinc-500">No notes uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <div key={note._id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-100 truncate">{note.title}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {note.fileType.toUpperCase()} • {formatBytes(note.bytes)} • {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/document-vault/${note._id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
                  >
                    Open
                  </a>
                  <button
                    onClick={() => setDeleteTarget(note)}
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
        title="Delete note"
        message={deleteTarget ? `"${deleteTarget.title}" will be permanently removed.` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
