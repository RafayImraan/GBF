const buckets = new Map();

function keyForRequest(req) {
  return `${req.ip}:${req.baseUrl}${req.path}`;
}

export function rateLimit({ windowMs, limit }) {
  return (req, res, next) => {
    const key = keyForRequest(req);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= limit) {
      return res.status(429).json({
        ok: false,
        message: "Too many requests. Please slow down and try again shortly."
      });
    }

    bucket.count += 1;
    return next();
  };
}
