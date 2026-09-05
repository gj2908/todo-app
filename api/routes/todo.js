const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Todo = require("../models/Todo");

// GET all todos for user (excludes trashed)
router.get("/", protect, async (req, res) => {
  try {
    const todos = await Todo.find({ user: req.user, deletedAt: null })
      .sort({ createdAt: -1 })
      .populate("attachments", "title url fileType");
    res.json(todos);
  } catch (error) {
    res.status(500).json({ message: "Error fetching todos" });
  }
});

// GET trashed todos
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
    const todo = new Todo({ ...req.body, user: req.user });
    await todo.save();
    res.json(todo);
  } catch (error) {
    res.status(500).json({ message: "Error creating todo" });
  }
});

// PUT update todo - ensures user owns it
router.put("/:id", protect, async (req, res) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      { _id: req.params.id, user: req.user },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!todo) return res.status(404).json({ message: "Todo not found" });
    res.json(todo);
  } catch (error) {
    res.status(500).json({ message: "Error updating todo" });
  }
});

// POST restore a trashed todo
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

// DELETE todo - moves to trash (ensures user owns it)
router.delete("/:id", protect, async (req, res) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      { _id: req.params.id, user: req.user },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!todo) return res.status(404).json({ message: "Todo not found" });
    res.json({ message: "Todo moved to trash" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting todo" });
  }
});

// DELETE permanently - only from trash
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
