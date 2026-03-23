export function evaluateBondForDistribution(bond) {
  const score = Math.min(100, Math.max(90, Math.round(bond.progress + 6)));
  const passed = score >= 95 && bond.progress >= 80;

  return {
    policyId: bond.guardianPolicy,
    score,
    compliance: passed ? "pass" : "review",
    requirements: [
      "Guardian methodology score above 95",
      "Truth Stream contains latest telemetry checkpoint",
      "Impact progress greater than 80%"
    ],
    passed
  };
}

export function buildTelemetryReading(bond) {
  const jitter = (Math.random() * 18 + 2).toFixed(1);
  const numericValue = (bond.telemetryBaseValue + Number(jitter)).toFixed(1);

  return {
    source:
      bond.category === "Wind Energy"
        ? "IoT turbine controller"
        : bond.category === "Reforestation"
          ? "Satellite vegetation scan"
          : "Carbon capture sensor mesh",
    metric: bond.impactMetric,
    value: numericValue,
    guardianScore: Math.min(100, Math.max(95, Math.round(bond.progress + 10)))
  };
}
