const mongoose = require("mongoose");

// Temporary diagnostic log: the service worker beacons here at each stage of
// handling a push event, so push-delivery failures that happen entirely on
// the device (and would otherwise be invisible to the server) can actually
// be inspected. Safe to remove once push delivery is confirmed working.
const pushDebugLogSchema = new mongoose.Schema({
  stage: { type: String, required: true },
  note: { type: String, default: "" },
  userAgent: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PushDebugLog", pushDebugLogSchema);
