const express = require("express");
const router = express.Router();
const { addDays, addWeeks, addMonths, isAfter } = require("date-fns");
const { protect } = require("../middleware/auth");
const Todo = require("../models/Todo");
const { getAccessibleSubjects } = require("../utils/subjectAccess");

const computeNextDueDate = (fromDate, recurrence) => {
  const interval = recurrence.interval || 1;
  if (recurrence.freq === "daily") return addDays(fromDate, interval);
  if (recurrence.freq === "weekly") return addWeeks(fromDate, interval);
  if (recurrence.freq === "monthly") return addMonths(fromDate, interval);
  return null;
};

// role the current user has on a todo: "owner" if they created it,
// otherwise their role on the todo's subject (or null if neither)
const roleForTodo = (todo, userId, accessibleSubjects) => {
  if (String(todo.user) === String(userId)) return "owner";
  if (!todo.subject) return null;
  const subject = accessibleSubjects.find((s) => String(s._id) === String(todo.subject));
  return subject?.role || null;
};

const canWrite = (role) => role === "owner" || role === "editor";

// GET all todos the user owns or has access to via a shared subject (excludes trashed)
router.get("/", protect, async (req, res) => {
  try {
    const accessibleSubjects = await getAccessibleSubjects(req.user);
    const subjectIds = accessibleSubjects.map((s) => s._id);

    const todos = await Todo.find({
      deletedAt: null,
      $or: [{ user: req.user }, { subject: { $in: subjectIds } }],
    })
      .sort({ createdAt: -1 })
      .populate("attachments", "title url fileType");

    res.json(todos);
  } catch (error) {
    res.status(500).json({ message: "Error fetching todos" });
  }
});

// GET trashed todos - personal only, regardless of subject sharing
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
    if (req.body.subject) {
      const accessibleSubjects = await getAccessibleSubjects(req.user);
      const subject = accessibleSubjects.find((s) => String(s._id) === String(req.body.subject));
      if (!subject || !canWrite(subject.role)) {
        return res.status(403).json({ message: "You don't have permission to add tasks to this subject" });
      }
    }

    const todo = new Todo({ ...req.body, user: req.user });
    await todo.save();
    res.json(todo);
  } catch (error) {
    res.status(500).json({ message: "Error creating todo" });
  }
});

// PUT update todo - owner or subject editor
router.put("/:id", protect, async (req, res) => {
  try {
    const accessibleSubjects = await getAccessibleSubjects(req.user);
    const subjectIds = accessibleSubjects.map((s) => s._id);

    const existing = await Todo.findOne({
      _id: req.params.id,
      $or: [{ user: req.user }, { subject: { $in: subjectIds } }],
    });
    if (!existing) return res.status(404).json({ message: "Todo not found" });

    const role = roleForTodo(existing, req.user, accessibleSubjects);
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
          subject: todo.subject,
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

// DELETE todo - moves to trash (owner or subject editor)
router.delete("/:id", protect, async (req, res) => {
  try {
    const accessibleSubjects = await getAccessibleSubjects(req.user);
    const subjectIds = accessibleSubjects.map((s) => s._id);

    const existing = await Todo.findOne({
      _id: req.params.id,
      $or: [{ user: req.user }, { subject: { $in: subjectIds } }],
    });
    if (!existing) return res.status(404).json({ message: "Todo not found" });

    const role = roleForTodo(existing, req.user, accessibleSubjects);
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
