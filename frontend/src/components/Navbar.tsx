import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "../axiosConfig";

interface NavbarProps {
  onClockClick?: () => void;
  onMenuClick?: () => void;
  menuOpen?: boolean;
}

const MenuIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export default function Navbar({ onClockClick, onMenuClick, menuOpen = false }: NavbarProps) {
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
    axios.post("/auth/logout").catch(() => {});
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
      <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 gap-2">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          )}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate("/home")}
          >
          <div className="logo-mark w-9 h-9 rounded-lg overflow-hidden shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
            <img src="/favicon_io/android-chrome-192x192.png" alt="Taskflow" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight text-white">
            Taskflow<span className="text-amber-500">.</span>
          </span>
          </div>
        </div>

        {/* Center - clock, opens the Calendar view */}
        {onClockClick ? (
          <button
            onClick={onClockClick}
            title="Open calendar"
            className="hidden lg:flex flex-col items-center group"
          >
            <span className="text-xl font-mono font-bold text-white tabular-nums tracking-widest group-hover:text-amber-400 transition">
              {formatTime(currentTime)}
            </span>
            <span className="text-xs text-zinc-400 tracking-wider uppercase group-hover:text-amber-400 transition">
              {formatDate(currentTime)}
            </span>
          </button>
        ) : (
          <div className="hidden lg:flex flex-col items-center">
            <span className="text-xl font-mono font-bold text-white tabular-nums tracking-widest">
              {formatTime(currentTime)}
            </span>
            <span className="text-xs text-zinc-400 tracking-wider uppercase">
              {formatDate(currentTime)}
            </span>
          </div>
        )}

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
                  <p className="text-xs font-medium text-zinc-500">Signed in as</p>
                  <p className="text-sm font-semibold text-zinc-200 truncate mt-1">{userEmail}</p>
                </div>
                <button
                  onClick={() => {
                    navigate("/profile");
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:text-amber-400 hover:bg-zinc-800 transition"
                >
                  Profile
                </button>
                <button
                  onClick={() => {
                    navigate("/settings");
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:text-amber-400 hover:bg-zinc-800 transition"
                >
                  Settings
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
