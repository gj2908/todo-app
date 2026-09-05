import { useState } from "react";
import axios from "../axiosConfig";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";

export default function LoginPage() {
  const [email, setEmail] = useState(() => localStorage.getItem("lastEmail") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const completeLogin = (data: { token: string }) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("lastEmail", email);
    toast.success("Welcome back!");
    navigate("/home");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields"); return; }
    try {
      setLoading(true);
      const res = await axios.post("/auth/login", { email, password });
      if (res.data.requires2FA) {
        setTempToken(res.data.tempToken);
        return;
      }
      completeLogin(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { toast.error("Enter your 6-digit code"); return; }
    try {
      setLoading(true);
      const res = await axios.post("/auth/2fa/verify-login", { tempToken, code: code.trim() });
      if (res.data.usedBackupCode) {
        toast.info("Signed in with a backup code");
      }
      completeLogin(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-10">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-blue-500/40">
            <img src="/favicon_io/android-chrome-192x192.png" alt="Taskflow" className="w-full h-full object-cover" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">
            Taskflow<span className="text-amber-500">.</span>
          </span>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          {!tempToken ? (
            <>
              <h1 className="text-xl font-bold text-zinc-100 mb-1">Sign in</h1>
              <p className="text-sm text-zinc-500 mb-7">Access your workspace</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs font-medium transition"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 mt-2 rounded-xl font-bold text-sm text-black bg-amber-500 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : "Sign in"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-zinc-100 mb-1">Two-factor authentication</h1>
              <p className="text-sm text-zinc-500 mb-7">Enter the 6-digit code from your authenticator app, or a backup code.</p>

              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                    Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="123456"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-600 text-sm tracking-[0.3em] text-center focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 mt-2 rounded-xl font-bold text-sm text-black bg-amber-500 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {loading ? "Verifying..." : "Verify"}
                </button>

                <button
                  type="button"
                  onClick={() => { setTempToken(null); setCode(""); }}
                  className="w-full text-center text-sm text-zinc-500 hover:text-zinc-300 transition"
                >
                  Back to sign in
                </button>
              </form>
            </>
          )}
        </div>

        {!tempToken && (
          <p className="text-center text-sm text-zinc-600 mt-5">
            No account?{" "}
            <Link to="/register" className="text-amber-500 hover:text-amber-400 font-semibold transition">
              Create one
            </Link>
            {" · "}
            <Link to="/forgot-password" className="text-amber-500 hover:text-amber-400 font-semibold transition">
              Forgot password?
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
