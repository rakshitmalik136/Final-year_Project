const crypto = require("crypto");

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin123";
const DEFAULT_TOKEN_TTL_SECONDS = 12 * 60 * 60;

const safeCompare = (left, right) => {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const getAdminConfig = () => {
  return {
    username: process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD,
    tokenSecret:
      process.env.ADMIN_AUTH_SECRET ||
      process.env.ADMIN_PASSWORD ||
      "cb365-admin-auth-secret",
    tokenTtlSeconds:
      Number(process.env.ADMIN_TOKEN_TTL_SECONDS) || DEFAULT_TOKEN_TTL_SECONDS
  };
};

const isValidCredential = ({ username, password }) => {
  const config = getAdminConfig();
  return (
    safeCompare(username, config.username) &&
    safeCompare(password, config.password)
  );
};

const signPayload = (payload) => {
  const { tokenSecret } = getAdminConfig();
  return crypto
    .createHmac("sha256", tokenSecret)
    .update(payload)
    .digest("base64url");
};

const issueAdminToken = (username) => {
  const { tokenTtlSeconds } = getAdminConfig();
  const payload = Buffer.from(
    JSON.stringify({
      username,
      exp: Date.now() + tokenTtlSeconds * 1000
    })
  ).toString("base64url");

  return `${payload}.${signPayload(payload)}`;
};

const verifyAdminToken = (token) => {
  if (!token || typeof token !== "string") return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = signPayload(payload);
  if (!safeCompare(signature, expected)) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (!decoded?.username || !decoded?.exp) return null;
    if (Date.now() > Number(decoded.exp)) return null;

    return { username: decoded.username, expiresAt: Number(decoded.exp) };
  } catch (error) {
    return null;
  }
};

module.exports = {
  getAdminConfig,
  isValidCredential,
  issueAdminToken,
  verifyAdminToken
};
