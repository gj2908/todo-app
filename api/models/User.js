const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },
  twoFactorSecret: { type: String, default: null, select: false },
  twoFactorEnabled: { type: Boolean, default: false },
  backupCodes: { type: [String], default: undefined, select: false },
  createdAt: { type: Date, default: Date.now },
  preferences: {
    darkMode: { type: Boolean, default: false },
    theme: { type: String, default: "light" },
  },
});
module.exports = mongoose.model("User", userSchema);
