import { useState, useEffect, useMemo, useRef } from "react";
import axios from "../axiosConfig";
import { toast } from "react-toastify";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import TodoItem from "../components/TodoItem";
import TodoModal from "../components/TodoModal";
import SearchFilter from "../components/SearchFilter";
import CalendarModal from "../components/CalendarModal";
import CalendarPanel from "../components/CalendarPanel";
import ReminderModal from "../components/ReminderModal";
import DocumentVault from "../components/DocumentVault";
import PersonalReminderModal from "../components/PersonalReminderModal";
import { isToday, isPast } from "date-fns";
import { getNotificationPermissionStatus, requestNotificationPermission, scheduleExactReminder, scheduleTaskReminder, sendNotification } from "../utils/notifications";

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

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const createReminderId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

interface Project {
  _id: string;
  name: string;
  icon: string;
  color: string;
}

interface PersonalReminder {
  id: string;
  title: string;
  dateTime: string;
  notes: string;
}

const PERSONAL_REMINDERS_KEY = "taskflow-personal-reminders";

export default function HomePage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeView, setActiveView] = useState(() => localStorage.getItem("activeView") || "inbox");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState("dueDate");
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showPersonalReminderModal, setShowPersonalReminderModal] = useState(false);
  const [personalReminders, setPersonalReminders] = useState<PersonalReminder[]>(() => {
    try {
      const saved = localStorage.getItem(PERSONAL_REMINDERS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [reminderMinutes, setReminderMinutes] = useState(() => {
    const saved = localStorage.getItem("reminderMinutesBefore");
    return saved ? Number(saved) : 15;
  });
  const [notificationReady, setNotificationReady] = useState(false);
  const scheduledRef = useRef<number[]>([]);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/todos");
      setTodos(res.data);
    } catch {
      toast.error("Failed to fetch todos");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await axios.get("/projects");
      setProjects(res.data);
    } catch {
      console.error("Failed to fetch projects");
    }
  };

  useEffect(() => { 
    fetchTodos();
    fetchProjects();
  }, []);

  useEffect(() => {
    const handleProjectsChanged = () => {
      fetchProjects();
    };

    window.addEventListener("projects:changed", handleProjectsChanged);
    return () => window.removeEventListener("projects:changed", handleProjectsChanged);
  }, []);

  useEffect(() => {
    localStorage.setItem("activeView", activeView);
  }, [activeView]);

  useEffect(() => {
    localStorage.setItem("reminderMinutesBefore", String(reminderMinutes));
  }, [reminderMinutes]);

  useEffect(() => {
    localStorage.setItem(PERSONAL_REMINDERS_KEY, JSON.stringify(personalReminders));
  }, [personalReminders]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const todoCounts = useMemo(() => ({
    inbox:     todos.filter(t => !t.completed).length,
    today:     todos.filter(t => t.dueDate && isToday(new Date(t.dueDate)) && !t.completed).length,
    upcoming:  todos.filter(t => t.dueDate && !isToday(new Date(t.dueDate)) && !isPast(new Date(t.dueDate)) && !t.completed).length,
    completed: todos.filter(t => t.completed).length,
  }), [todos]);

  const reminderTodos = useMemo(() => {
    const now = Date.now();
    const in24h = now + 24 * 60 * 60 * 1000;
    return todos.filter((t) => {
      if (!t.dueDate || t.completed) return false;
      const due = new Date(t.dueDate).getTime();
      return due >= now && due <= in24h;
    });
  }, [todos]);

  useEffect(() => {
    setNotificationReady(getNotificationPermissionStatus() === "granted");
  }, []);

  useEffect(() => {
    scheduledRef.current.forEach((id) => window.clearTimeout(id));
    scheduledRef.current = [];

    if (!notificationReady) return;

    reminderTodos.forEach((todo) => {
      if (!todo.dueDate) return;
      const timeoutId = scheduleTaskReminder(todo.title, new Date(todo.dueDate), reminderMinutes);
      if (timeoutId) scheduledRef.current.push(timeoutId as unknown as number);
    });

    personalReminders.forEach((reminder) => {
      const timeoutId = scheduleExactReminder(reminder.title, new Date(reminder.dateTime), reminder.notes || undefined);
      if (timeoutId) scheduledRef.current.push(timeoutId as unknown as number);
    });

    return () => {
      scheduledRef.current.forEach((id) => window.clearTimeout(id));
      scheduledRef.current = [];
    };
  }, [reminderTodos, reminderMinutes, personalReminders, notificationReady]);

  const getFilteredTodos = () => {
    let filtered = [...todos];

    if (activeView.startsWith("project_")) {
      const projectId = activeView.replace("project_", "");
      filtered = filtered.filter(t => t.project === projectId);
    } else if (activeView === "today") {
      filtered = filtered.filter(t => t.dueDate && isToday(new Date(t.dueDate)) && !t.completed);
    } else if (activeView === "upcoming") {
      filtered = filtered.filter(t => t.dueDate && !isToday(new Date(t.dueDate)) && !isPast(new Date(t.dueDate)) && !t.completed);
    } else if (activeView === "completed") {
      filtered = filtered.filter(t => t.completed);
    } else if (activeView === "calendar") {
      filtered = filtered.filter(t => !t.completed);
    } else if (activeView === "reminders") {
      filtered = filtered.filter((t) => {
        if (!t.dueDate || t.completed) return false;
        const due = new Date(t.dueDate).getTime();
        const now = Date.now();
        return due >= now && due <= now + 24 * 60 * 60 * 1000;
      });
    } else {
      filtered = filtered.filter(t => !t.completed);
    }

    if (search) filtered = filtered.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    if (priorityFilter) filtered = filtered.filter(t => t.priority === priorityFilter);
    if (categoryFilter) filtered = filtered.filter(t => t.category === categoryFilter);

    filtered.sort((a, b) => {
      if (sort === "dueDate") {
        return (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) -
               (b.dueDate ? new Date(b.dueDate).getTime() : Infinity);
      }
      if (sort === "priority") {
        const o: Record<string, number> = { high: 1, medium: 2, low: 3 };
        return (o[a.priority] || 4) - (o[b.priority] || 4);
      }
      if (sort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return 0;
    });

    return filtered;
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    try {
      await axios.put(`/todos/${id}`, { completed });
      setTodos(todos.map(t => t._id === id ? { ...t, completed } : t));
      toast.success(completed ? "Task completed!" : "Task reopened");
    } catch { toast.error("Failed to update task"); }
  };

  const deleteTodo = async (id: string) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await axios.delete(`/todos/${id}`);
      setTodos(todos.filter(t => t._id !== id));
      toast.success("Task deleted");
    } catch { toast.error("Failed to delete task"); }
  };

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo({ ...todo });
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingTodo(null);
    setIsModalOpen(true);
  };

  const handleAddReminder = () => {
    setShowPersonalReminderModal(true);
  };

  const handleSavePersonalReminder = (reminder: { title: string; dateTime: string; notes: string }) => {
    const nextReminder: PersonalReminder = {
      id: createReminderId(),
      title: reminder.title,
      dateTime: reminder.dateTime,
      notes: reminder.notes,
    };

    setPersonalReminders((prev) => [nextReminder, ...prev]);
    toast.success("Reminder saved");
  };

  const handleDeletePersonalReminder = (id: string) => {
    setPersonalReminders((prev) => prev.filter((reminder) => reminder.id !== id));
  };

  const handleSaveTodo = async () => { await fetchTodos(); };

  const handleViewChange = (view: string) => {
    setActiveView(view);
    setSelectedProject(null);
    setSearch("");
    setPriorityFilter("");
    setCategoryFilter("");
    setSidebarOpen(false);
  };

  const handleProjectSelect = (projectId: string) => {
    setActiveView(`project_${projectId}`);
    setSelectedProject(projectId);
    setSidebarOpen(false);
  };

  const getProjectName = (projectId: string | undefined) => {
    if (!projectId) return null;
    return projects.find(p => p._id === projectId)?.name || null;
  };

  const filteredTodos = getFilteredTodos();

  const viewTitles: Record<string, { label: string; desc: string }> = {
    inbox:     { label: "Inbox",     desc: "All active tasks" },
    today:     { label: "Today",     desc: "Tasks due today" },
    upcoming:  { label: "Upcoming",  desc: "Future tasks" },
    completed: { label: "Completed", desc: "Finished tasks" },
    calendar:  { label: "Calendar",  desc: "Monthly deadlines and due tasks" },
    reminders: { label: "Reminders", desc: "Tasks due in the next 24 hours" },
    vault: { label: "Document Vault", desc: "Upload and manage images and PDFs" },
  };

  const viewInfo = viewTitles[activeView] || { label: "Project", desc: "Project tasks" };
  const showCalendarPreview = ["inbox", "today", "upcoming", "completed"].includes(activeView);

  const stats = useMemo(() => {
    const overdueCount = todos.filter(t =>
      t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && !t.completed
    ).length;
    const rate = todos.length > 0 ? Math.round((todoCounts.completed / todos.length) * 100) : 0;
    return { overdueCount, rate };
  }, [todos, todoCounts]);

  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-950 overflow-hidden">
      <Navbar
        onDateClick={() => setShowCalendar(true)}
        onTimeClick={() => setShowReminderModal(true)}
        onNewTaskClick={handleAddNew}
        onMenuClick={() => setSidebarOpen((v) => !v)}
        menuOpen={sidebarOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:block">
          <Sidebar
            activeView={activeView}
            onViewChange={handleViewChange}
            onProjectSelect={handleProjectSelect}
            todoCounts={todoCounts}
            reminderCount={reminderTodos.length}
          />
        </div>

        <div
          className={`fixed inset-0 z-40 lg:hidden transition ${sidebarOpen ? "block" : "hidden"}`}
          aria-hidden={!sidebarOpen}
        >
          <div
            className={`absolute inset-0 bg-black/55 transition-opacity ${sidebarOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => setSidebarOpen(false)}
          />
          <div className={`absolute left-0 top-0 h-full transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
            <Sidebar
              activeView={activeView}
              onViewChange={handleViewChange}
              onProjectSelect={handleProjectSelect}
              todoCounts={todoCounts}
              reminderCount={reminderTodos.length}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 sm:px-6 pt-4 sm:pt-5">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  <span className="text-zinc-500">{todos.length} total</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  <span className="text-zinc-500">{todoCounts.completed} done</span>
                </div>
                {stats.overdueCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" />
                    <span className="text-red-400 font-semibold">{stats.overdueCount} overdue</span>
                  </div>
                )}
                {todos.length > 0 && (
                  <div className="flex items-center gap-2 ml-0 sm:ml-auto w-full sm:w-auto">
                    <div className="w-full sm:w-28 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-700"
                        style={{ width: `${stats.rate}%` }}
                      />
                    </div>
                    <span className="text-zinc-500 tabular-nums">{stats.rate}%</span>
                  </div>
                )}
              </div>

              <div className="mt-3 mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">{viewInfo.label}</h2>
              </div>

              {activeView !== "calendar" && (
                <SearchFilter
                  onSearch={setSearch}
                  onFilterPriority={setPriorityFilter}
                  onFilterCategory={setCategoryFilter}
                  onSort={setSort}
                  totalTodos={todos.length}
                />
              )}
            </div>

            <div className="p-4 sm:p-6 pt-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-8 h-8 border-2 border-zinc-800 border-t-amber-500 rounded-full animate-spin" />
                <p className="text-zinc-600 text-sm">Loading...</p>
              </div>
            ) : activeView === "calendar" ? (
              <div className="max-w-5xl">
                <CalendarPanel todos={todos} />
              </div>
            ) : activeView === "reminders" ? (
              <div className="max-w-5xl space-y-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                  <div className="space-y-3">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-zinc-300">
                    Notifications: {notificationReady ? "Enabled" : "Disabled"}
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">
                            Reminder time: {reminderMinutes} minutes before due date
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            const ok = await requestNotificationPermission();
                            setNotificationReady(ok);
                            if (ok) {
                              sendNotification("Taskflow reminders enabled", {
                                body: "You will receive due-date reminders in this browser.",
                              });
                            }
                          }}
                          className="rounded-lg bg-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700"
                        >
                          Enable
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                          <h3 className="text-sm font-bold text-zinc-100">Personal reminders</h3>
                          <p className="text-xs text-zinc-500 mt-1">Create reminders for a specific date and time.</p>
                        </div>
                        <button
                          onClick={handleAddReminder}
                          className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-black hover:bg-amber-400"
                        >
                          Add reminder
                        </button>
                      </div>

                      {personalReminders.length > 0 ? (
                        <div className="space-y-2">
                          {personalReminders.map((reminder) => (
                            <div key={reminder.id} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-zinc-100 truncate">{reminder.title}</p>
                                <p className="text-xs text-zinc-500 mt-0.5">{new Date(reminder.dateTime).toLocaleString()}</p>
                                {reminder.notes && <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{reminder.notes}</p>}
                              </div>
                              <button
                                onClick={() => handleDeletePersonalReminder(reminder.id)}
                                className="rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 shrink-0"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500">No personal reminders yet.</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                      <p className="text-sm font-semibold text-zinc-200 mb-2">Due reminders</p>
                      {filteredTodos.length > 0 ? (
                        <div className="space-y-2">
                          {filteredTodos.map(todo => (
                            <TodoItem
                              key={todo._id}
                              todo={todo}
                              projectName={getProjectName(todo.project)}
                              onEdit={handleEditTodo}
                              onDelete={deleteTodo}
                              onToggle={toggleComplete}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500">No reminders due in the next 24 hours.</p>
                      )}
                    </div>
                  </div>
                  <div className="hidden lg:block sticky top-4">
                    <CalendarPanel todos={todos} compact />
                  </div>
                </div>
              </div>
            ) : activeView === "vault" ? (
              <DocumentVault />
            ) : showCalendarPreview ? (
              <div className="w-full lg:grid lg:grid-cols-[minmax(360px,40%)_minmax(520px,60%)] lg:items-start lg:gap-4">
                {filteredTodos.length > 0 ? (
                  <div className="space-y-1.5 w-full">
                    {filteredTodos.map(todo => (
                      <TodoItem
                        key={todo._id}
                        todo={todo}
                        projectName={getProjectName(todo.project)}
                        onEdit={handleEditTodo}
                        onDelete={deleteTodo}
                        onToggle={toggleComplete}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[50vh] gap-4 px-2 w-full">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                        <rect x="4" y="6" width="20" height="18" rx="3" stroke="#52525b" strokeWidth="1.5" />
                        <path d="M9 14h10M9 18h7" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M9 6V4M19 6V4" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-zinc-400 font-semibold">
                        {search ? "No tasks match your search" : activeView === "completed" ? "No completed tasks" : "All clear"}
                      </p>
                      <p className="text-zinc-600 text-sm mt-1">
                        {search ? "Try a different search term" : activeView !== "completed" ? "Add a task to get started" : "Complete some tasks first"}
                      </p>
                    </div>
                    {!search && activeView !== "completed" && (
                      <button
                        onClick={handleAddNew}
                        className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20"
                      >
                        <PlusIcon />
                        Add Task
                      </button>
                    )}
                  </div>
                )}

                <div className="hidden lg:block sticky top-3">
                  <CalendarPanel todos={todos} compact />
                </div>
              </div>
            ) : filteredTodos.length > 0 ? (
              <div className="space-y-1.5 max-w-3xl">
                {filteredTodos.map(todo => (
                  <TodoItem
                    key={todo._id}
                    todo={todo}
                    projectName={getProjectName(todo.project)}
                    onEdit={handleEditTodo}
                    onDelete={deleteTodo}
                    onToggle={toggleComplete}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 px-2">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <rect x="4" y="6" width="20" height="18" rx="3" stroke="#52525b" strokeWidth="1.5" />
                    <path d="M9 14h10M9 18h7" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M9 6V4M19 6V4" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-zinc-400 font-semibold">
                    {search ? "No tasks match your search" : activeView === "completed" ? "No completed tasks" : "All clear"}
                  </p>
                  <p className="text-zinc-600 text-sm mt-1">
                    {search ? "Try a different search term" : activeView !== "completed" ? "Add a task to get started" : "Complete some tasks first"}
                  </p>
                </div>
                {!search && activeView !== "completed" && (
                  <button
                    onClick={handleAddNew}
                    className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20"
                  >
                    <PlusIcon />
                    Add Task
                  </button>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      <TodoModal
        isOpen={isModalOpen}
        todo={editingTodo}
        onClose={() => { setIsModalOpen(false); setEditingTodo(null); }}
        onSave={handleSaveTodo}
        defaultProject={selectedProject}
      />

      <CalendarModal
        isOpen={showCalendar}
        selectedDate={calendarDate}
        onSelect={(date) => setCalendarDate(date)}
        onClose={() => setShowCalendar(false)}
      />

      <ReminderModal
        isOpen={showReminderModal}
        defaultMinutes={reminderMinutes}
        onSave={(minutes) => {
          setReminderMinutes(minutes);
          toast.success(`Reminder set to ${minutes} minutes before due time`);
        }}
        onClose={() => setShowReminderModal(false)}
      />

      <PersonalReminderModal
        isOpen={showPersonalReminderModal}
        onSave={handleSavePersonalReminder}
        onClose={() => setShowPersonalReminderModal(false)}
      />
    </div>
  );
}
