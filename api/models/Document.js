const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  originalName: { type: String, required: true },
  fileType: { type: String, enum: ["image", "pdf"], required: true },
  resourceType: { type: String, enum: ["image", "raw"], required: true },
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  bytes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Document", documentSchema);
