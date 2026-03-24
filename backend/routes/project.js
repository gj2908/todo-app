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
    const projects = await Project.find({ user: req.user }).sort({
      createdAt: -1,
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: "Error fetching projects" });
  }
});

// POST create project
router.post("/", auth, async (req, res) => {
  try {
    const project = new Project({ ...req.body, user: req.user });
    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: "Error creating project" });
  }
});

// PUT update project
router.put("/:id", auth, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: "Error updating project" });
  }
});

// DELETE project
router.delete("/:id", auth, async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting project" });
  }
});

module.exports = router;
