import test from "node:test";
import assert from "node:assert/strict";
import { appConfig, validateEnvironment } from "../src/lib/env.js";

test("appConfig reads core server settings", () => {
  process.env.PORT = "4500";
  process.env.GBF_CORS_ORIGIN = "http://localhost:5173";

  const config = appConfig();

  assert.equal(config.port, 4500);
  assert.equal(config.corsOrigin, "http://localhost:5173");
});

test("validateEnvironment blocks mainnet unless explicitly enabled", () => {
  process.env.HEDERA_NETWORK = "mainnet";
  process.env.GBF_ENABLE_MAINNET = "false";

  const validation = validateEnvironment();

  assert.equal(validation.ok, false);
  assert.match(validation.errors[0], /Mainnet/);

  process.env.HEDERA_NETWORK = "testnet";
});
