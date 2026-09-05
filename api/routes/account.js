const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Todo = require("../models/Todo");
const Project = require("../models/Project");
const Note = require("../models/Note");
const Document = require("../models/Document");
const User = require("../models/User");

// Export everything the user owns as one JSON file
router.get("/export", protect, async (req, res) => {
  try {
    const [user, todos, projects, notes, documents] = await Promise.all([
      User.findById(req.user).select("-password"),
      Todo.find({ user: req.user }),
      Project.find({ user: req.user }),
      Note.find({ user: req.user }),
      Document.find({ user: req.user }).select("-publicId"),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      account: user,
      todos,
      projects,
      notes,
      documents,
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", 'attachment; filename="taskflow-export.json"');
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ message: "Failed to export your data" });
  }
});

module.exports = router;
