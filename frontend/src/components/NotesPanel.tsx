import { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import ConfirmDialog from "./ConfirmDialog";
import { btn } from "../lib/ui";

interface Note {
  _id: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  updatedAt: string;
}

const PinIcon = ({ filled }: { filled: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill={filled ? "currentColor" : "none"}>
    <path d="M8 2l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

export default function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/notes");
      setNotes(res.data);
    } catch {
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const selected = notes.find((n) => n._id === selectedId) || null;

  const selectNote = (note: Note | null) => {
    setSelectedId(note?._id || null);
    setTitle(note?.title || "");
    setBody(note?.body || "");
    setTagsInput(note?.tags?.join(", ") || "");
  };

  const handleNew = () => {
    selectNote(null);
    setSelectedId("new");
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Give the note a title");
      return;
    }

    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

    try {
      setSaving(true);
      if (selectedId && selectedId !== "new") {
        const res = await axios.put(`/notes/${selectedId}`, { title: title.trim(), body, tags });
        setNotes((prev) => prev.map((n) => (n._id === selectedId ? res.data : n)));
        toast.success("Note updated");
      } else {
        const res = await axios.post("/notes", { title: title.trim(), body, tags });
        setNotes((prev) => [res.data, ...prev]);
        setSelectedId(res.data._id);
        toast.success("Note created");
      }
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await axios.put(`/notes/${note._id}`, { pinned: !note.pinned });
      setNotes((prev) =>
        [...prev.map((n) => (n._id === note._id ? res.data : n))].sort(
          (a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      );
    } catch {
      toast.error("Failed to update note");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget._id;
    setDeleteTarget(null);
    try {
      await axios.delete(`/notes/${id}`);
      setNotes((prev) => prev.filter((n) => n._id !== id));
      if (selectedId === id) selectNote(null);
      toast.success("Note deleted");
    } catch {
      toast.error("Failed to delete note");
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr] items-start">
      {/* Note list */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="p-3 border-b border-zinc-800">
          <button
            onClick={handleNew}
            className={`w-full py-2 text-sm ${btn.primary}`}
          >
            New note
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <p className="text-sm text-zinc-500 p-4">Loading...</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-zinc-500 p-4">No notes yet.</p>
          ) : (
            notes.map((note) => (
              <button
                key={note._id}
                onClick={() => selectNote(note)}
                className={`w-full text-left px-4 py-3 border-b border-zinc-800/60 transition ${
                  selectedId === note._id ? "bg-amber-500/10" : "hover:bg-zinc-800/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-200 truncate">{note.title}</p>
                  <span
                    onClick={(e) => handleTogglePin(note, e)}
                    className={note.pinned ? "text-amber-400 shrink-0" : "text-zinc-600 hover:text-zinc-400 shrink-0"}
                  >
                    <PinIcon filled={note.pinned} />
                  </span>
                </div>
                <p className="text-xs text-zinc-500 truncate mt-0.5">{note.body || "No content"}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 min-h-[60vh]">
        {selectedId ? (
          <div className="flex flex-col h-full gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              className="w-full bg-transparent text-lg font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none"
            />
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Tags, comma separated"
              className="w-full bg-transparent text-xs text-zinc-500 placeholder-zinc-600 focus:outline-none"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write in markdown..."
              className="w-full flex-1 min-h-[300px] bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 resize-none font-mono"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-4 py-2 text-sm ${btn.primary}`}
              >
                {saving ? "Saving..." : "Save note"}
              </button>
              {selected && (
                <button
                  onClick={() => setDeleteTarget(selected)}
                  className="rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold px-4 py-2 transition-all duration-200 active:scale-[0.97]"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center text-zinc-500 text-sm">
            Select a note, or create a new one.
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete note"
        message={deleteTarget ? `"${deleteTarget.title}" will be permanently deleted.` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
