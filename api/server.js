require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");

const app = express();
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
const projectRoutes = require("./routes/project");
const documentRoutes = require("./routes/documents");
app.use("/api/auth", authRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/documents", documentRoutes);

const PORT = process.env.PORT || 6002;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
