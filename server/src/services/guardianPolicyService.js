import {
  createComplianceCase,
  createGuardianPolicy,
  getComplianceCases,
  getGuardianPolicies,
  updateComplianceCase,
  updateGuardianPolicy
} from "../lib/repository.js";

export function listGuardianPolicies() {
  return getGuardianPolicies();
}

export function importGuardianPolicyArtifact(input) {
  return createGuardianPolicy({
    bondId: input.bondId || null,
    policyName: input.policyName,
    version: input.version || "1.0.0",
    status: input.status || "draft",
    methodology: input.methodology,
    artifact: input.artifact || {}
  });
}

export function publishGuardianPolicy(policyId) {
  return updateGuardianPolicy(policyId, {
    status: "published"
  });
}

export function runGuardianComplianceReview({ bond, investor, listing, preflight }) {
  if (preflight.passed && !preflight.warnings.length) {
    return {
      status: "clear",
      caseRecord: null
    };
  }

  const severity = preflight.issues.length ? "high" : "medium";
  const caseRecord = createComplianceCase({
    bondId: bond?.id || null,
    investorId: investor?.id || null,
    listingId: listing?.id || null,
    caseType: "transfer_review",
    status: preflight.issues.length ? "blocked" : "review_required",
    severity,
    summary: preflight.issues.length
      ? "Transfer blocked by Guardian/compliance preflight."
      : "Transfer requires compliance review before settlement.",
    details: {
      bondId: bond?.id || null,
      investorId: investor?.id || null,
      listingId: listing?.id || null,
      issues: preflight.issues,
      warnings: preflight.warnings
    }
  });

  return {
    status: caseRecord.status,
    caseRecord
  };
}

export function listComplianceCases() {
  return getComplianceCases();
}

export function resolveComplianceCase(caseId, resolutionNotes) {
  return updateComplianceCase(caseId, {
    status: "resolved",
    resolutionNotes
  });
}
