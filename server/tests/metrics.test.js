import test from "node:test";
import assert from "node:assert/strict";
import { snapshotMetrics, trackAuthFailure, trackIntegrationMode } from "../src/lib/metrics.js";

test("metrics tracker records auth failures and integration modes", () => {
  const before = snapshotMetrics();

  trackAuthFailure();
  trackIntegrationMode("live");
  trackIntegrationMode("simulated");

  const after = snapshotMetrics();

  assert.equal(after.authFailures, before.authFailures + 1);
  assert.equal(after.liveTransactions, before.liveTransactions + 1);
  assert.equal(after.simulatedTransactions, before.simulatedTransactions + 1);
});
