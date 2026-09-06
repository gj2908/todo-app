require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");

const app = express();
// Vercel's edge network sits as exactly one reverse-proxy hop in front of
// this function; trusting that one hop lets req.ip and X-Forwarded-For
// reflect the real client IP (used for rate limiting and session location).
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));

// Routes
const authRoutes = require("./routes/auth");
const todoRoutes = require("./routes/todo");
const subjectRoutes = require("./routes/subject");
const documentRoutes = require("./routes/documents");
const noteRoutes = require("./routes/notes");
const accountRoutes = require("./routes/account");
const cronRoutes = require("./routes/cron");
const studySessionRoutes = require("./routes/studySessions");
const pushDebugRoutes = require("./routes/pushDebug");
app.use("/api/auth", authRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/cron", cronRoutes);
app.use("/api/study-sessions", studySessionRoutes);
app.use("/api/push-debug", pushDebugRoutes);

const PORT = process.env.PORT || 6002;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
