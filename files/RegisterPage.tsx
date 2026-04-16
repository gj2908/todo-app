import { useState } from "react";
import axios from "../axiosConfig";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const passwordStrength = (pwd: string) => {
    if (!pwd) return 0;
    let s = 0;
    if (pwd.length >= 6) s++;
    if (pwd.length >= 10) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    return s;
  };

  const strength = passwordStrength(password);
  const strengthColors = ["bg-zinc-700", "bg-red-500", "bg-amber-500", "bg-yellow-400", "bg-green-500"];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) { toast.error("Please fill in all fields"); return; }
    if (password !== confirmPassword) { toast.error("Passwords don't match"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }

    try {
      setLoading(true);
      await axios.post("/auth/register", { email, password });
      toast.success("Account created! Please sign in.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
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
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/40">
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="3" width="6" height="6" rx="1" fill="white" />
              <rect x="11" y="3" width="6" height="6" rx="1" fill="white" opacity="0.6" />
              <rect x="3" y="11" width="6" height="6" rx="1" fill="white" opacity="0.6" />
              <rect x="11" y="11" width="6" height="6" rx="1" fill="white" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">
            Taskflow<span className="text-amber-500">.</span>
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-xl font-bold text-zinc-100 mb-1">Create account</h1>
          <p className="text-sm text-zinc-500 mb-7">Start managing your tasks</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition pr-11"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs font-medium transition">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 flex gap-0.5">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColors[strength] : "bg-zinc-700"}`} />
                    ))}
                  </div>
                  <span className={`text-[10px] font-bold ${strengthColors[strength].replace("bg-", "text-")}`}>
                    {strengthLabels[strength]}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className={`w-full px-4 py-2.5 bg-zinc-800 border rounded-lg text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none transition ${
                  confirmPassword && confirmPassword !== password
                    ? "border-red-500 focus:border-red-500"
                    : "border-zinc-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                }`}
              />
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-red-400 mt-1">Passwords don't match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 rounded-xl font-bold text-sm text-black bg-amber-500 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-600 mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-amber-500 hover:text-amber-400 font-semibold transition">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
