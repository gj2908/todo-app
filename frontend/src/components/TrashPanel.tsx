import { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import ConfirmDialog from "./ConfirmDialog";
import { btn } from "../lib/ui";

interface TrashedTodo {
  _id: string;
  title: string;
  deletedAt: string;
}

export default function TrashPanel() {
  const [items, setItems] = useState<TrashedTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<TrashedTodo | null>(null);

  const fetchTrash = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/todos/trash");
      setItems(res.data);
    } catch {
      toast.error("Failed to load trash");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (id: string) => {
    try {
      await axios.post(`/todos/${id}/restore`);
      setItems((prev) => prev.filter((t) => t._id !== id));
      toast.success("Task restored");
    } catch {
      toast.error("Failed to restore task");
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget._id;
    setDeleteTarget(null);
    try {
      await axios.delete(`/todos/${id}/permanent`);
      setItems((prev) => prev.filter((t) => t._id !== id));
      toast.success("Task permanently deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-sm text-muted">Deleted tasks stay here until you remove them for good.</p>

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-muted font-semibold">Trash is empty</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item._id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text truncate">{item.title}</p>
                <p className="text-xs text-muted mt-0.5">Deleted {new Date(item.deletedAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleRestore(item._id)}
                  className={`px-2.5 py-1.5 text-xs ${btn.secondary}`}
                >
                  Restore
                </button>
                <button
                  onClick={() => setDeleteTarget(item)}
                  className={`px-2.5 py-1.5 text-xs ${btn.dangerGhost}`}
                >
                  Delete forever
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete forever"
        message={deleteTarget ? `"${deleteTarget.title}" will be permanently removed. This can't be undone.` : ""}
        confirmLabel="Delete forever"
        danger
        onConfirm={handlePermanentDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
