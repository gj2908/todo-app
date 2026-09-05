const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  originalName: { type: String, required: true },
  fileType: { type: String, enum: ["image", "pdf"], required: true },
  resourceType: { type: String, enum: ["image", "raw", "auto"], default: "image" },
  url: { type: String, required: true },
  publicId: { type: String, required: true, unique: true },
  bytes: { type: Number, default: 0 },
  uploadedVia: { type: String, enum: ["multipart"], default: "multipart" },
  kind: { type: String, enum: ["general", "note", "datesheet", "syllabus"], default: "general" },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", default: null },
  date: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Document", documentSchema);
