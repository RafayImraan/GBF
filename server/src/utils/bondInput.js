import { randomUUID } from "crypto";

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);
}

export function normalizeBondInput(body) {
  const name = String(body?.name || "").trim();
  const issuer = String(body?.issuer || "").trim();
  const category = String(body?.category || "").trim();
  const maturity = String(body?.maturity || "").trim();
  const impactMetric = String(body?.impactMetric || "").trim();
  const telemetryUnit = String(body?.telemetryUnit || "").trim();
  const guardianPolicy = String(body?.guardianPolicy || "").trim() || "guardian-policy-pending";
  const faceValue = Number(body?.faceValue);
  const couponRate = Number(body?.couponRate);
  const telemetryBaseValue = Number(body?.telemetryBaseValue);

  if (!name || !issuer || !category || !maturity || !impactMetric || !telemetryUnit) {
    throw new Error("Missing required bond fields.");
  }

  if (!Number.isFinite(faceValue) || faceValue <= 0) {
    throw new Error("Face value must be a positive number.");
  }

  if (!Number.isFinite(couponRate) || couponRate <= 0) {
    throw new Error("Coupon rate must be a positive number.");
  }

  if (!Number.isFinite(telemetryBaseValue) || telemetryBaseValue < 0) {
    throw new Error("Telemetry base value must be zero or greater.");
  }

  const year = maturity.slice(0, 4);
  const uniqueSuffix = randomUUID().slice(0, 6);

  return {
    id: body?.id || `bond-${slugify(name)}-${year}-${uniqueSuffix}`,
    name,
    issuer,
    category,
    maturity,
    impactMetric,
    telemetryUnit,
    guardianPolicy,
    faceValue: Math.round(faceValue),
    couponRate,
    telemetryBaseValue,
    tokenPrice: 1,
    progress: Number(body?.progress || 0),
    liquidityScore: Number(body?.liquidityScore || 0),
    walletHolders: Number(body?.walletHolders || 0),
    verifiedImpact: body?.verifiedImpact || "Onboarding baseline captured"
  };
}
