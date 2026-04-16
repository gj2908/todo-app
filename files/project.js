const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Project = require("../models/Project");

// Auth middleware
const auth = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// GET all projects
router.get("/", auth, async (req, res) => {
  try {
    const projects = await Project.find({ user: req.user }).sort({ createdAt: -1 });
    res.json(projects);
  } catch {
    res.status(500).json({ message: "Error fetching projects" });
  }
});

// POST create project
router.post("/", auth, async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Project name required" });
    const project = new Project({ name: name.trim(), icon, color, user: req.user });
    await project.save();
    res.json(project);
  } catch {
    res.status(500).json({ message: "Error creating project" });
  }
});

// PUT update project - ownership check
router.put("/:id", auth, async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, user: req.user },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  } catch {
    res.status(500).json({ message: "Error updating project" });
  }
});

// DELETE project - ownership check
router.delete("/:id", auth, async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, user: req.user });
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json({ message: "Project deleted" });
  } catch {
    res.status(500).json({ message: "Error deleting project" });
  }
});

module.exports = router;
