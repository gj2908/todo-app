const express = require("express");
const router = express.Router();
const { addDays, addWeeks, addMonths, isAfter } = require("date-fns");
const { createEvents } = require("ics");
const { protect } = require("../middleware/auth");
const Todo = require("../models/Todo");
const { getAccessibleSubjects, isSubjectMember } = require("../utils/subjectAccess");

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
      .populate("attachments", "title url fileType")
      .populate("assignee", "name email");

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

// GET an .ics calendar file of the caller's accessible, dated todos (optionally scoped to ?ids=a,b,c)
router.get("/export.ics", protect, async (req, res) => {
  try {
    const accessibleSubjects = await getAccessibleSubjects(req.user);
    const subjectIds = accessibleSubjects.map((s) => s._id);

    const query = {
      deletedAt: null,
      dueDate: { $ne: null },
      $or: [{ user: req.user }, { subject: { $in: subjectIds } }],
    };
    if (req.query.ids) {
      query._id = { $in: String(req.query.ids).split(",").filter(Boolean) };
    }

    const todos = await Todo.find(query);

    const { error, value } = createEvents(
      todos.map((todo) => {
        const due = new Date(todo.dueDate);
        return {
          uid: `${todo._id}@taskflow`,
          title: todo.title,
          description: todo.description || undefined,
          start: [due.getUTCFullYear(), due.getUTCMonth() + 1, due.getUTCDate(), due.getUTCHours(), due.getUTCMinutes()],
          startInputType: "utc",
          duration: { minutes: 30 },
        };
      })
    );
    if (error) throw error;

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="taskflow.ics"');
    res.send(value);
  } catch (error) {
    res.status(500).json({ message: "Error generating calendar export" });
  }
});

// PATCH bulk-update todos the caller can write to
router.patch("/bulk", protect, async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    const update = req.body.update || {};
    if (ids.length === 0) return res.status(400).json({ message: "No todos specified" });

    const accessibleSubjects = await getAccessibleSubjects(req.user);
    const subjectIds = accessibleSubjects.map((s) => s._id);

    const candidates = await Todo.find({
      _id: { $in: ids },
      deletedAt: null,
      $or: [{ user: req.user }, { subject: { $in: subjectIds } }],
    });

    const writableIds = candidates
      .filter((todo) => canWrite(roleForTodo(todo, req.user, accessibleSubjects)))
      .map((todo) => todo._id);

    if (writableIds.length > 0) {
      await Todo.updateMany({ _id: { $in: writableIds } }, { ...update, updatedAt: new Date() });
    }

    res.json({ updated: writableIds.length, skipped: ids.length - writableIds.length });
  } catch (error) {
    res.status(500).json({ message: "Error updating todos" });
  }
});

// DELETE bulk soft-delete (moves to trash) todos the caller can write to
router.delete("/bulk", protect, async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (ids.length === 0) return res.status(400).json({ message: "No todos specified" });

    const accessibleSubjects = await getAccessibleSubjects(req.user);
    const subjectIds = accessibleSubjects.map((s) => s._id);

    const candidates = await Todo.find({
      _id: { $in: ids },
      deletedAt: null,
      $or: [{ user: req.user }, { subject: { $in: subjectIds } }],
    });

    const writableIds = candidates
      .filter((todo) => canWrite(roleForTodo(todo, req.user, accessibleSubjects)))
      .map((todo) => todo._id);

    if (writableIds.length > 0) {
      await Todo.updateMany({ _id: { $in: writableIds } }, { deletedAt: new Date() });
    }

    res.json({ updated: writableIds.length, skipped: ids.length - writableIds.length });
  } catch (error) {
    res.status(500).json({ message: "Error deleting todos" });
  }
});

// POST create todo
router.post("/", protect, async (req, res) => {
  try {
    let subject = null;
    if (req.body.subject) {
      const accessibleSubjects = await getAccessibleSubjects(req.user);
      subject = accessibleSubjects.find((s) => String(s._id) === String(req.body.subject));
      if (!subject || !canWrite(subject.role)) {
        return res.status(403).json({ message: "You don't have permission to add tasks to this subject" });
      }
    }

    if (req.body.assignee) {
      const eligible = subject ? isSubjectMember(subject, req.body.assignee) : String(req.body.assignee) === String(req.user);
      if (!eligible) {
        return res.status(400).json({ message: "Assignee must be a member of this subject" });
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

    if (req.body.assignee) {
      const finalSubjectId = req.body.subject !== undefined ? req.body.subject : existing.subject;
      const finalSubject = finalSubjectId
        ? accessibleSubjects.find((s) => String(s._id) === String(finalSubjectId))
        : null;
      const eligible = finalSubject
        ? isSubjectMember(finalSubject, req.body.assignee)
        : String(req.body.assignee) === String(req.user);
      if (!eligible) {
        return res.status(400).json({ message: "Assignee must be a member of this subject" });
      }
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
