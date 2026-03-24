import { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const navigate = useNavigate();
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const res = await axios.get("/todos");
      setTodos(res.data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch todos");
      setLoading(false);
    }
  };

  const stats = {
    total: todos.length,
    completed: todos.filter((t) => t.completed).length,
    pending: todos.filter((t) => !t.completed).length,
    overdue: todos.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && !t.completed,
    ).length,
    high: todos.filter((t) => t.priority === "high").length,
    medium: todos.filter((t) => t.priority === "medium").length,
    low: todos.filter((t) => t.priority === "low").length,
  };

  const categoryData = [
    { name: "Work", value: todos.filter((t) => t.category === "work").length },
    {
      name: "Personal",
      value: todos.filter((t) => t.category === "personal").length,
    },
    {
      name: "Shopping",
      value: todos.filter((t) => t.category === "shopping").length,
    },
    {
      name: "Health",
      value: todos.filter((t) => t.category === "health").length,
    },
    {
      name: "General",
      value: todos.filter((t) => t.category === "general").length,
    },
  ].filter((c) => c.value > 0);

  const statusData = [
    { name: "Completed", value: stats.completed, fill: "#10b981" },
    { name: "Pending", value: stats.pending, fill: "#f59e0b" },
    { name: "Overdue", value: stats.overdue, fill: "#ef4444" },
  ];

  const priorityData = [
    { name: "High", value: stats.high, fill: "#ef4444" },
    { name: "Medium", value: stats.medium, fill: "#f59e0b" },
    { name: "Low", value: stats.low, fill: "#10b981" },
  ];

  const completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg">
        <h1 className="text-2xl font-bold">📊 Analytics Dashboard</h1>
        <button
          onClick={() => navigate("/todos")}
          className="bg-blue-400 hover:bg-blue-500 px-4 py-2 rounded-lg font-semibold transition"
        >
          Back to Todos
        </button>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
            <p className="text-gray-600 text-sm font-semibold">Total Todos</p>
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
            <p className="text-gray-600 text-sm font-semibold">Completed</p>
            <p className="text-3xl font-bold text-green-600">
              {stats.completed}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-yellow-500">
            <p className="text-gray-600 text-sm font-semibold">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">
              {stats.pending}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-red-500">
            <p className="text-gray-600 text-sm font-semibold">Overdue</p>
            <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h3 className="text-xl font-bold mb-4">📈 Completion Rate</h3>
          <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-400 to-blue-500 h-full rounded-full flex items-center justify-center text-white font-bold text-sm transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            >
              {completionRate > 5 && `${completionRate}%`}
            </div>
          </div>
          <p className="text-center text-gray-600 mt-2">
            {stats.completed} of {stats.total} tasks completed
          </p>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Status Pie Chart */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold mb-4">Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Priority Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold mb-4">Priority Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" radius={[8, 8, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        {categoryData.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold mb-4">Tasks by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="value"
                  fill="#3b82f6"
                  name="Count"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border-2 border-red-200">
            <p className="text-sm font-semibold text-red-600 mb-1">
              🔴 High Priority
            </p>
            <p className="text-2xl font-bold text-red-700">{stats.high}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border-2 border-yellow-200">
            <p className="text-sm font-semibold text-yellow-600 mb-1">
              🟡 Medium Priority
            </p>
            <p className="text-2xl font-bold text-yellow-700">{stats.medium}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-200">
            <p className="text-sm font-semibold text-green-600 mb-1">
              🟢 Low Priority
            </p>
            <p className="text-2xl font-bold text-green-700">{stats.low}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
