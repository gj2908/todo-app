const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Todo = require("../models/Todo");
const { sendDigestEmail, sendWeeklyRecapEmail, getAppBaseUrl } = require("../utils/email");
const { sendPushToUser, vapidConfigured } = require("../utils/pushNotify");

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
          const pushResult = await sendPushToUser(user, {
            title: `${dueToday.length} due today${overdue.length ? `, ${overdue.length} overdue` : ""}`,
            body: [...dueToday, ...overdue].slice(0, 3).map((t) => t.title).join(", "),
          });
          results.pushesSent += pushResult.sent;
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

// Once-weekly recap: emails a summary of what was completed this week and
// what's due in the coming week, to every user who opted into email
// notifications. Triggered by Vercel Cron.
router.get("/weekly-recap", requireCronSecret, async (req, res) => {
  const results = { usersChecked: 0, emailsSent: 0, errors: [] };

  try {
    const users = await User.find({ notifyByEmail: true });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeekAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfWeekAhead = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const user of users) {
      results.usersChecked++;
      try {
        const completedThisWeek = await Todo.find({
          user: user._id,
          completed: true,
          updatedAt: { $gte: startOfWeekAgo },
        });
        const dueNextWeek = await Todo.find({
          user: user._id,
          completed: false,
          deletedAt: null,
          dueDate: { $gte: startOfToday, $lt: startOfWeekAhead },
        });

        if (completedThisWeek.length === 0 && dueNextWeek.length === 0) continue;

        const result = await sendWeeklyRecapEmail(user.email, { completedThisWeek, dueNextWeek, appUrl: getAppBaseUrl() });
        if (result.sent) results.emailsSent++;
      } catch (err) {
        results.errors.push({ user: user.email, message: err?.message });
      }
    }

    res.json(results);
  } catch (error) {
    console.error("Weekly recap error:", error);
    res.status(500).json({ message: "Failed to run weekly recap" });
  }
});

// Sends a generic test push to every user with an active push subscription,
// regardless of due tasks. Manually triggered (not on the Vercel Cron
// schedule) - for verifying push delivery end-to-end.
router.get("/test-notification", requireCronSecret, async (req, res) => {
  const results = { subscribersChecked: 0, pushesSent: 0, pushesFailed: 0, subscriptionsPruned: 0, errors: [] };

  if (!vapidConfigured) {
    return res.status(500).json({ message: "VAPID keys are not configured" });
  }

  try {
    const users = await User.find({
      notifyByPush: true,
      "pushSubscriptions.0": { $exists: true },
    });

    const payload = {
      title: "Taskflow test notification",
      body: "If you can see this, push notifications are working.",
    };

    for (const user of users) {
      results.subscribersChecked++;
      try {
        const pushResult = await sendPushToUser(user, payload);
        results.pushesSent += pushResult.sent;
        results.pushesFailed += pushResult.failed;
        results.subscriptionsPruned += pushResult.pruned;
      } catch (err) {
        results.errors.push({ user: user.email, message: err?.message });
      }
    }

    res.json(results);
  } catch (error) {
    console.error("Test notification error:", error);
    res.status(500).json({ message: "Failed to send test notifications" });
  }
});

module.exports = router;
