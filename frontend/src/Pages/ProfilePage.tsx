import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import Navbar from "../components/Navbar";
import PageHeader from "../components/PageHeader";
import { btn, input } from "../lib/ui";

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
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

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser(payload);
    } catch { navigate("/login"); }
  }, [navigate]);

  useEffect(() => {
    axios.get("/auth/profile")
      .then((res) => {
        setEmail(res.data.email);
        setEmailVerified(!!res.data.emailVerified);
      })
      .catch(() => {});
  }, []);

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

  if (!user) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-border-strong border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-start justify-center px-4 sm:px-6 pt-4 sm:pt-5 pb-6">
        <div className="w-full max-w-lg space-y-4">
          <PageHeader title="Profile" />

          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-2xl font-bold text-black shrink-0">
                {email?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-base font-bold text-text truncate">{email}</p>
                  {emailVerified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 shrink-0">
                      <CheckIcon />
                      Verified
                    </span>
                  ) : (
                    <button
                      onClick={handleResendVerification}
                      disabled={resending}
                      className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition shrink-0 disabled:opacity-50"
                    >
                      {resending ? "Sending..." : "Not verified · Resend"}
                    </button>
                  )}
                </div>
                <p className="text-sm text-muted mt-0.5">Your email can't be changed on Taskflow</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text">Password</h3>
                  <p className="text-xs text-muted mt-0.5">Update your account password</p>
                </div>
                <button
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  className={`px-3 py-2 text-xs ${showPasswordForm ? btn.secondary : btn.primary}`}
                >
                  {showPasswordForm ? "Cancel" : "Change Password"}
                </button>
              </div>

              {showPasswordForm && (
                <form onSubmit={handleChangePassword} className="space-y-3 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1.5">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Your current password"
                      className={`w-full px-3.5 py-2.5 text-sm ${input}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className={`w-full px-3.5 py-2.5 text-sm ${input}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1.5">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className={`w-full px-3.5 py-2.5 text-sm ${input}`}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className={`w-full py-2.5 text-sm ${btn.primary}`}
                  >
                    {changingPassword ? "Updating..." : "Update Password"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
