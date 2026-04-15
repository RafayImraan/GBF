import "dotenv/config";
import cors from "cors";
import express from "express";
import authRouter from "../../server/src/routes/auth.js";
import { getDb } from "../../server/src/lib/db.js";
import { appConfig, validateEnvironment } from "../../server/src/lib/env.js";
import { logEvent } from "../../server/src/lib/logger.js";
import { metricsMiddleware } from "../../server/src/lib/metrics.js";
import { attachAuth } from "../../server/src/middleware/auth.js";
import { requestContext, securityHeaders } from "../../server/src/middleware/security.js";

const app = express();
const config = appConfig();
const validation = validateEnvironment();
const allowAllOrigins = config.corsOrigins.includes("*");

getDb();

if (!validation.ok) {
  throw new Error(validation.errors.join(" "));
}

for (const warning of validation.warnings) {
  logEvent("warn", warning, { scope: "startup" });
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowAllOrigins || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`));
    }
  })
);
app.use(requestContext);
app.use(securityHeaders);
app.use(express.json({ limit: config.bodyLimit }));
app.use(metricsMiddleware);
app.use(attachAuth);

// Vercel route matching can hand this function different path prefixes.
// Mount all likely variants so auth endpoints resolve deterministically.
app.use("/", authRouter);
app.use("/auth", authRouter);
app.use("/api/auth", authRouter);

export default app;
