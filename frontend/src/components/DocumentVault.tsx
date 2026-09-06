import { useEffect, useMemo, useState } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import ConfirmDialog from "./ConfirmDialog";
import OfflineBanner from "./OfflineBanner";
import { btn } from "../lib/ui";
import { cacheSnapshot, getCachedSnapshot, isOnline, trySync, updateDocumentOffline } from "../utils/offlineSync";
import { getQueue } from "../utils/offlineDb";

interface VaultDocument {
  _id: string;
  title: string;
  originalName: string;
  fileType: "image" | "pdf";
  url: string;
  bytes: number;
  createdAt: string;
}

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

export default function DocumentVault() {
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VaultDocument | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/documents", { params: { kind: "general" } });
      setDocuments(res.data);
      setIsOffline(false);
      cacheSnapshot("documents", res.data);
    } catch {
      if (!isOnline()) {
        const cached = await getCachedSnapshot("documents");
        if (cached) {
          setDocuments(cached);
          setIsOffline(true);
        } else {
          toast.error("Failed to load vault documents");
        }
      } else {
        toast.error("Failed to load vault documents");
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshPendingSyncCount = async () => {
    const queue = await getQueue();
    setPendingSyncCount(queue.filter((op) => (op.entity || "todo") === "document").length);
  };

  const runSync = async () => {
    const { synced } = await trySync();
    await refreshPendingSyncCount();
    if (synced > 0) await fetchDocuments();
    setIsOffline(!isOnline());
  };

  useEffect(() => {
    fetchDocuments();
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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline()) {
      toast.error("Uploads need a connection - try again once you're back online");
      return;
    }
    if (!file) {
      toast.error("Please choose an image or PDF file");
      return;
    }

    const form = new FormData();
    form.append("file", file);
    if (title.trim()) form.append("title", title.trim());

    try {
      setUploading(true);
      const res = await axios.post("/documents/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDocuments((prev) => [res.data, ...prev]);
      setFile(null);
      setTitle("");
      toast.success("Document uploaded");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!isOnline()) {
      toast.error("Deleting needs a connection - try again once you're back online");
      setDeleteTarget(null);
      return;
    }
    const id = deleteTarget._id;
    setDeleteTarget(null);
    try {
      await axios.delete(`/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
      const cached = (await getCachedSnapshot("documents")) || [];
      await cacheSnapshot("documents", cached.filter((d: VaultDocument) => d._id !== id));
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    }
  };

  const startEdit = (doc: VaultDocument) => {
    setEditingId(doc._id);
    setEditTitle(doc.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const handleUpdate = async (id: string) => {
    if (!editTitle.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      setSavingEdit(true);
      const { synced, data } = await updateDocumentOffline(id, { title: editTitle.trim() });
      setDocuments((prev) => prev.map((d) => (d._id === id ? { ...d, ...data } : d)));
      const cached = (await getCachedSnapshot("documents")) || [];
      await cacheSnapshot("documents", cached.map((d: VaultDocument) => (d._id === id ? { ...d, ...data } : d)));
      await refreshPendingSyncCount();
      toast.success(synced ? "Document updated" : "You're offline - this will sync once you're back online");
      cancelEdit();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update document");
    } finally {
      setSavingEdit(false);
    }
  };

  const counts = useMemo(() => {
    const images = documents.filter((d) => d.fileType === "image").length;
    const pdfs = documents.filter((d) => d.fileType === "pdf").length;
    return { images, pdfs, total: documents.length };
  }, [documents]);

  return (
    <div className="max-w-5xl space-y-4">
      <OfflineBanner isOffline={isOffline} pendingSyncCount={pendingSyncCount} offlineLabel="showing cached documents" />
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm text-muted">Upload and store images or PDFs securely in Cloudinary.</p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <span className="rounded-md bg-surface-alt px-2.5 py-1 text-text">Total: {counts.total}</span>
          <span className="rounded-md bg-surface-alt px-2.5 py-1 text-text">Images: {counts.images}</span>
          <span className="rounded-md bg-surface-alt px-2.5 py-1 text-text">PDFs: {counts.pdfs}</span>
        </div>
      </div>

      <form onSubmit={handleUpload} className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional title..."
            className="w-full rounded-lg border border-border-strong bg-surface-alt px-3 py-2 text-sm text-text placeholder-muted focus:outline-none focus:border-amber-500"
          />
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full rounded-lg border border-border-strong bg-surface-alt px-3 py-2 text-sm text-text file:mr-3 file:rounded-md file:border-0 file:bg-amber-500 file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-black"
          />
        </div>
        <button
          type="submit"
          disabled={uploading}
          className={`px-4 py-2 text-sm ${btn.primary}`}
        >
          {uploading ? "Uploading..." : "Upload to Vault"}
        </button>
      </form>

      <div className="rounded-xl border border-border bg-surface p-4">
        <h4 className="text-sm font-bold text-text mb-3">Stored files</h4>
        {loading ? (
          <p className="text-sm text-muted">Loading vault...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted">No files uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc._id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-page px-3 py-2.5">
                <div className="min-w-0">
                  {editingId === doc._id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-sm text-text focus:outline-none focus:border-amber-500"
                      />
                      <button
                        onClick={() => handleUpdate(doc._id)}
                        disabled={savingEdit}
                        className={`px-2 py-1 text-xs ${btn.primary}`}
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className={`px-2 py-1 text-xs ${btn.secondary}`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-text truncate">{doc.title}</p>
                  )}
                  <p className="text-xs text-muted truncate">
                    {doc.fileType.toUpperCase()} • {formatBytes(doc.bytes)} • {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/document-vault/${doc._id}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`px-2.5 py-1.5 text-xs ${btn.secondary}`}
                  >
                    Open
                  </a>
                  <button
                    onClick={() => startEdit(doc)}
                    className={`px-2.5 py-1.5 text-xs ${btn.secondary}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(doc)}
                    className={`px-2.5 py-1.5 text-xs ${btn.dangerGhost}`}
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
        title="Delete document"
        message={deleteTarget ? `"${deleteTarget.title}" will be permanently removed from your vault.` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
