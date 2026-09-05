import { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import ConfirmDialog from "./ConfirmDialog";

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
      <p className="text-sm text-zinc-500">Deleted tasks stay here until you remove them for good.</p>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-zinc-400 font-semibold">Trash is empty</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item._id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-200 truncate">{item.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">Deleted {new Date(item.deletedAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleRestore(item._id)}
                  className="rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Restore
                </button>
                <button
                  onClick={() => setDeleteTarget(item)}
                  className="rounded-md bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20"
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
