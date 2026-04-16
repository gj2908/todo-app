const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Auth middleware
const auth = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Register
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashed });
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: { id: user._id, email: user.email },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Registration failed" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Invalid password" });

  const token = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
  res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email },
  });
});

// Change Password
router.put("/change-password", auth, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }
  const hashed = await bcrypt.hash(password, 10);
  await User.findByIdAndUpdate(req.user, { password: hashed });
  res.json({ message: "Password changed successfully" });
});

// Get User Profile
router.get("/profile", auth, async (req, res) => {
  const user = await User.findById(req.user).select("-password");
  res.json(user);
});

// Forgot Password - Generate reset token
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({ message: "If email exists, reset link sent" });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { id: user._id, email: user.email, type: "reset" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // In production, send email with reset link
    // For now, log it or send via your email service
    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password/${resetToken}`;
    console.log(`Reset link for ${email}: ${resetLink}`);

    // TODO: Send email with resetLink
    // const emailResponse = await sendEmail(email, "Password Reset", resetLink);

    res.json({ message: "Reset link sent to email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Failed to process request" });
  }
});

// Reset Password - Validate token and update password
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== "reset") {
        return res.status(400).json({ message: "Invalid token" });
      }
    } catch (err) {
      return res.status(400).json({ message: "Reset link expired or invalid" });
    }

    // Update user password
    const hashed = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(decoded.id, { password: hashed });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

module.exports = router;
