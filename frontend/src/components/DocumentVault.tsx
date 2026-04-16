import { useEffect, useMemo, useState } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";

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

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/documents");
      setDocuments(res.data);
    } catch {
      toast.error("Failed to load vault documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await axios.delete(`/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
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
      const res = await axios.put(`/documents/${id}`, { title: editTitle.trim() });
      setDocuments((prev) => prev.map((d) => (d._id === id ? res.data : d)));
      toast.success("Document updated");
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
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="text-lg font-bold text-zinc-100">Document Vault</h3>
        <p className="text-sm text-zinc-500 mt-1">Upload and store images or PDFs securely in Cloudinary.</p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-zinc-300">Total: {counts.total}</span>
          <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-zinc-300">Images: {counts.images}</span>
          <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-zinc-300">PDFs: {counts.pdfs}</span>
        </div>
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
          {uploading ? "Uploading..." : "Upload to Vault"}
        </button>
      </form>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h4 className="text-sm font-bold text-zinc-200 mb-3">Stored files</h4>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading vault...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-zinc-500">No files uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc._id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5">
                <div className="min-w-0">
                  {editingId === doc._id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        onClick={() => handleUpdate(doc._id)}
                        disabled={savingEdit}
                        className="rounded-md bg-amber-500 px-2 py-1 text-xs font-bold text-black disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-100 truncate">{doc.title}</p>
                  )}
                  <p className="text-xs text-zinc-500 truncate">
                    {doc.fileType.toUpperCase()} • {formatBytes(doc.bytes)} • {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/document-vault/${doc._id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
                  >
                    Open
                  </a>
                  <button
                    onClick={() => startEdit(doc)}
                    className="rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(doc._id)}
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
    </div>
  );
}
