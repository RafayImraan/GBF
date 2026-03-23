const metrics = {
  requestsTotal: 0,
  requestsByRoute: {},
  errorsTotal: 0,
  authFailures: 0,
  liveTransactions: 0,
  simulatedTransactions: 0
};

export function metricsMiddleware(req, res, next) {
  metrics.requestsTotal += 1;
  const key = `${req.method} ${req.path}`;
  metrics.requestsByRoute[key] = (metrics.requestsByRoute[key] || 0) + 1;

  res.on("finish", () => {
    if (res.statusCode >= 400) {
      metrics.errorsTotal += 1;
    }
  });

  next();
}

export function trackAuthFailure() {
  metrics.authFailures += 1;
}

export function trackIntegrationMode(mode) {
  if (mode === "live") {
    metrics.liveTransactions += 1;
  } else if (mode === "simulated") {
    metrics.simulatedTransactions += 1;
  }
}

export function snapshotMetrics() {
  return {
    ...metrics,
    requestsByRoute: { ...metrics.requestsByRoute }
  };
}
