const REQUIRED_WHEN_LIVE = [
  "HEDERA_NETWORK",
  "HEDERA_ENABLE_LIVE_SIGNING",
  "HEDERA_SIGNER_MODE"
];

export function appConfig() {
  return {
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 4000),
    corsOrigin: process.env.GBF_CORS_ORIGIN || "*",
    bodyLimit: process.env.GBF_BODY_LIMIT || "1mb",
    trustProxy: process.env.GBF_TRUST_PROXY === "true",
    metricsEnabled: process.env.GBF_METRICS_ENABLED !== "false",
    mainnetEnabled: process.env.GBF_ENABLE_MAINNET === "true",
    hederaNetwork: (process.env.HEDERA_NETWORK || "testnet").toLowerCase()
  };
}

export function validateEnvironment() {
  const config = appConfig();
  const warnings = [];
  const errors = [];

  for (const key of REQUIRED_WHEN_LIVE) {
    if (!process.env[key]) {
      warnings.push(`Missing optional environment variable: ${key}`);
    }
  }

  if (config.hederaNetwork === "mainnet" && !config.mainnetEnabled) {
    errors.push("Mainnet is configured but GBF_ENABLE_MAINNET is not set to true.");
  }

  if (config.corsOrigin === "*") {
    warnings.push("GBF_CORS_ORIGIN is set to *; restrict this before public deployment.");
  }

  return {
    config,
    warnings,
    errors,
    ok: errors.length === 0
  };
}
