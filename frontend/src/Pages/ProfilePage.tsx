import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import Navbar from "../components/Navbar";
import SessionsCard from "../components/SessionsCard";
import TwoFactorCard from "../components/TwoFactorCard";
import NotificationsCard from "../components/NotificationsCard";
import InstallPwaCard from "../components/InstallPwaCard";

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-bold text-zinc-500 tracking-widest uppercase px-1">{children}</p>
);

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(true);
  const [resending, setResending] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);

  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser(payload);
    } catch { navigate("/login"); }
  }, [navigate]);

  const fetchProfile = () => {
    axios.get("/auth/profile")
      .then((res) => {
        setEmail(res.data.email);
        setEmailVerified(!!res.data.emailVerified);
      })
      .catch(() => {});
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleResendVerification = async () => {
    try {
      setResending(true);
      await axios.post("/auth/resend-verification");
      toast.success("Verification email sent");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send verification email");
    } finally {
      setResending(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !emailPassword) { toast.error("Enter the new email and your password"); return; }
    try {
      setChangingEmail(true);
      const res = await axios.post("/auth/change-email", { newEmail: newEmail.trim(), password: emailPassword });
      toast.success(res.data.message || "Confirmation link sent");
      setShowEmailForm(false);
      setNewEmail("");
      setEmailPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to request email change");
    } finally {
      setChangingEmail(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) { toast.error("Enter your current password"); return; }
    if (!newPassword || newPassword.length < 6) { toast.error("New password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    try {
      setChangingPassword(true);
      await axios.put("/auth/change-password", { currentPassword, password: newPassword });
      toast.success("Password updated");
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally { setChangingPassword(false); }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await axios.get("/account/export", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "taskflow-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export your data");
    } finally {
      setExporting(false);
    }
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
        <div className="w-full max-w-lg space-y-6">
          {/* Back */}
          <button
            onClick={() => navigate("/home")}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition"
          >
            ← Back to workspace
          </button>

          <div>
            <h1 className="text-xl font-bold text-zinc-100">Settings</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Manage your account, security, and notifications</p>
          </div>

          {/* Account */}
          <div className="space-y-3">
            <SectionLabel>Account</SectionLabel>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-2xl font-bold text-black">
                  {email?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-zinc-100">Account</h2>
                  <p className="text-sm text-zinc-500">Manage your Taskflow account</p>
                </div>
              </div>

              <div className="p-4 bg-zinc-800 rounded-xl border border-zinc-700">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-500 mb-1">Email Address</p>
                    <p className="text-sm font-semibold text-zinc-200 truncate">{email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {emailVerified ? (
                      <span className="text-[11px] font-bold px-2 py-1 rounded bg-green-500/15 text-green-400 whitespace-nowrap">Verified</span>
                    ) : (
                      <button
                        onClick={handleResendVerification}
                        disabled={resending}
                        className="text-[11px] font-bold px-2 py-1 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition whitespace-nowrap disabled:opacity-50"
                      >
                        {resending ? "Sending..." : "Not verified · Resend"}
                      </button>
                    )}
                    <button
                      onClick={() => setShowEmailForm(!showEmailForm)}
                      className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition whitespace-nowrap"
                    >
                      {showEmailForm ? "Cancel" : "Change"}
                    </button>
                  </div>
                </div>

                {showEmailForm && (
                  <form onSubmit={handleChangeEmail} className="mt-4 pt-4 border-t border-zinc-700 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1.5">New email address</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="new@example.com"
                        className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1.5">Confirm with your password</label>
                      <input
                        type="password"
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        placeholder="Current password"
                        className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                    <p className="text-xs text-zinc-500">We'll send a confirmation link to the new address - your email won't change until you click it.</p>
                    <button
                      type="submit"
                      disabled={changingEmail}
                      className="w-full py-2.5 rounded-lg font-bold text-sm text-black bg-amber-500 hover:bg-amber-400 transition disabled:opacity-50"
                    >
                      {changingEmail ? "Sending..." : "Send confirmation link"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="space-y-3">
            <SectionLabel>Security</SectionLabel>

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
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Your current password"
                      className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Confirm New Password</label>
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
                    disabled={changingPassword}
                    className="w-full py-2.5 rounded-lg font-bold text-sm text-black bg-amber-500 hover:bg-amber-400 transition disabled:opacity-50"
                  >
                    {changingPassword ? "Updating..." : "Update Password"}
                  </button>
                </form>
              )}
            </div>

            <TwoFactorCard />
            <SessionsCard />
          </div>

          {/* Notifications */}
          <div className="space-y-3">
            <SectionLabel>Notifications</SectionLabel>
            <NotificationsCard />
            <InstallPwaCard />
          </div>

          {/* Data */}
          <div className="space-y-3">
            <SectionLabel>Data</SectionLabel>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">Export your data</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Download every task, subject, note, and document record as one JSON file</p>
                </div>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition disabled:opacity-50 whitespace-nowrap"
                >
                  {exporting ? "Preparing..." : "Export data"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
