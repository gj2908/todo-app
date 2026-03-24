import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "../axiosConfig";

interface TodoModalProps {
  isOpen: boolean;
  todo: any | null;
  onClose: () => void;
  onSave: (todo: any) => void;
  defaultProject?: string | null;
}

interface Project {
  _id: string;
  name: string;
  icon: string;
}

const TodoModal: React.FC<TodoModalProps> = ({
  isOpen,
  todo,
  onClose,
  onSave,
  defaultProject,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState({
    title: todo?.title || "",
    description: todo?.description || "",
    priority: todo?.priority || "medium",
    category: todo?.category || "general",
    dueDate: todo?.dueDate
      ? new Date(todo.dueDate).toISOString().split("T")[0]
      : "",
    tags: todo?.tags ? todo.tags.join(", ") : "",
    project: todo?.project || defaultProject || "",
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get("/projects");
      setProjects(res.data);
    } catch (error) {
      console.error("Failed to fetch projects");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Title is required!");
      return;
    }

    try {
      const payload = {
        ...formData,
        tags: formData.tags
          .split(",")
          .map((t: string) => t.trim())
          .filter((t: string) => t),
      };

      if (todo?._id) {
        // Update existing
        await axios.put(`/todos/${todo._id}`, payload);
        toast.success("Task updated!");
      } else {
        // Create new
        await axios.post("/todos", payload);
        toast.success("Task created!");
      }

      onSave(null);
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error saving task");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-2xl font-bold mb-4">
          {todo ? "Edit Task" : "Add New Task"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold mb-1">Title*</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter task title"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter description (optional)"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold mb-1">Priority</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold mb-1">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="general">General</option>
              <option value="work">Work</option>
              <option value="personal">Personal</option>
              <option value="shopping">Shopping</option>
              <option value="health">Health</option>
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-semibold mb-1">Project</label>
            <select
              name="project"
              value={formData.project}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No Project</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-semibold mb-1">Due Date</label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="e.g. urgent, work, important"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-3 rounded-lg transition font-semibold text-lg shadow-md"
            >
              ❌ Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-3 rounded-lg transition font-bold text-lg shadow-lg hover:shadow-xl"
            >
              ✅ {todo ? "Update Task" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TodoModal;
