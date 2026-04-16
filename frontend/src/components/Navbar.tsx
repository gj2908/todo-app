import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

interface NavbarProps {
  onDateClick?: () => void;
  onTimeClick?: () => void;
}

export default function Navbar({ onDateClick, onTimeClick }: NavbarProps) {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const menu = document.getElementById("profile-menu");
      const button = document.getElementById("profile-button");
      if (menu && !menu.contains(e.target as Node) && !button?.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDate = (d: Date) =>
    d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  const userInitials = userEmail.split("@")[0].slice(0, 2).toUpperCase() || "U";

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
          <button
            onClick={onTimeClick}
            className="text-xl font-mono font-bold text-white tabular-nums tracking-widest hover:text-amber-400 transition"
          >
            {formatTime(currentTime)}
          </button>
          <button
            onClick={onDateClick}
            className="text-xs text-zinc-400 tracking-wider uppercase hover:text-amber-400 transition"
          >
            {formatDate(currentTime)}
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="relative">
            <button
              id="profile-button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-9 h-9 rounded-lg bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-sm font-bold text-black transition cursor-pointer"
              title={userEmail}
            >
              {userInitials}
            </button>

            {/* Profile dropdown menu */}
            {showProfileMenu && (
              <div
                id="profile-menu"
                className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-zinc-800">
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Account</p>
                  <p className="text-sm font-semibold text-zinc-200 truncate mt-1">{userEmail}</p>
                </div>
                <button
                  onClick={() => {
                    navigate("/profile");
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:text-amber-400 hover:bg-zinc-800 transition"
                >
                  Profile Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 border-t border-zinc-800 transition"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
