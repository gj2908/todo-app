import { useState, useEffect } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import TodoItem from "../components/TodoItem";
import TodoModal from "../components/TodoModal";
import SearchFilter from "../components/SearchFilter";
import { isToday, isPast } from "date-fns";

interface Todo {
  _id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  category: string;
  dueDate?: string;
  tags?: string[];
  project?: string;
  createdAt: string;
}

export default function HomePage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [activeView, setActiveView] = useState("inbox");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState("dueDate");
  const [loading, setLoading] = useState(true);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/todos");
      setTodos(res.data);
    } catch (error) {
      toast.error("Failed to fetch todos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const getFilteredTodos = () => {
    let filtered = [...todos];

    // Filter by project
    if (activeView.startsWith("project_")) {
      const projectId = activeView.replace("project_", "");
      filtered = filtered.filter((t) => t.project === projectId);
    }

    // Filter by view
    if (activeView === "today") {
      filtered = filtered.filter(
        (t) => t.dueDate && isToday(new Date(t.dueDate)) && !t.completed,
      );
    } else if (activeView === "upcoming") {
      filtered = filtered.filter(
        (t) =>
          t.dueDate &&
          !isToday(new Date(t.dueDate)) &&
          !isPast(new Date(t.dueDate)) &&
          !t.completed,
      );
    } else if (activeView === "completed") {
      filtered = filtered.filter((t) => t.completed);
    } else if (activeView === "inbox") {
      filtered = filtered.filter((t) => !t.completed);
    }

    // Search filter
    if (search) {
      filtered = filtered.filter((t) =>
        t.title.toLowerCase().includes(search.toLowerCase()),
      );
    }

    // Priority filter
    if (priorityFilter) {
      filtered = filtered.filter((t) => t.priority === priorityFilter);
    }

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter((t) => t.category === categoryFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sort === "dueDate") {
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return aDate - bDate;
      }
      if (sort === "priority") {
        const priorityOrder: { [key: string]: number } = {
          high: 1,
          medium: 2,
          low: 3,
        };
        return (
          (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4)
        );
      }
      if (sort === "newest") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      if (sort === "oldest") {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
      return 0;
    });

    return filtered;
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    try {
      await axios.put(`/todos/${id}`, { completed });
      setTodos(todos.map((t) => (t._id === id ? { ...t, completed } : t)));
      toast.success(
        completed ? "✨ Task completed! Great job!" : "📝 Task reopened",
      );
    } catch (error) {
      toast.error("Failed to update todo");
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await axios.delete(`/todos/${id}`);
      setTodos(todos.filter((t) => t._id !== id));
      toast.success("🗑️ Task deleted!");
    } catch (error) {
      toast.error("Failed to delete todo");
    }
  };

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setIsModalOpen(true);
  };

  const handleSaveTodo = async () => {
    fetchTodos();
  };

  const handleViewChange = (view: string) => {
    setActiveView(view);
    setSelectedProject(null);
    setSearch("");
    setPriorityFilter("");
    setCategoryFilter("");
  };

  const handleProjectSelect = (projectId: string) => {
    setActiveView(`project_${projectId}`);
    setSelectedProject(projectId);
  };

  const filteredTodos = getFilteredTodos();

  const getViewTitle = () => {
    const titles: { [key: string]: string } = {
      inbox: "📬 Inbox",
      today: "📅 Today",
      upcoming: "🗓️ Upcoming",
      completed: "✅ Completed",
    };
    return titles[activeView] || "Tasks";
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          onProjectSelect={handleProjectSelect}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-4xl font-bold text-gray-800 dark:text-white">
                  {getViewTitle()}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  {filteredTodos.length} of {todos.length} tasks
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingTodo(null);
                  setIsModalOpen(true);
                }}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white px-8 py-3 rounded-lg transition font-bold flex items-center gap-2 shadow-lg hover:shadow-xl text-lg"
              >
                <span>➕</span> Add New Task
              </button>
            </div>

            {/* Search & Filters */}
            <SearchFilter
              onSearch={setSearch}
              onFilterPriority={setPriorityFilter}
              onFilterCategory={setCategoryFilter}
              onSort={setSort}
              totalTodos={todos.length}
            />
          </div>

          {/* Tasks List */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl mb-2 animate-spin">⏳</div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Loading tasks...
                  </p>
                </div>
              </div>
            ) : filteredTodos.length > 0 ? (
              <div className="space-y-3 max-w-5xl">
                {filteredTodos.map((todo) => (
                  <TodoItem
                    key={todo._id}
                    todo={todo}
                    onEdit={handleEditTodo}
                    onDelete={deleteTodo}
                    onToggle={toggleComplete}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-6xl mb-4">
                  {activeView === "completed" ? "✅" : "📭"}
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
                  {search
                    ? "No tasks match your search"
                    : activeView === "completed"
                      ? "No completed tasks yet"
                      : "No tasks here. Add one to get started!"}
                </p>
                {!search && activeView !== "completed" && (
                  <button
                    onClick={() => {
                      setEditingTodo(null);
                      setIsModalOpen(true);
                    }}
                    className="mt-6 px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition font-bold shadow-lg hover:shadow-xl text-lg flex items-center gap-2"
                  >
                    ➕ Create New Task
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <TodoModal
        isOpen={isModalOpen}
        todo={editingTodo}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTodo(null);
        }}
        onSave={handleSaveTodo}
        defaultProject={selectedProject}
      />
    </div>
  );
}
