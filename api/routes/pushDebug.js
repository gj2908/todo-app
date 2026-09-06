const express = require("express");
const router = express.Router();
const PushDebugLog = require("../models/PushDebugLog");

const requireCronSecret = (req, res, next) => {
  const provided = req.header("Authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Intentionally unauthenticated - called from the service worker's push
// handler, which has no way to attach a user session or app secret. Payload
// is minimal (a stage label + user agent), nothing sensitive.
router.post("/", async (req, res) => {
  try {
    const { stage, note } = req.body || {};
    if (!stage) return res.status(400).json({ message: "stage is required" });
    await PushDebugLog.create({
      stage: String(stage).slice(0, 100),
      note: String(note || "").slice(0, 500),
      userAgent: req.header("User-Agent") || "",
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

router.get("/", requireCronSecret, async (req, res) => {
  const logs = await PushDebugLog.find().sort({ createdAt: -1 }).limit(20);
  res.json(logs);
});

router.delete("/", requireCronSecret, async (req, res) => {
  await PushDebugLog.deleteMany({});
  res.json({ ok: true });
});

module.exports = router;
