const mongoose = require("mongoose");
const todoSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  title: { type: String, required: true },
  description: String,
  completed: { type: Boolean, default: false },
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },
  category: { type: String, default: "general" },
  dueDate: Date,
  tags: [String],
  subtasks: [
    {
      title: { type: String, required: true },
      completed: { type: Boolean, default: false },
    },
  ],
  attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
  comments: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      text: { type: String, required: true },
      type: { type: String, enum: ["comment", "activity"], default: "comment" },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  recurrence: {
    freq: { type: String, enum: ["daily", "weekly", "monthly"] },
    interval: { type: Number, default: 1 },
    until: Date,
  },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model("Todo", todoSchema);
