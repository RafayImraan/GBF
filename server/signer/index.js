import "dotenv/config";
import express from "express";
import { createTopic, createToken, getRemoteSignerStatus, publishMessage, scheduleYield, transferToken } from "./service.js";

const app = express();
const port = Number(process.env.HEDERA_REMOTE_SIGNER_PORT || 8787);
const bind = process.env.HEDERA_REMOTE_SIGNER_BIND || "127.0.0.1";

function requireBearerToken(req, res, next) {
  const configuredToken = process.env.HEDERA_REMOTE_SIGNER_TOKEN;
  const header = req.headers.authorization || "";

  if (!configuredToken) {
    return res.status(500).json({
      ok: false,
      message: "Remote signer token is not configured."
    });
  }

  if (!header.startsWith("Bearer ") || header.slice("Bearer ".length).trim() !== configuredToken) {
    return res.status(401).json({
      ok: false,
      message: "Unauthorized remote signer request."
    });
  }

  return next();
}

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "gbf-remote-signer",
    ...getRemoteSignerStatus()
  });
});

app.post("/hedera/create-topic", requireBearerToken, async (req, res) => {
  try {
    res.json(await createTopic(req.body));
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to create topic."
    });
  }
});

app.post("/hedera/create-token", requireBearerToken, async (req, res) => {
  try {
    res.json(await createToken(req.body));
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to create token."
    });
  }
});

app.post("/hedera/publish-message", requireBearerToken, async (req, res) => {
  try {
    res.json(await publishMessage(req.body));
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to publish message."
    });
  }
});

app.post("/hedera/schedule-yield", requireBearerToken, async (req, res) => {
  try {
    res.json(await scheduleYield(req.body));
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to schedule yield."
    });
  }
});

app.post("/hedera/transfer-token", requireBearerToken, async (req, res) => {
  try {
    res.json(await transferToken(req.body));
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to transfer token."
    });
  }
});

app.listen(port, bind, () => {
  console.log(`GBF remote signer listening on http://${bind}:${port}`);
});
