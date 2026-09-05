const express = require("express");
const router = express.Router();
const { addDays, addWeeks, addMonths, isAfter } = require("date-fns");
const { protect } = require("../middleware/auth");
const Todo = require("../models/Todo");
const { getAccessibleProjects } = require("../utils/projectAccess");

const computeNextDueDate = (fromDate, recurrence) => {
  const interval = recurrence.interval || 1;
  if (recurrence.freq === "daily") return addDays(fromDate, interval);
  if (recurrence.freq === "weekly") return addWeeks(fromDate, interval);
  if (recurrence.freq === "monthly") return addMonths(fromDate, interval);
  return null;
};

// role the current user has on a todo: "owner" if they created it,
// otherwise their role on the todo's project (or null if neither)
const roleForTodo = (todo, userId, accessibleProjects) => {
  if (String(todo.user) === String(userId)) return "owner";
  if (!todo.project) return null;
  const project = accessibleProjects.find((p) => String(p._id) === String(todo.project));
  return project?.role || null;
};

const canWrite = (role) => role === "owner" || role === "editor";

// GET all todos the user owns or has access to via a shared project (excludes trashed)
router.get("/", protect, async (req, res) => {
  try {
    const accessibleProjects = await getAccessibleProjects(req.user);
    const projectIds = accessibleProjects.map((p) => p._id);

    const todos = await Todo.find({
      deletedAt: null,
      $or: [{ user: req.user }, { project: { $in: projectIds } }],
    })
      .sort({ createdAt: -1 })
      .populate("attachments", "title url fileType");

    res.json(todos);
  } catch (error) {
    res.status(500).json({ message: "Error fetching todos" });
  }
});

// GET trashed todos - personal only, regardless of project sharing
router.get("/trash", protect, async (req, res) => {
  try {
    const todos = await Todo.find({ user: req.user, deletedAt: { $ne: null } }).sort({ deletedAt: -1 });
    res.json(todos);
  } catch (error) {
    res.status(500).json({ message: "Error fetching trash" });
  }
});

// POST create todo
router.post("/", protect, async (req, res) => {
  try {
    if (req.body.project) {
      const accessibleProjects = await getAccessibleProjects(req.user);
      const project = accessibleProjects.find((p) => String(p._id) === String(req.body.project));
      if (!project || !canWrite(project.role)) {
        return res.status(403).json({ message: "You don't have permission to add tasks to this project" });
      }
    }

    const todo = new Todo({ ...req.body, user: req.user });
    await todo.save();
    res.json(todo);
  } catch (error) {
    res.status(500).json({ message: "Error creating todo" });
  }
});

// PUT update todo - owner or project editor
router.put("/:id", protect, async (req, res) => {
  try {
    const accessibleProjects = await getAccessibleProjects(req.user);
    const projectIds = accessibleProjects.map((p) => p._id);

    const existing = await Todo.findOne({
      _id: req.params.id,
      $or: [{ user: req.user }, { project: { $in: projectIds } }],
    });
    if (!existing) return res.status(404).json({ message: "Todo not found" });

    const role = roleForTodo(existing, req.user, accessibleProjects);
    if (!canWrite(role)) {
      return res.status(403).json({ message: "You only have view access to this task" });
    }

    const todo = await Todo.findOneAndUpdate(
      { _id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    const justCompleted = req.body.completed === true && !existing.completed;
    if (justCompleted && todo.recurrence?.freq && todo.dueDate) {
      const nextDueDate = computeNextDueDate(new Date(todo.dueDate), todo.recurrence);
      const withinRange = !todo.recurrence.until || !isAfter(nextDueDate, new Date(todo.recurrence.until));
      if (nextDueDate && withinRange) {
        await Todo.create({
          user: todo.user,
          project: todo.project,
          title: todo.title,
          description: todo.description,
          priority: todo.priority,
          category: todo.category,
          dueDate: nextDueDate,
          tags: todo.tags,
          subtasks: (todo.subtasks || []).map((s) => ({ title: s.title, completed: false })),
          recurrence: todo.recurrence,
        });
      }
    }

    res.json(todo);
  } catch (error) {
    res.status(500).json({ message: "Error updating todo" });
  }
});

// POST restore a trashed todo - owner only (trash is personal)
router.post("/:id/restore", protect, async (req, res) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      { _id: req.params.id, user: req.user },
      { deletedAt: null },
      { new: true }
    );
    if (!todo) return res.status(404).json({ message: "Todo not found" });
    res.json(todo);
  } catch (error) {
    res.status(500).json({ message: "Error restoring todo" });
  }
});

// DELETE todo - moves to trash (owner or project editor)
router.delete("/:id", protect, async (req, res) => {
  try {
    const accessibleProjects = await getAccessibleProjects(req.user);
    const projectIds = accessibleProjects.map((p) => p._id);

    const existing = await Todo.findOne({
      _id: req.params.id,
      $or: [{ user: req.user }, { project: { $in: projectIds } }],
    });
    if (!existing) return res.status(404).json({ message: "Todo not found" });

    const role = roleForTodo(existing, req.user, accessibleProjects);
    if (!canWrite(role)) {
      return res.status(403).json({ message: "You only have view access to this task" });
    }

    existing.deletedAt = new Date();
    await existing.save();
    res.json({ message: "Todo moved to trash" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting todo" });
  }
});

// DELETE permanently - only from trash, owner only
router.delete("/:id/permanent", protect, async (req, res) => {
  try {
    const todo = await Todo.findOneAndDelete({ _id: req.params.id, user: req.user, deletedAt: { $ne: null } });
    if (!todo) return res.status(404).json({ message: "Todo not found in trash" });
    res.json({ message: "Todo permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting todo" });
  }
});

module.exports = router;
