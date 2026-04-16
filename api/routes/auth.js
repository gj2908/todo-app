const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const getResetTokenSecret = () => {
  return (
    process.env.RESET_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    "dev-reset-secret-change-me"
  );
};

const sendResetEmail = async (toEmail, resetLink) => {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } =
    process.env;

  // No email provider configured, caller should fall back to manual link.
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return { sent: false, reason: "smtp-not-configured" };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: toEmail,
    subject: "Taskflow Password Reset",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2>Reset your password</h2>
        <p>We received a request to reset your Taskflow password.</p>
        <p>
          <a href="${resetLink}" style="display:inline-block;padding:10px 16px;background:#f59e0b;color:#111;text-decoration:none;border-radius:8px;font-weight:700;">
            Reset Password
          </a>
        </p>
        <p>If you did not request this, you can ignore this email.</p>
        <p>This link expires in 1 hour.</p>
      </div>
    `,
  });

  return { sent: true };
};

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
    const email = req.body?.email?.trim()?.toLowerCase();
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({ message: "If email exists, reset link sent" });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { id: user._id, email: user.email, type: "reset" },
      getResetTokenSecret(),
      { expiresIn: "1h" }
    );

    const appBaseUrl =
      process.env.FRONTEND_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const resetLink = `${appBaseUrl}/reset-password/${resetToken}`;

    try {
      const mailResult = await sendResetEmail(email, resetLink);
      if (mailResult.sent) {
        return res.json({ message: "Reset link sent to email" });
      }

      // SMTP not configured: return the link so flow still works.
      return res.json({
        message: "Email service not configured yet. Use the generated reset link.",
        resetLink,
      });
    } catch (mailError) {
      console.error("Email send error:", mailError);
      // If email fails, still return the link to avoid blocking the user.
      return res.json({
        message: "Could not send email right now. Use the generated reset link.",
        resetLink,
      });
    }
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
      decoded = jwt.verify(token, getResetTokenSecret());
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
