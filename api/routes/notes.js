const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Note = require("../models/Note");

// GET all notes for user (pinned first, then most recently updated)
router.get("/", protect, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user }).sort({ pinned: -1, updatedAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notes" });
  }
});

// POST create note
router.post("/", protect, async (req, res) => {
  try {
    const title = req.body?.title?.trim();
    if (!title) return res.status(400).json({ message: "Title is required" });

    const note = await Note.create({
      user: req.user,
      title,
      body: req.body?.body || "",
      tags: Array.isArray(req.body?.tags) ? req.body.tags : [],
      project: req.body?.project || null,
    });
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: "Error creating note" });
  }
});

// PUT update note - ensures user owns it
router.put("/:id", protect, async (req, res) => {
  try {
    const { title, body, tags, project, pinned } = req.body || {};
    const update = { updatedAt: new Date() };
    if (title !== undefined) update.title = title.trim();
    if (body !== undefined) update.body = body;
    if (tags !== undefined) update.tags = tags;
    if (project !== undefined) update.project = project || null;
    if (pinned !== undefined) update.pinned = pinned;

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user },
      update,
      { new: true }
    );
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: "Error updating note" });
  }
});

// DELETE note - ensures user owns it
router.delete("/:id", protect, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user });
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json({ message: "Note deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting note" });
  }
});

module.exports = router;
