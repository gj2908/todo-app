const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const Session = require("../models/Session");
const { protect } = require("../middleware/auth");
const { createSession, getClientIp } = require("../utils/sessionUtils");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in a few minutes." },
  // Vercel's edge can add more than one hop after the real client IP, so
  // Express's own trust-proxy distance-based req.ip can land on a shared
  // internal address instead of the actual visitor - read the first
  // X-Forwarded-For entry directly instead (same rule Vercel documents).
  keyGenerator: (req) => getClientIp(req),
});

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
    host: SMTP_HOST || "smtp.zoho.com",
    port: Number(SMTP_PORT || (SMTP_SECURE === "true" ? 465 : 587)),
    secure: SMTP_SECURE === "true" || SMTP_SECURE === "1",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  await transporter.verify();

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

// Register
router.post("/register", authLimiter, async (req, res) => {
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

    const jti = await createSession(user._id, req);
    const token = jwt.sign(
      { id: user._id, email: user.email, jti },
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
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid password" });

    const jti = await createSession(user._id, req);
    const token = jwt.sign(
      { id: user._id, email: user.email, jti },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// Change Password
router.put("/change-password", protect, async (req, res) => {
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
router.get("/profile", protect, async (req, res) => {
  const user = await User.findById(req.user).select("-password");
  res.json(user);
});

// Sign out - revoke the current session only
router.post("/logout", protect, async (req, res) => {
  if (req.sessionId) {
    await Session.updateOne({ tokenId: req.sessionId }, { revokedAt: new Date() });
  }
  res.json({ message: "Signed out" });
});

// List active sessions (devices currently signed in)
router.get("/sessions", protect, async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user, revokedAt: null })
      .sort({ lastSeenAt: -1 })
      .lean();

    res.json(
      sessions.map((s) => ({
        id: s._id,
        browser: s.browser,
        os: s.os,
        city: s.city,
        country: s.country,
        createdAt: s.createdAt,
        lastSeenAt: s.lastSeenAt,
        current: s.tokenId === req.sessionId,
      })),
    );
  } catch (error) {
    console.error("List sessions error:", error);
    res.status(500).json({ message: "Failed to load sessions" });
  }
});

// Revoke one session (sign out that device)
router.delete("/sessions/:id", protect, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, user: req.user });
    if (!session) return res.status(404).json({ message: "Session not found" });

    session.revokedAt = new Date();
    await session.save();
    res.json({ message: "Session signed out" });
  } catch (error) {
    console.error("Revoke session error:", error);
    res.status(500).json({ message: "Failed to sign out session" });
  }
});

// Sign out of every other device, keeping the current session active
router.post("/sessions/revoke-others", protect, async (req, res) => {
  try {
    await Session.updateMany(
      { user: req.user, tokenId: { $ne: req.sessionId }, revokedAt: null },
      { revokedAt: new Date() },
    );
    res.json({ message: "Signed out of all other devices" });
  } catch (error) {
    console.error("Revoke other sessions error:", error);
    res.status(500).json({ message: "Failed to sign out other devices" });
  }
});

// Forgot Password - Generate reset token
router.post("/forgot-password", authLimiter, async (req, res) => {
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
    const isProduction = process.env.NODE_ENV === "production";

    try {
      const mailResult = await sendResetEmail(email, resetLink);
      if (mailResult.sent) {
        return res.json({ message: "Reset link sent to email" });
      }

      if (isProduction) {
        return res.status(500).json({ message: "Unable to send reset email right now. Please try again." });
      }

      // Dev fallback only: return link for local testing.
      return res.json({
        message: "Email service not configured. Using local fallback reset link.",
        resetLink,
      });
    } catch (mailError) {
      console.error("Email send error:", {
        message: mailError?.message,
        code: mailError?.code,
        response: mailError?.response,
      });

      if (isProduction) {
        return res.status(500).json({ message: "Unable to send reset email right now. Please try again." });
      }

      // Dev fallback only: return link for local testing.
      return res.json({
        message: "Email sending failed in local mode. Using fallback reset link.",
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
