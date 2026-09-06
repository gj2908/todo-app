const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const StudySession = require("../models/StudySession");

// POST log a completed study session
router.post("/", protect, async (req, res) => {
  try {
    const { subject, durationMinutes, startedAt } = req.body || {};
    if (!durationMinutes || durationMinutes <= 0) {
      return res.status(400).json({ message: "durationMinutes must be greater than 0" });
    }

    const session = await StudySession.create({
      user: req.user,
      subject: subject || null,
      durationMinutes,
      startedAt: startedAt ? new Date(startedAt) : new Date(),
    });

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: "Error logging study session" });
  }
});

// GET the caller's study sessions, optionally filtered by ?since=<ISO date>
router.get("/", protect, async (req, res) => {
  try {
    const query = { user: req.user };
    if (req.query.since) {
      query.startedAt = { $gte: new Date(req.query.since) };
    }

    const sessions = await StudySession.find(query).sort({ startedAt: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching study sessions" });
  }
});

module.exports = router;
