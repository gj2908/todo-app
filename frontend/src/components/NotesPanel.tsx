import { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import ConfirmDialog from "./ConfirmDialog";
import OfflineBanner from "./OfflineBanner";
import { btn } from "../lib/ui";
import {
  cacheSnapshot,
  getCachedSnapshot,
  isOnline,
  trySync,
  createNoteOffline,
  updateNoteOffline,
  deleteNoteOffline,
} from "../utils/offlineSync";
import { getQueue } from "../utils/offlineDb";

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
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/notes");
      setNotes(res.data);
      setIsOffline(false);
      cacheSnapshot("notes", res.data);
    } catch {
      if (!isOnline()) {
        const cached = await getCachedSnapshot("notes");
        if (cached) {
          setNotes(cached);
          setIsOffline(true);
        } else {
          toast.error("Failed to load notes");
        }
      } else {
        toast.error("Failed to load notes");
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshPendingSyncCount = async () => {
    const queue = await getQueue();
    setPendingSyncCount(queue.filter((op) => (op.entity || "todo") === "note").length);
  };

  const runSync = async () => {
    const { synced, remaining } = await trySync();
    await refreshPendingSyncCount();
    if (synced > 0) await fetchNotes();
    setIsOffline(!isOnline());
    void remaining;
  };

  useEffect(() => {
    fetchNotes();
    refreshPendingSyncCount();
    setIsOffline(!isOnline());
    if (isOnline()) runSync();

    const handleOnline = () => runSync();
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const mergeIntoCache = async (updater: (prev: Note[]) => Note[]) => {
      const cached = (await getCachedSnapshot("notes")) || [];
      await cacheSnapshot("notes", updater(cached));
    };

    try {
      setSaving(true);
      if (selectedId && selectedId !== "new") {
        const { synced, data } = await updateNoteOffline(selectedId, { title: title.trim(), body, tags });
        setNotes((prev) => prev.map((n) => (n._id === selectedId ? { ...n, ...data } : n)));
        await mergeIntoCache((prev) => prev.map((n) => (n._id === selectedId ? { ...n, ...data } : n)));
        if (synced) toast.success("Note updated");
        else toast.info("You're offline - this will sync once you're back online");
      } else {
        const { synced, data } = await createNoteOffline({ title: title.trim(), body, tags });
        setNotes((prev) => [data, ...prev]);
        await mergeIntoCache((prev) => [data, ...prev]);
        setSelectedId(data._id);
        if (synced) toast.success("Note created");
        else toast.info("You're offline - this will sync once you're back online");
      }
      await refreshPendingSyncCount();
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data } = await updateNoteOffline(note._id, { pinned: !note.pinned });
      setNotes((prev) =>
        [...prev.map((n) => (n._id === note._id ? { ...n, ...data } : n))].sort(
          (a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      );
      await refreshPendingSyncCount();
    } catch {
      toast.error("Failed to update note");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget._id;
    setDeleteTarget(null);
    try {
      const { synced } = await deleteNoteOffline(id);
      setNotes((prev) => prev.filter((n) => n._id !== id));
      const cached = (await getCachedSnapshot("notes")) || [];
      await cacheSnapshot("notes", cached.filter((n: Note) => n._id !== id));
      if (selectedId === id) selectNote(null);
      toast.success(synced ? "Note deleted" : "Note deleted - will sync once you're back online");
      await refreshPendingSyncCount();
    } catch {
      toast.error("Failed to delete note");
    }
  };

  return (
    <div className="space-y-3">
      <OfflineBanner isOffline={isOffline} pendingSyncCount={pendingSyncCount} offlineLabel="showing cached notes" />
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
                  className={`px-4 py-2 text-sm ${btn.dangerGhost}`}
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
    </div>
  );
}
