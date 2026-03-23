import test from "node:test";
import assert from "node:assert/strict";
import { resetDatabase } from "../src/lib/db.js";
import {
  importGuardianPolicyArtifact,
  listGuardianPolicies,
  publishGuardianPolicy
} from "../src/services/guardianPolicyService.js";

test("guardian policy artifacts can be imported and published", () => {
  resetDatabase();

  const policy = importGuardianPolicyArtifact({
    bondId: "gbf-wind-2028",
    policyName: "Wind MRV Policy",
    methodology: "Satellite + turbine telemetry cross-check",
    artifact: {
      stages: ["ingest", "verify", "publish"]
    }
  });

  assert.equal(policy.status, "draft");

  const published = publishGuardianPolicy(policy.id);
  assert.equal(published.status, "published");

  const all = listGuardianPolicies();
  assert.ok(all.some((entry) => entry.id === policy.id));
});
