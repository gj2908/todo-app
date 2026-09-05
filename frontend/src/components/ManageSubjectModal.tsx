import { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import ConfirmDialog from "./ConfirmDialog";

interface Member {
  userId: string;
  email: string;
  role: "editor" | "viewer";
}

interface ManageSubjectModalProps {
  isOpen: boolean;
  subjectId: string | null;
  subjectName: string;
  onClose: () => void;
}

export default function ManageSubjectModal({ isOpen, subjectId, subjectName, onClose }: ManageSubjectModalProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [inviting, setInviting] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  const fetchMembers = async () => {
    if (!subjectId) return;
    try {
      setLoading(true);
      const res = await axios.get(`/subjects/${subjectId}/members`);
      setMembers(res.data);
    } catch {
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, subjectId]);

  const handleInvite = async () => {
    if (!email.trim()) { toast.error("Enter an email address"); return; }
    try {
      setInviting(true);
      const res = await axios.post(`/subjects/${subjectId}/invite`, { email: email.trim(), role });
      setMembers((prev) => [...prev, { userId: res.data.userId, email: res.data.email, role: res.data.role }]);
      setEmail("");
      toast.success("Member added");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to invite member");
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget || !subjectId) return;
    const target = removeTarget;
    setRemoveTarget(null);
    try {
      await axios.delete(`/subjects/${subjectId}/members/${target.userId}`);
      setMembers((prev) => prev.filter((m) => m.userId !== target.userId));
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
        <h3 className="text-base font-bold text-zinc-100">Share "{subjectName}"</h3>
        <p className="text-sm text-zinc-500 mt-1">Invite by email - they need an existing Taskflow account.</p>

        <div className="mt-4 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            placeholder="teammate@example.com"
            className="flex-1 min-w-0 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            onClick={handleInvite}
            disabled={inviting}
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50 shrink-0"
          >
            {inviting ? "..." : "Invite"}
          </button>
        </div>

        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-zinc-500">Not shared with anyone yet.</p>
          ) : (
            members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{m.email}</p>
                  <p className="text-xs text-zinc-500 capitalize">{m.role}</p>
                </div>
                <button
                  onClick={() => setRemoveTarget(m)}
                  className="text-xs font-semibold text-red-400 hover:text-red-300 transition shrink-0"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
        >
          Done
        </button>
      </div>

      <ConfirmDialog
        isOpen={!!removeTarget}
        title="Remove member"
        message={removeTarget ? `${removeTarget.email} will lose access to this subject.` : ""}
        confirmLabel="Remove"
        danger
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
