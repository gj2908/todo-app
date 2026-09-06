import { useEffect, useState } from "react";
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
  ResponsiveContainer,
} from "recharts";
import axios from "../axiosConfig";

interface Todo {
  _id: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  category: string;
  dueDate?: string;
}

interface Subject {
  _id: string;
  name: string;
}

interface InsightsPanelProps {
  todos: Todo[];
  subjects?: Subject[];
}

const tooltipStyle = {
  background: "#18181b",
  border: "1px solid #3f3f46",
  borderRadius: 8,
  color: "#f4f4f5",
  fontSize: 13,
};

export default function InsightsPanel({ todos, subjects = [] }: InsightsPanelProps) {
  const [studyData, setStudyData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    axios.get(`/study-sessions?since=${since}`)
      .then((res) => {
        const bySubject = new Map<string, number>();
        res.data.forEach((s: any) => {
          const name = subjects.find((sub) => sub._id === s.subject)?.name || "No subject";
          bySubject.set(name, (bySubject.get(name) || 0) + s.durationMinutes);
        });
        setStudyData(Array.from(bySubject, ([name, value]) => ({ name, value })));
      })
      .catch(() => setStudyData([]));
  }, [subjects]);

  const stats = {
    total: todos.length,
    completed: todos.filter((t) => t.completed).length,
    pending: todos.filter((t) => !t.completed).length,
    overdue: todos.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && !t.completed).length,
    high: todos.filter((t) => t.priority === "high").length,
    medium: todos.filter((t) => t.priority === "medium").length,
    low: todos.filter((t) => t.priority === "low").length,
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const statusData = [
    { name: "Completed", value: stats.completed, fill: "#22c55e" },
    { name: "Pending", value: stats.pending, fill: "#f59e0b" },
    { name: "Overdue", value: stats.overdue, fill: "#ef4444" },
  ].filter((d) => d.value > 0);

  const priorityData = [
    { name: "High", value: stats.high, fill: "#ef4444" },
    { name: "Medium", value: stats.medium, fill: "#f59e0b" },
    { name: "Low", value: stats.low, fill: "#22c55e" },
  ];

  const categoryData = ["work", "personal", "shopping", "health", "general"]
    .map((cat) => ({ name: cat.charAt(0).toUpperCase() + cat.slice(1), value: todos.filter((t) => t.category === cat).length }))
    .filter((c) => c.value > 0);

  if (stats.total === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-10 text-center">
        <p className="text-zinc-400 font-semibold">Nothing to show yet</p>
        <p className="text-zinc-600 text-sm mt-1">Add a few tasks and your insights will show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs font-medium text-zinc-500">Total tasks</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs font-medium text-zinc-500">Completed</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{stats.completed}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs font-medium text-zinc-500">Pending</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{stats.pending}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs font-medium text-zinc-500">Overdue</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{stats.overdue}</p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-sm font-bold text-zinc-200 mb-3">Completion rate</p>
        <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{ width: `${completionRate}%` }} />
        </div>
        <p className="text-xs text-zinc-500 mt-2">{stats.completed} of {stats.total} tasks completed ({completionRate}%)</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm font-bold text-zinc-200 mb-3">Status</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm font-bold text-zinc-200 mb-3">Priority</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#27272a" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {priorityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {categoryData.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm font-bold text-zinc-200 mb-3">By category</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#27272a" }} />
              <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {studyData.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm font-bold text-zinc-200 mb-3">Study time this week (minutes)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={studyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#27272a" }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
