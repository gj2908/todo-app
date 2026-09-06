const webpush = require("web-push");

const vapidConfigured = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY;
if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Sends `payload` to every push subscription on `user`, pruning any that the
// browser has unsubscribed from (404/410) and persisting that prune. Mutates
// and saves `user` in place when subscriptions were dropped.
const sendPushToUser = async (user, payload) => {
  const result = { sent: 0, failed: 0, pruned: 0 };
  if (!vapidConfigured || !user.pushSubscriptions?.length) return result;

  const serialized = JSON.stringify(payload);
  const stillValid = [];

  for (const sub of user.pushSubscriptions) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await webpush.sendNotification(sub, serialized);
      stillValid.push(sub);
      result.sent++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        result.pruned++;
      } else {
        stillValid.push(sub);
        result.failed++;
      }
    }
  }

  if (stillValid.length !== user.pushSubscriptions.length) {
    user.pushSubscriptions = stillValid;
    await user.save();
  }

  return result;
};

module.exports = { sendPushToUser, vapidConfigured };
