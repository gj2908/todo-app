import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import Navbar from "../components/Navbar";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser(payload);
      } catch {
        navigate("/login");
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logged out successfully!");
    navigate("/login");
  };

  const handleChangePassword = async () => {
    const newPassword = prompt("Enter new password (min 6 characters):");
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      await axios.put("/auth/change-password", { password: newPassword });
      toast.success("Password changed successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />

      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-4xl">
              👤
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-800">User Profile</h2>
              <p className="text-gray-500">Manage your account settings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
              <p className="text-sm font-semibold text-gray-600 mb-2">
                User ID
              </p>
              <p className="text-lg font-bold text-gray-800 break-all">
                {user.id}
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
              <p className="text-sm font-semibold text-gray-600 mb-2">Email</p>
              <p className="text-lg font-bold text-gray-800">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-bold transition transform hover:scale-105"
            >
              🔐 Change Password
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-bold transition transform hover:scale-105"
            >
              🚪 Logout
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <p className="text-sm text-gray-600">
              ℹ️ Your todos are securely stored in our database and can be
              accessed anytime you log in with your credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
