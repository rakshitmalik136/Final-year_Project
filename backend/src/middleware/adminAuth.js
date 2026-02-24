const { verifyAdminToken } = require("../utils/adminAuth");

const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: { message: "Admin authentication required" }
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const payload = verifyAdminToken(token);

  if (!payload) {
    return res.status(401).json({
      error: { message: "Invalid or expired admin token" }
    });
  }

  req.admin = payload;
  return next();
};

module.exports = { requireAdmin };
