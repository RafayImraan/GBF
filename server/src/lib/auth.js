import crypto from "crypto";

const SESSION_TTL_HOURS = Number(process.env.GBF_SESSION_TTL_HOURS || 12);

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function expirationTimestamp() {
  return new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

export function verifyPassword(password, passwordHash) {
  const [scheme, salt, storedHash] = String(passwordHash || "").split(":");

  if (scheme !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(storedHash, "hex"));
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function authTokenFromHeader(headerValue) {
  if (!headerValue || !headerValue.startsWith("Bearer ")) {
    return null;
  }

  return headerValue.slice("Bearer ".length).trim() || null;
}

export function canUseLiveSigning(user) {
  return (
    process.env.HEDERA_ENABLE_LIVE_SIGNING === "true" &&
    Boolean(process.env.HEDERA_OPERATOR_ID && process.env.HEDERA_OPERATOR_KEY) &&
    Boolean(user) &&
    ["admin", "operator"].includes(user.role)
  );
}
