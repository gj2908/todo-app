import { useNavigate } from "react-router-dom";
import DarkModeToggle from "./DarkModeToggle";
import { useState, useEffect } from "react";

export default function Navbar() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg dark:from-blue-800 dark:to-blue-700">
      {/* Top Row: Logo and Title */}
      <div className="flex items-center justify-between p-3 border-b border-white border-opacity-20">
        <h1
          className="text-2xl font-bold cursor-pointer hover:text-blue-100 transition flex items-center gap-2"
          onClick={() => navigate("/home")}
        >
          <span className="text-3xl">📝</span> Todo App
        </h1>
        <DarkModeToggle />
      </div>

      {/* Bottom Row: User Info and Buttons */}
      <div className="flex items-center justify-center gap-3 p-3 flex-wrap">
        {/* User Email */}
        <div className="bg-white bg-opacity-25 px-4 py-2 rounded-lg font-semibold text-sm">
          👤 {userEmail}
        </div>

        {/* Dashboard Button */}
        <button
          onClick={() => navigate("/home")}
          className="bg-blue-400 hover:bg-blue-300 text-gray-900 font-bold px-5 py-2 rounded-lg text-sm transition transform hover:scale-105 shadow-md"
        >
          📊 Dashboard
        </button>

        {/* Profile Button */}
        <button
          onClick={() => navigate("/profile")}
          className="bg-blue-400 hover:bg-blue-300 text-gray-900 font-bold px-5 py-2 rounded-lg text-sm transition transform hover:scale-105 shadow-md"
        >
          👤 Profile
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-2 rounded-lg text-sm transition transform hover:scale-105 shadow-md"
        >
          🚪 Logout
        </button>
      </div>
    </nav>
  );
}
