const express = require("express");
const router = express.Router();
const webpush = require("web-push");
const User = require("../models/User");
const Todo = require("../models/Todo");
const { sendDigestEmail, getAppBaseUrl } = require("../utils/email");

const vapidConfigured = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY;
if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const requireCronSecret = (req, res, next) => {
  const provided = req.header("Authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Once-daily digest: emails and/or pushes a summary of due-today + overdue
// tasks to every user who has opted in. Triggered by Vercel Cron.
router.get("/daily-digest", requireCronSecret, async (req, res) => {
  const results = { usersChecked: 0, emailsSent: 0, pushesSent: 0, errors: [] };

  try {
    const users = await User.find({
      $or: [{ notifyByEmail: true }, { notifyByPush: true }],
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    for (const user of users) {
      results.usersChecked++;
      try {
        const todos = await Todo.find({ user: user._id, completed: false, deletedAt: null, dueDate: { $ne: null } });
        const dueToday = todos.filter((t) => t.dueDate >= startOfToday && t.dueDate < startOfTomorrow);
        const overdue = todos.filter((t) => t.dueDate < startOfToday);

        if (dueToday.length === 0 && overdue.length === 0) continue;

        if (user.notifyByEmail) {
          const result = await sendDigestEmail(user.email, { dueToday, overdue, appUrl: getAppBaseUrl() });
          if (result.sent) results.emailsSent++;
        }

        if (user.notifyByPush && user.pushSubscriptions?.length && vapidConfigured) {
          const payload = JSON.stringify({
            title: `${dueToday.length} due today${overdue.length ? `, ${overdue.length} overdue` : ""}`,
            body: [...dueToday, ...overdue].slice(0, 3).map((t) => t.title).join(", "),
          });

          const stillValid = [];
          for (const sub of user.pushSubscriptions) {
            try {
              // eslint-disable-next-line no-await-in-loop
              await webpush.sendNotification(sub, payload);
              stillValid.push(sub);
              results.pushesSent++;
            } catch (err) {
              // 404/410 means the browser unsubscribed - drop it, keep anything else
              if (err.statusCode !== 404 && err.statusCode !== 410) stillValid.push(sub);
            }
          }
          if (stillValid.length !== user.pushSubscriptions.length) {
            user.pushSubscriptions = stillValid;
            await user.save();
          }
        }
      } catch (err) {
        results.errors.push({ user: user.email, message: err?.message });
      }
    }

    res.json(results);
  } catch (error) {
    console.error("Daily digest error:", error);
    res.status(500).json({ message: "Failed to run daily digest" });
  }
});

module.exports = router;
