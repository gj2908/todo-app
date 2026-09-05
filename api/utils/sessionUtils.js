const crypto = require("crypto");
const { UAParser } = require("ua-parser-js");
const Session = require("../models/Session");

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || req.ip || "";
};

const lookupGeo = async (ip) => {
  if (!ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("::ffff:127.")) {
    return { city: "", country: "" };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`https://ipwho.is/${ip}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return { city: "", country: "" };
    const data = await res.json();
    if (!data.success) return { city: "", country: "" };
    return { city: data.city || data.region || "", country: data.country || "" };
  } catch {
    return { city: "", country: "" };
  }
};

const parseUserAgent = (uaString) => {
  try {
    const parser = new UAParser(uaString || "");
    const result = parser.getResult();
    return {
      browser: result.browser.name || "",
      os: result.os.name || "",
    };
  } catch {
    return { browser: "", os: "" };
  }
};

const createSession = async (userId, req) => {
  const tokenId = crypto.randomUUID();
  const ip = getClientIp(req);
  const { browser, os } = parseUserAgent(req.headers["user-agent"]);
  const { city, country } = await lookupGeo(ip);

  await Session.create({
    user: userId,
    tokenId,
    userAgent: req.headers["user-agent"] || "",
    browser,
    os,
    ip,
    city,
    country,
  });

  return tokenId;
};

module.exports = { getClientIp, lookupGeo, parseUserAgent, createSession };
