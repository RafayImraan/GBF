import { randomUUID } from "crypto";
import { currentTimestamp, getDb } from "./db.js";

function mapBond(row) {
  return {
    id: row.id,
    name: row.name,
    issuer: row.issuer,
    category: row.category,
    faceValue: row.face_value,
    tokenPrice: row.token_price,
    couponRate: row.coupon_rate,
    maturity: row.maturity,
    verifiedImpact: row.verified_impact,
    impactMetric: row.impact_metric,
    progress: row.progress,
    liquidityScore: row.liquidity_score,
    tokenId: row.token_id,
    topicId: row.topic_id,
    guardianPolicy: row.guardian_policy,
    status: row.status,
    walletHolders: row.wallet_holders,
    treasuryAccountId: row.treasury_account_id,
    telemetryUnit: row.telemetry_unit,
    telemetryBaseValue: row.telemetry_base_value,
    onboardingTxId: row.onboarding_tx_id,
    onboardingMode: row.onboarding_mode,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTransaction(row) {
  return {
    id: row.id,
    bondId: row.bond_id,
    bondName: row.bond_name,
    timestamp: row.timestamp,
    action: row.action,
    status: row.status,
    network: row.network,
    integrationMode: row.integration_mode,
    txId: row.tx_id,
    summary: row.summary,
    details: JSON.parse(row.details_json)
  };
}

function mapEvent(row) {
  return {
    id: row.id,
    bondId: row.bond_id,
    timestamp: row.timestamp,
    source: row.source,
    project: row.project,
    metric: row.metric,
    value: row.value,
    guardianScore: row.guardian_score,
    topicSequence: row.topic_sequence,
    status: row.status,
    topicId: row.topic_id,
    txId: row.tx_id,
    integrationMode: row.integration_mode
  };
}

export function getProtocolOverview() {
  const db = getDb();
  const row = db.prepare("SELECT * FROM protocol_overview WHERE id = 1").get();
  return {
    projectTitle: row.project_title,
    ticker: row.ticker,
    network: row.network,
    assetLayer: row.asset_layer,
    trustLayer: row.trust_layer,
    auditTrail: row.audit_trail,
    thesis: row.thesis
  };
}

export function getBonds() {
  return getDb()
    .prepare("SELECT * FROM bonds ORDER BY created_at DESC")
    .all()
    .map(mapBond);
}

export function getBondById(id) {
  const row = getDb().prepare("SELECT * FROM bonds WHERE id = ?").get(id);
  return row ? mapBond(row) : null;
}

export function createBond(input) {
  const db = getDb();
  const now = currentTimestamp();
  const id = input.id || `bond-${randomUUID().slice(0, 8)}`;

  db.prepare(`
    INSERT INTO bonds (
      id, name, issuer, category, face_value, token_price, coupon_rate, maturity, verified_impact,
      impact_metric, progress, liquidity_score, token_id, topic_id, guardian_policy, status, wallet_holders,
      treasury_account_id, telemetry_unit, telemetry_base_value, onboarding_tx_id, onboarding_mode, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.name,
    input.issuer,
    input.category,
    input.faceValue,
    input.tokenPrice ?? 1,
    input.couponRate,
    input.maturity,
    input.verifiedImpact ?? "Onboarding baseline captured",
    input.impactMetric,
    input.progress ?? 0,
    input.liquidityScore ?? 0,
    input.tokenId ?? null,
    input.topicId ?? null,
    input.guardianPolicy,
    input.status ?? "Onboarded",
    input.walletHolders ?? 0,
    input.treasuryAccountId ?? null,
    input.telemetryUnit,
    input.telemetryBaseValue,
    input.onboardingTxId ?? null,
    input.onboardingMode ?? "pending",
    now,
    now
  );

  return getBondById(id);
}

export function updateBond(id, patch) {
  const existing = getBondById(id);

  if (!existing) {
    return null;
  }

  const next = { ...existing, ...patch, updatedAt: currentTimestamp() };
  getDb().prepare(`
    UPDATE bonds SET
      name = ?, issuer = ?, category = ?, face_value = ?, token_price = ?, coupon_rate = ?, maturity = ?,
      verified_impact = ?, impact_metric = ?, progress = ?, liquidity_score = ?, token_id = ?, topic_id = ?,
      guardian_policy = ?, status = ?, wallet_holders = ?, treasury_account_id = ?, telemetry_unit = ?,
      telemetry_base_value = ?, onboarding_tx_id = ?, onboarding_mode = ?, updated_at = ?
    WHERE id = ?
  `).run(
    next.name,
    next.issuer,
    next.category,
    next.faceValue,
    next.tokenPrice,
    next.couponRate,
    next.maturity,
    next.verifiedImpact,
    next.impactMetric,
    next.progress,
    next.liquidityScore,
    next.tokenId,
    next.topicId,
    next.guardianPolicy,
    next.status,
    next.walletHolders,
    next.treasuryAccountId,
    next.telemetryUnit,
    next.telemetryBaseValue,
    next.onboardingTxId,
    next.onboardingMode,
    next.updatedAt,
    id
  );

  return getBondById(id);
}

export function createTransaction(input) {
  const db = getDb();
  const id = input.id || `txn-${randomUUID().slice(0, 8)}`;

  db.prepare(`
    INSERT INTO transactions (
      id, bond_id, bond_name, timestamp, action, status, network, integration_mode, tx_id, summary, details_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.bondId,
    input.bondName,
    input.timestamp ?? currentTimestamp(),
    input.action,
    input.status ?? "completed",
    input.network,
    input.integrationMode,
    input.txId,
    input.summary,
    JSON.stringify(input.details ?? {})
  );

  return getTransactionById(id);
}

export function getTransactions(limit = 20) {
  return getDb()
    .prepare("SELECT * FROM transactions ORDER BY timestamp DESC LIMIT ?")
    .all(limit)
    .map(mapTransaction);
}

export function getTransactionById(id) {
  const row = getDb().prepare("SELECT * FROM transactions WHERE id = ?").get(id);
  return row ? mapTransaction(row) : null;
}

export function createTruthEvent(input) {
  const db = getDb();
  const id = input.id || `evt-${randomUUID().slice(0, 8)}`;

  db.prepare(`
    INSERT INTO truth_events (
      id, bond_id, timestamp, source, project, metric, value, guardian_score, topic_sequence, status, topic_id, tx_id, integration_mode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.bondId,
    input.timestamp ?? currentTimestamp(),
    input.source,
    input.project,
    input.metric,
    input.value,
    input.guardianScore,
    input.topicSequence,
    input.status ?? "Verified",
    input.topicId ?? null,
    input.txId,
    input.integrationMode
  );

  return getTruthEvents(1)[0];
}

export function getTruthEvents(limit = 12) {
  return getDb()
    .prepare("SELECT * FROM truth_events ORDER BY timestamp DESC LIMIT ?")
    .all(limit)
    .map(mapEvent);
}

export function computeOverviewKpis() {
  const db = getDb();
  const aggregates = db.prepare(`
    SELECT
      COUNT(*) AS bond_count,
      COALESCE(SUM(face_value), 0) AS total_face_value,
      COALESCE(AVG(progress), 0) AS avg_progress,
      COALESCE(SUM(wallet_holders), 0) AS wallet_holders
    FROM bonds
  `).get();
  const yieldTotal = db.prepare(`
    SELECT COALESCE(SUM(CAST(json_extract(details_json, '$.amount') AS INTEGER)), 0) AS amount
    FROM transactions
    WHERE action = 'distribute-yield'
  `).get();

  return [
    {
      label: "Retail entry point",
      value: "$1",
      detail: "Minimum access point for Fractional Bond Tokens"
    },
    {
      label: "Assets tokenized",
      value: `$${(Number(aggregates.total_face_value) / 1000000).toFixed(1)}M`,
      detail: `${aggregates.bond_count} bond programs currently onboarded`
    },
    {
      label: "Impact readiness",
      value: `${Math.round(Number(aggregates.avg_progress))}%`,
      detail: `${Number(aggregates.wallet_holders).toLocaleString()} holders across active programs`
    },
    {
      label: "Yield distributed",
      value: `$${(Number(yieldTotal.amount) / 1000000).toFixed(2)}M`,
      detail: "Coupon payouts released through verified distribution flows"
    }
  ];
}
