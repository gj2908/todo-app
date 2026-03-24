import { useState } from "react";
import axios from "../axiosConfig";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState(
    () => localStorage.getItem("lastEmail") || "",
  );
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields!");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("lastEmail", email);
      toast.success("✅ Login successful!");
      navigate("/home");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "❌ Login failed!");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 relative overflow-hidden">
      {/* Animated background blobs */}
      <motion.div
        animate={{ x: [0, 50, 0], y: [0, 50, 0] }}
        transition={{ duration: 20, repeat: Infinity }}
        className="absolute top-10 right-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10"
      />
      <motion.div
        animate={{ x: [0, -50, 0], y: [0, -50, 0] }}
        transition={{ duration: 25, repeat: Infinity }}
        className="absolute bottom-10 left-10 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10"
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-t-4 border-blue-600">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-8 text-center">
            <motion.img
              src="/Todo-logo.png"
              alt="Todo Logo"
              className="h-20 w-20 rounded-full mx-auto mb-4 shadow-lg border-4 border-white"
              whileHover={{ scale: 1.1, rotate: 5 }}
            />
            <h1 className="text-4xl font-bold text-white mb-2">
              📝 Welcome Back
            </h1>
            <p className="text-blue-100 font-medium">
              Manage your tasks efficiently
            </p>
          </div>

          {/* Form section */}
          <form onSubmit={handleLogin} className="p-8 flex flex-col gap-6">
            <motion.div className="relative">
              <label className="block text-sm font-bold text-gray-800 mb-2 ml-1">
                📧 Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                className={`w-full px-5 py-3 rounded-lg border-2 font-medium transition duration-300 ${
                  focused === "email"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-300"
                    : "border-gray-300 hover:border-blue-400"
                }`}
              />
            </motion.div>

            <motion.div className="relative">
              <label className="block text-sm font-bold text-gray-800 mb-2 ml-1">
                🔐 Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  className={`w-full px-5 py-3 rounded-lg border-2 font-medium transition duration-300 pr-12 ${
                    focused === "password"
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-300"
                      : "border-gray-300 hover:border-blue-400"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-600 hover:text-blue-600 text-lg"
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </motion.div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-3 rounded-lg hover:shadow-lg hover:shadow-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 mt-2"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    ⏳
                  </motion.div>
                  Logging in...
                </span>
              ) : (
                "🚀 Login"
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <div className="px-8 pb-8 text-center border-t border-gray-200">
            <p className="text-gray-700 text-sm font-medium">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-bold text-blue-600 hover:text-blue-700 transition hover:underline"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
