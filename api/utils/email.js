const nodemailer = require("nodemailer");

const getAppBaseUrl = () =>
  process.env.FRONTEND_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const getTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
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
};

const sendAppEmail = async ({ to, subject, html }) => {
  const transporter = getTransporter();
  if (!transporter) return { sent: false, reason: "smtp-not-configured" };

  await transporter.verify();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
  return { sent: true };
};

const sendResetEmail = (toEmail, resetLink) =>
  sendAppEmail({
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

const sendVerificationEmail = (toEmail, verifyLink) =>
  sendAppEmail({
    to: toEmail,
    subject: "Verify your Taskflow email",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2>Confirm your email</h2>
        <p>Welcome to Taskflow. Confirm this is your email address to finish setting up your account.</p>
        <p>
          <a href="${verifyLink}" style="display:inline-block;padding:10px 16px;background:#f59e0b;color:#111;text-decoration:none;border-radius:8px;font-weight:700;">
            Verify Email
          </a>
        </p>
        <p>If you did not create a Taskflow account, you can ignore this email.</p>
        <p>This link expires in 24 hours.</p>
      </div>
    `,
  });

const sendDigestEmail = (toEmail, { dueToday, overdue, appUrl }) => {
  const renderList = (items) =>
    items.map((t) => `<li>${t.title}${t.dueDate ? ` — ${new Date(t.dueDate).toLocaleDateString()}` : ""}</li>`).join("");

  return sendAppEmail({
    to: toEmail,
    subject: `Taskflow: ${dueToday.length} due today${overdue.length ? `, ${overdue.length} overdue` : ""}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2>Your daily task summary</h2>
        ${dueToday.length ? `<p><strong>Due today (${dueToday.length})</strong></p><ul>${renderList(dueToday)}</ul>` : ""}
        ${overdue.length ? `<p><strong>Overdue (${overdue.length})</strong></p><ul>${renderList(overdue)}</ul>` : ""}
        <p><a href="${appUrl}/home" style="display:inline-block;padding:10px 16px;background:#f59e0b;color:#111;text-decoration:none;border-radius:8px;font-weight:700;">Open Taskflow</a></p>
      </div>
    `,
  });
};

module.exports = { getAppBaseUrl, getTransporter, sendAppEmail, sendResetEmail, sendVerificationEmail, sendDigestEmail };
