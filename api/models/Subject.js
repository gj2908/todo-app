const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  color: { type: String, default: "#3498db" },
  icon: { type: String, default: "📋" },
  members: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      role: { type: String, enum: ["editor", "viewer"], default: "editor" },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Keeps reading/writing the existing "projects" collection so no data
// migration is needed for this model when renaming Project -> Subject.
module.exports = mongoose.model("Subject", subjectSchema, "projects");
