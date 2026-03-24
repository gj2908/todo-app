import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../axiosConfig";
import { toast } from "react-toastify";

interface Project {
  _id: string;
  name: string;
  icon: string;
  color: string;
}

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onProjectSelect?: (projectId: string) => void;
}

export default function Sidebar({
  activeView,
  onViewChange,
  onProjectSelect,
}: SidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      const res = await axios.get("/projects");
      setProjects(res.data);
    } catch (error) {
      console.error("Failed to fetch projects");
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error("Project name required!");
      return;
    }

    try {
      const res = await axios.post("/projects", {
        name: newProjectName,
        icon: "📁",
        color: "#3498db",
      });
      setProjects([res.data, ...projects]);
      setNewProjectName("");
      setShowNewProject(false);
      toast.success("Project created!");
    } catch (error) {
      toast.error("Failed to create project");
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (window.confirm("Delete this project?")) {
      try {
        await axios.delete(`/projects/${id}`);
        setProjects(projects.filter((p) => p._id !== id));
        toast.success("Project deleted!");
      } catch (error) {
        toast.error("Failed to delete project");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const menuItems = [
    { id: "inbox", label: "Inbox", icon: "📬" },
    { id: "today", label: "Today", icon: "📅" },
    { id: "upcoming", label: "Upcoming", icon: "🗓️" },
    { id: "completed", label: "Completed", icon: "✅" },
  ];

  return (
    <div className="w-64 bg-white shadow-lg h-screen flex flex-col border-r">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-3xl">📋</span>
          <h1 className="text-2xl font-bold text-gray-800">MyTodo</h1>
        </div>
        <button
          onClick={() => navigate("/profile")}
          className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Profile
        </button>
      </div>

      {/* Main Menu */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1 mb-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition ${
                activeView === item.id
                  ? "bg-blue-100 text-blue-600 font-semibold"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Projects Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between px-4 mb-3">
            <h3 className="font-semibold text-gray-700 text-sm">MY PROJECTS</h3>
            <button
              onClick={() => setShowNewProject(!showNewProject)}
              className="text-gray-500 hover:text-gray-700 text-lg"
            >
              +
            </button>
          </div>

          {/* New Project Form */}
          {showNewProject && (
            <div className="px-4 mb-3 space-y-2">
              <input
                type="text"
                placeholder="Project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === "Enter" && handleCreateProject()}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateProject}
                  className="flex-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNewProject(false)}
                  className="flex-1 px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Projects List */}
          <div className="space-y-1">
            {projects.map((project) => (
              <div
                key={project._id}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 group"
              >
                <span className="text-lg">{project.icon}</span>
                <button
                  onClick={() => onProjectSelect?.(project._id)}
                  className={`flex-1 text-left text-sm ${
                    activeView === project._id
                      ? "text-blue-600 font-semibold"
                      : "text-gray-700"
                  }`}
                >
                  {project.name}
                </button>
                <button
                  onClick={() => handleDeleteProject(project._id)}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-sm transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t p-4 space-y-2">
        <button
          onClick={handleLogout}
          className="w-full px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
