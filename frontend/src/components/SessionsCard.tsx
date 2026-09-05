import { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import ConfirmDialog from "./ConfirmDialog";

interface Session {
  id: string;
  browser: string;
  os: string;
  city: string;
  country: string;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

const formatRelative = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

export default function SessionsCard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showRevokeAll, setShowRevokeAll] = useState(false);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/auth/sessions");
      setSessions(res.data);
    } catch {
      toast.error("Failed to load active sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (id: string) => {
    try {
      setRevokingId(id);
      await axios.delete(`/auth/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Signed out of that device");
    } catch {
      toast.error("Failed to sign out that device");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeOthers = async () => {
    setShowRevokeAll(false);
    try {
      await axios.post("/auth/sessions/revoke-others");
      setSessions((prev) => prev.filter((s) => s.current));
      toast.success("Signed out of all other devices");
    } catch {
      toast.error("Failed to sign out other devices");
    }
  };

  const otherSessionCount = sessions.filter((s) => !s.current).length;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-200">Active sessions</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Devices currently signed in to your account</p>
        </div>
        {otherSessionCount > 0 && (
          <button
            onClick={() => setShowRevokeAll(true)}
            className="text-xs font-semibold text-red-400 hover:text-red-300 transition whitespace-nowrap"
          >
            Sign out other devices
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading sessions...</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-zinc-500">No active sessions found.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const location = [s.city, s.country].filter(Boolean).join(", ") || "Unknown location";
            const device = [s.browser, s.os].filter(Boolean).join(" on ") || "Unknown device";
            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-zinc-200 truncate">{device}</p>
                    {s.current && (
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                        This device
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {location} &middot; active {formatRelative(s.lastSeenAt)}
                  </p>
                </div>
                {!s.current && (
                  <button
                    onClick={() => handleRevoke(s.id)}
                    disabled={revokingId === s.id}
                    className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-red-500/15 hover:text-red-400 transition disabled:opacity-50 shrink-0"
                  >
                    {revokingId === s.id ? "Signing out..." : "Sign out"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={showRevokeAll}
        title="Sign out other devices"
        message={`This ends ${otherSessionCount} other active session${otherSessionCount === 1 ? "" : "s"}. This device stays signed in.`}
        confirmLabel="Sign out"
        danger
        onConfirm={handleRevokeOthers}
        onCancel={() => setShowRevokeAll(false)}
      />
    </div>
  );
}
