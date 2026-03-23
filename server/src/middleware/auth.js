import { authTokenFromHeader, hashToken } from "../lib/auth.js";
import { findSessionByTokenHash } from "../lib/repository.js";

export function attachAuth(req, _res, next) {
  const token = authTokenFromHeader(req.headers.authorization);

  if (!token) {
    req.auth = { user: null, token: null };
    return next();
  }

  const session = findSessionByTokenHash(hashToken(token));

  if (!session || session.revokedAt || new Date(session.expiresAt).getTime() <= Date.now()) {
    req.auth = { user: null, token: null };
    return next();
  }

  req.auth = {
    token,
    session,
    user: session.user
  };
  return next();
}

export function requireAuth(req, res, next) {
  if (!req.auth?.user) {
    return res.status(401).json({
      ok: false,
      message: "Authentication required."
    });
  }

  return next();
}

export function requireRole(roles) {
  return (req, res, next) => {
    if (!req.auth?.user) {
      return res.status(401).json({
        ok: false,
        message: "Authentication required."
      });
    }

    if (!roles.includes(req.auth.user.role)) {
      return res.status(403).json({
        ok: false,
        message: "You do not have permission to perform this action."
      });
    }

    return next();
  };
}
