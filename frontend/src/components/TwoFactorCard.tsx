import { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";

type Stage = "idle" | "setup" | "backup-codes";

export default function TwoFactorCard() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<Stage>("idle");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/auth/profile");
      setEnabled(!!res.data.twoFactorEnabled);
    } catch {
      toast.error("Failed to load two-factor status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleStartSetup = async () => {
    try {
      setSubmitting(true);
      const res = await axios.post("/auth/2fa/setup");
      setQrCode(res.data.qrCode);
      setSecret(res.data.secret);
      setStage("setup");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to start setup");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSetup = async () => {
    if (!code.trim()) {
      toast.error("Enter the 6-digit code from your app");
      return;
    }
    try {
      setSubmitting(true);
      const res = await axios.post("/auth/2fa/enable", { code: code.trim() });
      setBackupCodes(res.data.backupCodes);
      setStage("backup-codes");
      setEnabled(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Incorrect code");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    setStage("idle");
    setCode("");
    setQrCode("");
    setSecret("");
    setBackupCodes([]);
    toast.success("Two-factor authentication enabled");
  };

  const handleDisable = async () => {
    if (!disablePassword) {
      toast.error("Enter your password to confirm");
      return;
    }
    try {
      setSubmitting(true);
      await axios.post("/auth/2fa/disable", { password: disablePassword });
      setEnabled(false);
      setShowDisableForm(false);
      setDisablePassword("");
      toast.success("Two-factor authentication disabled");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Incorrect password");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-200">Two-factor authentication</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {enabled ? "Enabled - an authenticator code is required to sign in" : "Add an authenticator app code as a second step at sign in"}
          </p>
        </div>
        {stage === "idle" && (
          enabled ? (
            <button
              onClick={() => setShowDisableForm((v) => !v)}
              className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition whitespace-nowrap"
            >
              {showDisableForm ? "Cancel" : "Disable"}
            </button>
          ) : (
            <button
              onClick={handleStartSetup}
              disabled={submitting}
              className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-black hover:bg-amber-400 transition disabled:opacity-50 whitespace-nowrap"
            >
              {submitting ? "Starting..." : "Enable"}
            </button>
          )
        )}
      </div>

      {showDisableForm && stage === "idle" && (
        <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
          <label className="block text-sm font-medium text-zinc-400">Confirm your password to disable</label>
          <input
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            placeholder="Password"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition"
          />
          <button
            onClick={handleDisable}
            disabled={submitting}
            className="w-full py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-bold transition disabled:opacity-50"
          >
            {submitting ? "Disabling..." : "Disable two-factor authentication"}
          </button>
        </div>
      )}

      {stage === "setup" && (
        <div className="mt-3 pt-3 border-t border-zinc-800 space-y-3">
          <p className="text-sm text-zinc-300">Scan this with your authenticator app (Google Authenticator, 1Password, Authy...):</p>
          {qrCode && <img src={qrCode} alt="Two-factor setup QR code" className="rounded-lg border border-zinc-800 w-40 h-40" />}
          <p className="text-xs text-zinc-500">Can't scan it? Enter this key manually:</p>
          <p className="text-xs font-mono text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 break-all">{secret}</p>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Enter the 6-digit code to confirm</label>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 text-sm text-center tracking-[0.3em] focus:outline-none focus:border-amber-500 transition"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setStage("idle"); setCode(""); }}
              className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSetup}
              disabled={submitting}
              className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition disabled:opacity-50"
            >
              {submitting ? "Confirming..." : "Confirm"}
            </button>
          </div>
        </div>
      )}

      {stage === "backup-codes" && (
        <div className="mt-3 pt-3 border-t border-zinc-800 space-y-3">
          <p className="text-sm font-semibold text-amber-400">Save these backup codes now</p>
          <p className="text-xs text-zinc-500">
            Each one lets you sign in once if you lose access to your authenticator app. They won't be shown again.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((c) => (
              <p key={c} className="font-mono text-sm text-zinc-200 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-center">
                {c}
              </p>
            ))}
          </div>
          <button
            onClick={handleFinish}
            className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition"
          >
            I've saved these codes
          </button>
        </div>
      )}
    </div>
  );
}
