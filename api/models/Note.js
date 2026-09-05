const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  body: { type: String, default: "" },
  tags: [{ type: String }],
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
  pinned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Note", noteSchema);
