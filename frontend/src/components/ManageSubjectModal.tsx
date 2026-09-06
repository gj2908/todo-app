import { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import ConfirmDialog from "./ConfirmDialog";
import { btn } from "../lib/ui";

interface Member {
  userId: string;
  email: string;
  role: "editor" | "viewer";
}

interface ManageSubjectModalProps {
  isOpen: boolean;
  subjectId: string | null;
  subjectName: string;
  subjectColor?: string;
  subjectIcon?: string;
  onClose: () => void;
  onUpdated?: (id: string, changes: { color?: string; icon?: string }) => void;
}

const COLOR_SWATCHES = [
  "#f59e0b", "#ef4444", "#22c55e", "#3b82f6",
  "#a855f7", "#ec4899", "#14b8a6", "#64748b",
];

const ICON_SWATCHES = ["◆", "📋", "💼", "🎯", "📚", "🏠", "🛒", "🔬", "🎨", "⭐"];

export default function ManageSubjectModal({ isOpen, subjectId, subjectName, subjectColor, subjectIcon, onClose, onUpdated }: ManageSubjectModalProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [inviting, setInviting] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [savingAppearance, setSavingAppearance] = useState(false);

  const handlePickColor = async (color: string) => {
    if (!subjectId || color === subjectColor) return;
    try {
      setSavingAppearance(true);
      await axios.put(`/subjects/${subjectId}`, { color });
      onUpdated?.(subjectId, { color });
    } catch {
      toast.error("Failed to update color");
    } finally {
      setSavingAppearance(false);
    }
  };

  const handlePickIcon = async (icon: string) => {
    if (!subjectId || icon === subjectIcon) return;
    try {
      setSavingAppearance(true);
      await axios.put(`/subjects/${subjectId}`, { icon });
      onUpdated?.(subjectId, { icon });
    } catch {
      toast.error("Failed to update icon");
    } finally {
      setSavingAppearance(false);
    }
  };

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
      <div className="relative w-full max-w-md rounded-2xl border border-border-strong bg-surface p-5 shadow-2xl">
        <h3 className="text-base font-bold text-text">Manage "{subjectName}"</h3>

        <div className="mt-4">
          <p className="text-sm font-medium text-muted mb-2">Color</p>
          <div className="flex flex-wrap gap-2">
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                onClick={() => handlePickColor(c)}
                disabled={savingAppearance}
                style={{ backgroundColor: c }}
                className={`w-7 h-7 rounded-full transition ${subjectColor === c ? "ring-2 ring-offset-2 ring-offset-zinc-900 ring-text" : "hover:opacity-80"}`}
                aria-label={`Set color ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-muted mb-2">Icon</p>
          <div className="flex flex-wrap gap-2">
            {ICON_SWATCHES.map((i) => (
              <button
                key={i}
                onClick={() => handlePickIcon(i)}
                disabled={savingAppearance}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-base border transition ${
                  subjectIcon === i ? "border-amber-500 bg-amber-500/10" : "border-border-strong bg-surface-alt hover:border-border-strong"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-border">
          <p className="text-sm font-bold text-text">Share</p>
          <p className="text-sm text-muted mt-1">Invite by email - they need an existing Taskflow account.</p>
        </div>

        <div className="mt-3 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            placeholder="teammate@example.com"
            className="flex-1 min-w-0 rounded-lg border border-border-strong bg-surface-alt px-3 py-2 text-sm text-text placeholder-muted focus:outline-none focus:border-amber-500"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
            className="rounded-lg border border-border-strong bg-surface-alt px-2 py-2 text-sm text-text focus:outline-none focus:border-amber-500"
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            onClick={handleInvite}
            disabled={inviting}
            className={`px-3 py-2 text-sm shrink-0 ${btn.primary}`}
          >
            {inviting ? "..." : "Invite"}
          </button>
        </div>

        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted">Not shared with anyone yet.</p>
          ) : (
            members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-page px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-text truncate">{m.email}</p>
                  <p className="text-xs text-muted capitalize">{m.role}</p>
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
          className={`mt-5 w-full px-3 py-2 text-sm ${btn.secondary}`}
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
