const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Subject = require("../models/Subject");
const User = require("../models/User");
const { getAccessibleSubjects } = require("../utils/subjectAccess");

// GET all subjects the user owns or is a member of
router.get("/", protect, async (req, res) => {
  try {
    const subjects = await getAccessibleSubjects(req.user);
    subjects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(subjects);
  } catch {
    res.status(500).json({ message: "Error fetching subjects" });
  }
});

// POST create subject
router.post("/", protect, async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Subject name required" });
    const subject = new Subject({ name: name.trim(), icon, color, user: req.user });
    await subject.save();
    res.json({ ...subject.toObject(), role: "owner" });
  } catch {
    res.status(500).json({ message: "Error creating subject" });
  }
});

// PUT update subject - owner only
router.put("/:id", protect, async (req, res) => {
  try {
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, user: req.user },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.json(subject);
  } catch {
    res.status(500).json({ message: "Error updating subject" });
  }
});

// DELETE subject - owner only
router.delete("/:id", protect, async (req, res) => {
  try {
    const subject = await Subject.findOneAndDelete({ _id: req.params.id, user: req.user });
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.json({ message: "Subject deleted" });
  } catch {
    res.status(500).json({ message: "Error deleting subject" });
  }
});

// GET members of a subject (owner or member)
router.get("/:id/members", protect, async (req, res) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      $or: [{ user: req.user }, { "members.user": req.user }],
    }).populate("members.user", "email");
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    res.json(
      subject.members.map((m) => ({
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

    const subject = await Subject.findOne({ _id: req.params.id, user: req.user });
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    const invitee = await User.findOne({ email });
    if (!invitee) {
      return res.status(404).json({
        message: "No Taskflow account found for this email. Ask them to sign up, then invite again.",
      });
    }

    if (String(invitee._id) === String(req.user)) {
      return res.status(400).json({ message: "You already own this subject" });
    }
    if (subject.members.some((m) => String(m.user) === String(invitee._id))) {
      return res.status(400).json({ message: "Already a member of this subject" });
    }

    subject.members.push({ user: invitee._id, role });
    await subject.save();
    res.json({ message: "Member added", userId: invitee._id, email: invitee.email, role });
  } catch (error) {
    console.error("Invite member error:", error);
    res.status(500).json({ message: "Failed to invite member" });
  }
});

// DELETE remove a member - owner only
router.delete("/:id/members/:userId", protect, async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, user: req.user });
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    subject.members = subject.members.filter((m) => String(m.user) !== req.params.userId);
    await subject.save();
    res.json({ message: "Member removed" });
  } catch {
    res.status(500).json({ message: "Failed to remove member" });
  }
});

module.exports = router;
