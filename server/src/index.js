import "dotenv/config";
import cors from "cors";
import express from "express";
import apiRouter from "./routes/api.js";
import authRouter from "./routes/auth.js";
import { getDb } from "./lib/db.js";
import { appConfig, validateEnvironment } from "./lib/env.js";
import { logEvent } from "./lib/logger.js";
import { metricsMiddleware, snapshotMetrics } from "./lib/metrics.js";
import { attachAuth } from "./middleware/auth.js";
import { requestContext, securityHeaders } from "./middleware/security.js";

const app = express();
const config = appConfig();
const validation = validateEnvironment();

getDb();

if (!validation.ok) {
  throw new Error(validation.errors.join(" "));
}

for (const warning of validation.warnings) {
  logEvent("warn", warning, { scope: "startup" });
}

app.use(
  cors({
    origin: config.corsOrigin
  })
);
app.use(requestContext);
app.use(securityHeaders);
app.use(express.json({ limit: config.bodyLimit }));
app.use(metricsMiddleware);
app.use(attachAuth);

app.get("/", (_req, res) => {
  res.json({
    name: "Global Green-Bond Fractionalizer API",
    version: "1.0.0",
    docs: {
      overview: "/api/overview",
      bonds: "/api/bonds",
      truthStream: "/api/truth-stream",
      transactions: "/api/transactions"
    }
  });
});

app.get("/metrics", (_req, res) => {
  if (!config.metricsEnabled) {
    return res.status(404).json({
      ok: false,
      message: "Metrics endpoint is disabled."
    });
  }

  return res.json({
    ok: true,
    metrics: snapshotMetrics()
  });
});

app.use("/api", apiRouter);
app.use("/auth", authRouter);

app.listen(config.port, () => {
  logEvent("info", "GBF API listening", {
    port: config.port,
    network: config.hederaNetwork
  });
});
