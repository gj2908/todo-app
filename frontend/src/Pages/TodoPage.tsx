import { useState, useEffect } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import TodoItem from "../components/TodoItem";
import TodoModal from "../components/TodoModal";

export default function TodoPage() {
  const [todos, setTodos] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all / completed / pending
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sort, setSort] = useState("dueDate"); // dueDate / priority / newest
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<any | null>(null);

  const fetchTodos = async () => {
    try {
      const res = await axios.get("/todos");
      setTodos(res.data);
    } catch (error: any) {
      toast.error("Failed to fetch todos");
    }
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    try {
      await axios.put(`/todos/${id}`, { completed });
      setTodos(
        todos.map((todo) => (todo._id === id ? { ...todo, completed } : todo)),
      );
      toast.success(completed ? "Todo completed!" : "Todo marked pending!");
    } catch (error: any) {
      toast.error("Failed to update todo");
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await axios.delete(`/todos/${id}`);
      setTodos(todos.filter((todo) => todo._id !== id));
      toast.success("Todo deleted!");
    } catch (error: any) {
      toast.error("Failed to delete todo");
    }
  };

  const handleEditTodo = (todo: any) => {
    setEditingTodo(todo);
    setIsModalOpen(true);
  };

  const handleSaveTodo = async () => {
    fetchTodos();
  };

  // Filter and sort todos
  const filteredTodos = todos
    .filter((todo: any) => {
      if (statusFilter === "completed") return todo.completed;
      if (statusFilter === "pending") return !todo.completed;
      return true;
    })
    .filter((todo: any) => {
      if (priorityFilter === "all") return true;
      return todo.priority === priorityFilter;
    })
    .filter((todo: any) => {
      if (categoryFilter === "all") return true;
      return todo.category === categoryFilter;
    })
    .filter((todo: any) =>
      todo.title.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a: any, b: any) => {
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
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      // newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  useEffect(() => {
    fetchTodos();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">My Tasks</h1>
          <p className="text-gray-600">
            {filteredTodos.length} of {todos.length} tasks
          </p>
        </div>

        {/* Add Todo Button */}
        <button
          onClick={() => {
            setEditingTodo(null);
            setIsModalOpen(true);
          }}
          className="mb-6 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition font-semibold"
        >
          + Add New Task
        </button>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters and Sort */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Tasks</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Categories</option>
            <option value="work">Work</option>
            <option value="personal">Personal</option>
            <option value="shopping">Shopping</option>
            <option value="health">Health</option>
            <option value="general">General</option>
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="dueDate">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="newest">Sort by Newest</option>
          </select>
        </div>

        {/* Todo List */}
        <div className="space-y-3">
          {filteredTodos.length > 0 ? (
            filteredTodos.map((todo: any) => (
              <TodoItem
                key={todo._id}
                todo={todo}
                onEdit={handleEditTodo}
                onDelete={deleteTodo}
                onToggle={toggleComplete}
              />
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed">
              <p className="text-gray-500 text-lg">No tasks found</p>
              <p className="text-gray-400 text-sm mt-1">
                Try adjusting your filters or create a new task
              </p>
            </div>
          )}
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
        />
      </div>
    </div>
  );
}
