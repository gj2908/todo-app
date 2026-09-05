const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Todo = require("../models/Todo");
const Subject = require("../models/Subject");
const Note = require("../models/Note");
const Document = require("../models/Document");
const User = require("../models/User");

// Public VAPID key, used by the frontend to subscribe to push
router.get("/push-public-key", protect, (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
});

// Save a browser's push subscription
router.post("/push-subscribe", protect, async (req, res) => {
  try {
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: "Invalid push subscription" });
    }

    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.pushSubscriptions = (user.pushSubscriptions || []).filter((s) => s.endpoint !== endpoint);
    user.pushSubscriptions.push({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } });
    await user.save();

    res.json({ message: "Subscribed" });
  } catch (error) {
    console.error("Push subscribe error:", error);
    res.status(500).json({ message: "Failed to save push subscription" });
  }
});

// Remove a browser's push subscription
router.post("/push-unsubscribe", protect, async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    await User.findByIdAndUpdate(req.user, {
      $pull: { pushSubscriptions: { endpoint } },
    });
    res.json({ message: "Unsubscribed" });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    res.status(500).json({ message: "Failed to remove push subscription" });
  }
});

// Update notification preferences
router.put("/notification-preferences", protect, async (req, res) => {
  try {
    const update = {};
    if (typeof req.body?.notifyByEmail === "boolean") update.notifyByEmail = req.body.notifyByEmail;
    if (typeof req.body?.notifyByPush === "boolean") update.notifyByPush = req.body.notifyByPush;

    const user = await User.findByIdAndUpdate(req.user, update, { new: true }).select(
      "notifyByEmail notifyByPush"
    );
    res.json(user);
  } catch (error) {
    console.error("Notification preferences error:", error);
    res.status(500).json({ message: "Failed to update preferences" });
  }
});

// Export everything the user owns as one JSON file
router.get("/export", protect, async (req, res) => {
  try {
    const [user, todos, subjects, notes, documents] = await Promise.all([
      User.findById(req.user).select("-password"),
      Todo.find({ user: req.user }),
      Subject.find({ user: req.user }),
      Note.find({ user: req.user }),
      Document.find({ user: req.user }).select("-publicId"),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      account: user,
      todos,
      subjects,
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
