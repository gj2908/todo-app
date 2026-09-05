const jwt = require("jsonwebtoken");
const Session = require("../models/Session");

const protect = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  // Tokens issued before session tracking was added have no jti - let them
  // through until they naturally expire, rather than logging everyone out.
  if (decoded.jti) {
    try {
      const session = await Session.findOne({ tokenId: decoded.jti });
      if (!session || session.revokedAt) {
        return res.status(401).json({ message: "Session expired or signed out" });
      }
      session.lastSeenAt = new Date();
      session.save().catch(() => {});
    } catch {
      // If the session lookup itself fails (e.g. transient DB issue), fail
      // open on the same terms as a legacy token rather than 500ing every request.
    }
  }

  req.user = decoded.id;
  req.sessionId = decoded.jti || null;
  next();
};

module.exports = { protect };
