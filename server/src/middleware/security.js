import crypto from "crypto";

export function requestContext(req, res, next) {
  req.requestId = `req-${crypto.randomUUID().slice(0, 8)}`;
  res.setHeader("X-Request-Id", req.requestId);
  next();
}

export function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  next();
}
