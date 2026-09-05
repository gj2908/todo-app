const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tokenId: { type: String, required: true, unique: true },
  userAgent: { type: String, default: "" },
  browser: { type: String, default: "" },
  os: { type: String, default: "" },
  ip: { type: String, default: "" },
  city: { type: String, default: "" },
  country: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  revokedAt: { type: Date, default: null },
});

sessionSchema.index({ user: 1, revokedAt: 1 });

module.exports = mongoose.model("Session", sessionSchema);
