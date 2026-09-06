const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const PushDebugLog = require("../models/PushDebugLog");

const urlBase64ToBuffer = (str) => {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
};

// Verifies VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY are actually a matching EC
// keypair (P-256), without ever returning the key material itself. A push
// service can accept a send even when the sender's VAPID key doesn't match
// what a subscription was created with - the browser then fails to decrypt
// the payload and silently drops it before the `push` event ever fires,
// which looks identical to "accepted but never delivered".
const checkVapidKeypair = () => {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return { configured: false };

  try {
    const privBuf = urlBase64ToBuffer(priv);
    const pubBuf = urlBase64ToBuffer(pub);

    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(privBuf);
    const derivedPub = ecdh.getPublicKey();

    return {
      configured: true,
      publicKeyLength: pubBuf.length,
      privateKeyLength: privBuf.length,
      expectedPublicKeyLength: 65,
      expectedPrivateKeyLength: 32,
      derivedPublicKeyMatches: Buffer.compare(derivedPub, pubBuf) === 0,
    };
  } catch (err) {
    return { configured: true, error: err.message };
  }
};

const requireCronSecret = (req, res, next) => {
  const provided = req.header("Authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Intentionally unauthenticated - called from the service worker's push
// handler, which has no way to attach a user session or app secret. Payload
// is minimal (a stage label + user agent), nothing sensitive.
router.post("/", async (req, res) => {
  try {
    const { stage, note } = req.body || {};
    if (!stage) return res.status(400).json({ message: "stage is required" });
    await PushDebugLog.create({
      stage: String(stage).slice(0, 100),
      note: String(note || "").slice(0, 500),
      userAgent: req.header("User-Agent") || "",
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

router.get("/", requireCronSecret, async (req, res) => {
  const logs = await PushDebugLog.find().sort({ createdAt: -1 }).limit(20);
  res.json(logs);
});

router.get("/vapid-check", requireCronSecret, (req, res) => {
  res.json(checkVapidKeypair());
});

router.delete("/", requireCronSecret, async (req, res) => {
  await PushDebugLog.deleteMany({});
  res.json({ ok: true });
});

module.exports = router;
