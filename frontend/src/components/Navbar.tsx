import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserEmail(payload.email || "User");
      } catch {
        setUserEmail("User");
      }
    }
  }, [navigate]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDate = (d: Date) =>
    d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  return (
    <nav className="navbar-root border-b border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 gap-2">
        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate("/home")}
        >
          <div className="logo-mark w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-105 transition-transform">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="3" width="6" height="6" rx="1" fill="white" />
              <rect x="11" y="3" width="6" height="6" rx="1" fill="white" opacity="0.6" />
              <rect x="3" y="11" width="6" height="6" rx="1" fill="white" opacity="0.6" />
              <rect x="11" y="11" width="6" height="6" rx="1" fill="white" />
            </svg>
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight text-white">
            Taskflow<span className="text-amber-500">.</span>
          </span>
        </div>

        {/* Center - clock */}
        <div className="hidden lg:flex flex-col items-center">
          <span className="text-xl font-mono font-bold text-white tabular-nums tracking-widest">
            {formatTime(currentTime)}
          </span>
          <span className="text-xs text-zinc-400 tracking-wider uppercase">
            {formatDate(currentTime)}
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700">
            <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-black">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-zinc-300 max-w-[140px] truncate">{userEmail}</span>
          </div>

          <button
            onClick={() => navigate("/profile")}
            className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              location.pathname === "/profile"
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            Profile
          </button>

          <button
            onClick={handleLogout}
            className="px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
