const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const { authenticator } = require("otplib");
const QRCode = require("qrcode");
const User = require("../models/User");
const Session = require("../models/Session");
const { protect } = require("../middleware/auth");
const { createSession, getClientIp } = require("../utils/sessionUtils");
const { getAppBaseUrl, sendResetEmail, sendVerificationEmail } = require("../utils/email");

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

const sendVerificationEmailForUser = async (user) => {
  const verifyToken = jwt.sign(
    { id: user._id, email: user.email, type: "verify" },
    getResetTokenSecret(),
    { expiresIn: "24h" },
  );
  const verifyLink = `${getAppBaseUrl()}/verify-email/${verifyToken}`;
  try {
    await sendVerificationEmail(user.email, verifyLink);
  } catch (error) {
    console.error("Verification email send error:", error?.message || error);
  }
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

    sendVerificationEmailForUser(user).catch(() => {});

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

    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign(
        { id: user._id, type: "2fa-pending" },
        process.env.JWT_SECRET,
        { expiresIn: "5m" },
      );
      return res.json({ requires2FA: true, tempToken });
    }

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

// Complete login after a 2FA code (or backup code) is verified
router.post("/2fa/verify-login", authLimiter, async (req, res) => {
  try {
    const { tempToken, code } = req.body || {};
    if (!tempToken || !code) {
      return res.status(400).json({ message: "Code is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      if (decoded.type !== "2fa-pending") throw new Error("wrong token type");
    } catch {
      return res.status(401).json({ message: "Login session expired, please sign in again" });
    }

    const user = await User.findById(decoded.id).select("+twoFactorSecret +backupCodes");
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ message: "Two-factor authentication is not enabled" });
    }

    const cleanCode = String(code).trim().replace(/\s+/g, "");
    let usedBackupCode = false;

    const isValidTotp = authenticator.check(cleanCode, user.twoFactorSecret);
    if (!isValidTotp) {
      const codes = user.backupCodes || [];
      let matchedIndex = -1;
      for (let i = 0; i < codes.length; i++) {
        // eslint-disable-next-line no-await-in-loop
        if (await bcrypt.compare(cleanCode, codes[i])) {
          matchedIndex = i;
          break;
        }
      }
      if (matchedIndex === -1) {
        return res.status(400).json({ message: "Invalid code" });
      }
      usedBackupCode = true;
      user.backupCodes = codes.filter((_, i) => i !== matchedIndex);
      await user.save();
    }

    const jti = await createSession(user._id, req);
    const token = jwt.sign(
      { id: user._id, email: user.email, jti },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
      usedBackupCode,
    });
  } catch (error) {
    console.error("2FA verify-login error:", error);
    res.status(500).json({ message: "Failed to verify code" });
  }
});

// Change Password
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = currentPassword && (await bcrypt.compare(currentPassword, user.password));
    if (!match) return res.status(400).json({ message: "Current password is incorrect" });

    user.password = await bcrypt.hash(password, 10);
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
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

// Begin 2FA setup - generates a new secret and QR code (not enabled yet)
router.post("/2fa/setup", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: "Two-factor authentication is already enabled" });
    }

    const secret = authenticator.generateSecret();
    user.twoFactorSecret = secret;
    await user.save();

    const otpauthUri = authenticator.keyuri(user.email, "Taskflow", secret);
    const qrCode = await QRCode.toDataURL(otpauthUri);

    res.json({ secret, qrCode });
  } catch (error) {
    console.error("2FA setup error:", error);
    res.status(500).json({ message: "Failed to start two-factor setup" });
  }
});

// Confirm setup with a code from the authenticator app - turns 2FA on
router.post("/2fa/enable", protect, async (req, res) => {
  try {
    const { code } = req.body || {};
    const user = await User.findById(req.user).select("+twoFactorSecret");
    if (!user?.twoFactorSecret) {
      return res.status(400).json({ message: "Start setup first" });
    }

    const isValid = code && authenticator.check(String(code).trim(), user.twoFactorSecret);
    if (!isValid) {
      return res.status(400).json({ message: "Incorrect code, please try again" });
    }

    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(5).toString("hex")
    );
    user.backupCodes = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 10)));
    user.twoFactorEnabled = true;
    await user.save();

    res.json({ message: "Two-factor authentication enabled", backupCodes });
  } catch (error) {
    console.error("2FA enable error:", error);
    res.status(500).json({ message: "Failed to enable two-factor authentication" });
  }
});

// Disable 2FA - requires the account password as confirmation
router.post("/2fa/disable", protect, async (req, res) => {
  try {
    const { password } = req.body || {};
    const user = await User.findById(req.user).select("+twoFactorSecret +backupCodes");
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = password && (await bcrypt.compare(password, user.password));
    if (!match) return res.status(400).json({ message: "Incorrect password" });

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.backupCodes = undefined;
    await user.save();

    res.json({ message: "Two-factor authentication disabled" });
  } catch (error) {
    console.error("2FA disable error:", error);
    res.status(500).json({ message: "Failed to disable two-factor authentication" });
  }
});

// Verify email - validates the link sent at registration
router.post("/verify-email/:token", async (req, res) => {
  try {
    let decoded;
    try {
      decoded = jwt.verify(req.params.token, getResetTokenSecret());
      if (decoded.type !== "verify") throw new Error("wrong token type");
    } catch {
      return res.status(400).json({ message: "Verification link expired or invalid" });
    }

    await User.findByIdAndUpdate(decoded.id, { emailVerified: true });
    res.json({ message: "Email verified" });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ message: "Failed to verify email" });
  }
});

// Resend the verification email
router.post("/resend-verification", protect, authLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.emailVerified) {
      return res.json({ message: "Email already verified" });
    }

    await sendVerificationEmailForUser(user);
    res.json({ message: "Verification email sent" });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ message: "Failed to send verification email" });
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

    const resetLink = `${getAppBaseUrl()}/reset-password/${resetToken}`;
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
