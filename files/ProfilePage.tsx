import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import Navbar from "../components/Navbar";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser(payload);
    } catch { navigate("/login"); }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Signed out");
    navigate("/login");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    try {
      setLoading(true);
      await axios.put("/auth/change-password", { password: newPassword });
      toast.success("Password updated!");
      setShowPasswordForm(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally { setLoading(false); }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-4">
          {/* Back */}
          <button
            onClick={() => navigate("/home")}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition mb-2"
          >
            ← Back to workspace
          </button>

          {/* Account card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-2xl font-bold text-black">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-100">Account Settings</h2>
                <p className="text-sm text-zinc-500">Manage your Taskflow account</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-zinc-800 rounded-xl border border-zinc-700">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Email Address</p>
                <p className="text-sm font-semibold text-zinc-200">{user.email}</p>
              </div>
              <div className="p-4 bg-zinc-800 rounded-xl border border-zinc-700">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">User ID</p>
                <p className="text-xs font-mono text-zinc-400 break-all">{user.id}</p>
              </div>
            </div>
          </div>

          {/* Password card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-200">Password</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Update your account password</p>
              </div>
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition"
              >
                {showPasswordForm ? "Cancel" : "Change"}
              </button>
            </div>

            {showPasswordForm && (
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg font-bold text-sm text-black bg-amber-500 hover:bg-amber-400 transition disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </form>
            )}
          </div>

          {/* Danger zone */}
          <div className="bg-zinc-900 border border-red-500/20 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-zinc-300 mb-1">Sign Out</h3>
            <p className="text-xs text-zinc-500 mb-4">You'll need to sign in again to access your workspace.</p>
            <button
              onClick={handleLogout}
              className="w-full py-2.5 rounded-lg font-bold text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
