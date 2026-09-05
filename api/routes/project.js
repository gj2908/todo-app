const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Project = require("../models/Project");
const User = require("../models/User");
const { getAccessibleProjects } = require("../utils/projectAccess");

// GET all projects the user owns or is a member of
router.get("/", protect, async (req, res) => {
  try {
    const projects = await getAccessibleProjects(req.user);
    projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(projects);
  } catch {
    res.status(500).json({ message: "Error fetching projects" });
  }
});

// POST create project
router.post("/", protect, async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Project name required" });
    const project = new Project({ name: name.trim(), icon, color, user: req.user });
    await project.save();
    res.json({ ...project.toObject(), role: "owner" });
  } catch {
    res.status(500).json({ message: "Error creating project" });
  }
});

// PUT update project - owner only
router.put("/:id", protect, async (req, res) => {
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

// DELETE project - owner only
router.delete("/:id", protect, async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, user: req.user });
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json({ message: "Project deleted" });
  } catch {
    res.status(500).json({ message: "Error deleting project" });
  }
});

// GET members of a project (owner or member)
router.get("/:id/members", protect, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [{ user: req.user }, { "members.user": req.user }],
    }).populate("members.user", "email");
    if (!project) return res.status(404).json({ message: "Project not found" });

    res.json(
      project.members.map((m) => ({
        userId: m.user._id,
        email: m.user.email,
        role: m.role,
      }))
    );
  } catch {
    res.status(500).json({ message: "Error fetching members" });
  }
});

// POST invite a member by email - owner only, requires an existing account
router.post("/:id/invite", protect, async (req, res) => {
  try {
    const email = req.body?.email?.trim()?.toLowerCase();
    const role = req.body?.role === "viewer" ? "viewer" : "editor";
    if (!email) return res.status(400).json({ message: "Email is required" });

    const project = await Project.findOne({ _id: req.params.id, user: req.user });
    if (!project) return res.status(404).json({ message: "Project not found" });

    const invitee = await User.findOne({ email });
    if (!invitee) {
      return res.status(404).json({
        message: "No Taskflow account found for this email. Ask them to sign up, then invite again.",
      });
    }

    if (String(invitee._id) === String(req.user)) {
      return res.status(400).json({ message: "You already own this project" });
    }
    if (project.members.some((m) => String(m.user) === String(invitee._id))) {
      return res.status(400).json({ message: "Already a member of this project" });
    }

    project.members.push({ user: invitee._id, role });
    await project.save();
    res.json({ message: "Member added", userId: invitee._id, email: invitee.email, role });
  } catch (error) {
    console.error("Invite member error:", error);
    res.status(500).json({ message: "Failed to invite member" });
  }
});

// DELETE remove a member - owner only
router.delete("/:id/members/:userId", protect, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, user: req.user });
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.members = project.members.filter((m) => String(m.user) !== req.params.userId);
    await project.save();
    res.json({ message: "Member removed" });
  } catch {
    res.status(500).json({ message: "Failed to remove member" });
  }
});

module.exports = router;
