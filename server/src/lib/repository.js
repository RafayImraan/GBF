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

function mapUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    investorId: row.investor_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSession(row) {
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    user: {
      id: row.user_id,
      email: row.user_email,
      name: row.user_name,
      role: row.user_role,
      investorId: row.user_investor_id || null
    }
  };
}

function mapAuditLog(row) {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    actorEmail: row.actor_email,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    status: row.status,
    details: JSON.parse(row.details_json),
    createdAt: row.created_at
  };
}

function mapInvestor(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    walletAlias: row.wallet_alias,
    accountId: row.account_id,
    region: row.region,
    kycStatus: row.kyc_status,
    riskTier: row.risk_tier,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapHolding(row) {
  return {
    id: row.id,
    bondId: row.bond_id,
    investorId: row.investor_id,
    units: row.units,
    costBasis: row.cost_basis,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    bondName: row.bond_name,
    investorName: row.investor_name,
    investorEmail: row.investor_email,
    walletAlias: row.wallet_alias,
    accountId: row.account_id,
    kycStatus: row.kyc_status
  };
}

function mapPayoutRecord(row) {
  return {
    id: row.id,
    bondId: row.bond_id,
    investorId: row.investor_id,
    transactionId: row.transaction_id,
    scheduledTxId: row.scheduled_tx_id,
    amount: row.amount,
    units: row.units,
    status: row.status,
    network: row.network,
    integrationMode: row.integration_mode,
    createdAt: row.created_at,
    bondName: row.bond_name,
    investorName: row.investor_name,
    walletAlias: row.wallet_alias
  };
}

function mapTransferRecord(row) {
  return {
    id: row.id,
    bondId: row.bond_id,
    tokenId: row.token_id,
    fromInvestorId: row.from_investor_id,
    toInvestorId: row.to_investor_id,
    fromAccountId: row.from_account_id,
    toAccountId: row.to_account_id,
    units: row.units,
    transactionId: row.transaction_id,
    hederaTxId: row.hedera_tx_id,
    status: row.status,
    network: row.network,
    integrationMode: row.integration_mode,
    transferType: row.transfer_type,
    createdAt: row.created_at,
    bondName: row.bond_name,
    fromInvestorName: row.from_investor_name,
    toInvestorName: row.to_investor_name
  };
}

function mapMarketListing(row) {
  return {
    id: row.id,
    bondId: row.bond_id,
    sellerInvestorId: row.seller_investor_id,
    buyerInvestorId: row.buyer_investor_id,
    transactionId: row.transaction_id,
    units: row.units,
    pricePerUnit: row.price_per_unit,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    bondName: row.bond_name,
    sellerName: row.seller_name,
    buyerName: row.buyer_name
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

export function findUserByEmail(email) {
  const row = getDb().prepare("SELECT * FROM users WHERE email = ?").get(String(email || "").toLowerCase());
  return row
    ? {
        ...mapUser(row),
        passwordHash: row.password_hash
      }
    : null;
}

export function createSession(input) {
  getDb().prepare(`
    INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, revoked_at)
    VALUES (?, ?, ?, ?, ?, NULL)
  `).run(input.id, input.userId, input.tokenHash, input.createdAt, input.expiresAt);

  return findSessionById(input.id);
}

export function findSessionById(id) {
  const row = getDb()
    .prepare(`
      SELECT s.*, u.email AS user_email, u.name AS user_name, u.role AS user_role, u.investor_id AS user_investor_id
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
    `)
    .get(id);
  return row ? mapSession(row) : null;
}

export function findSessionByTokenHash(tokenHash) {
  const row = getDb()
    .prepare(`
      SELECT s.*, u.email AS user_email, u.name AS user_name, u.role AS user_role, u.investor_id AS user_investor_id
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
    `)
    .get(tokenHash);
  return row ? mapSession(row) : null;
}

export function revokeSession(id) {
  getDb().prepare("UPDATE sessions SET revoked_at = ? WHERE id = ?").run(currentTimestamp(), id);
}

export function getUsers() {
  return getDb()
    .prepare("SELECT id, email, name, role, investor_id, created_at, updated_at FROM users ORDER BY created_at ASC")
    .all()
    .map(mapUser);
}

export function createUser(input) {
  const db = getDb();
  db.prepare(`
    INSERT INTO users (id, email, name, role, password_hash, investor_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.id,
    input.email.toLowerCase(),
    input.name,
    input.role,
    input.passwordHash,
    input.investorId || null,
    input.createdAt,
    input.updatedAt
  );

  return getUsers().find((user) => user.id === input.id) || null;
}

export function createAuditLog(input) {
  const db = getDb();
  const id = input.id || `audit-${randomUUID().slice(0, 8)}`;
  db.prepare(`
    INSERT INTO audit_logs (
      id, actor_user_id, actor_email, action, target_type, target_id, status, details_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.actorUserId || null,
    input.actorEmail || null,
    input.action,
    input.targetType,
    input.targetId || null,
    input.status,
    JSON.stringify(input.details || {}),
    input.createdAt || currentTimestamp()
  );

  return getAuditLogs(1)[0];
}

export function getAuditLogs(limit = 50) {
  return getDb()
    .prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?")
    .all(limit)
    .map(mapAuditLog);
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

export function getInvestors() {
  return getDb()
    .prepare("SELECT * FROM investors ORDER BY created_at ASC")
    .all()
    .map(mapInvestor);
}

export function getInvestorById(id) {
  const row = getDb().prepare("SELECT * FROM investors WHERE id = ?").get(id);
  return row ? mapInvestor(row) : null;
}

export function findInvestorByEmail(email) {
  const row = getDb().prepare("SELECT * FROM investors WHERE email = ?").get(String(email || "").toLowerCase());
  return row ? mapInvestor(row) : null;
}

export function createInvestor(input) {
  const now = currentTimestamp();
  getDb().prepare(`
    INSERT INTO investors (
      id, name, email, wallet_alias, account_id, region, kyc_status, risk_tier, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.id,
    input.name,
    input.email.toLowerCase(),
    input.walletAlias,
    input.accountId || null,
    input.region,
    input.kycStatus,
    input.riskTier,
    input.createdAt || now,
    input.updatedAt || now
  );

  return getInvestorById(input.id);
}

export function getBondHoldings(limit = 100) {
  return getDb()
    .prepare(`
      SELECT
        h.*,
        b.name AS bond_name,
        i.name AS investor_name,
        i.email AS investor_email,
        i.wallet_alias,
        i.account_id,
        i.kyc_status
      FROM bond_holdings h
      JOIN bonds b ON b.id = h.bond_id
      JOIN investors i ON i.id = h.investor_id
      ORDER BY h.units DESC, h.updated_at DESC
      LIMIT ?
    `)
    .all(limit)
    .map(mapHolding);
}

export function getBondHoldingsByBondId(bondId) {
  return getDb()
    .prepare(`
      SELECT
        h.*,
        b.name AS bond_name,
        i.name AS investor_name,
        i.email AS investor_email,
        i.wallet_alias,
        i.account_id,
        i.kyc_status
      FROM bond_holdings h
      JOIN bonds b ON b.id = h.bond_id
      JOIN investors i ON i.id = h.investor_id
      WHERE h.bond_id = ?
      ORDER BY h.units DESC, h.updated_at DESC
    `)
    .all(bondId)
    .map(mapHolding);
}

export function getBondHoldingByInvestor(bondId, investorId) {
  const row = getDb()
    .prepare(`
      SELECT
        h.*,
        b.name AS bond_name,
        i.name AS investor_name,
        i.email AS investor_email,
        i.wallet_alias,
        i.account_id,
        i.kyc_status
      FROM bond_holdings h
      JOIN bonds b ON b.id = h.bond_id
      JOIN investors i ON i.id = h.investor_id
      WHERE h.bond_id = ? AND h.investor_id = ?
    `)
    .get(bondId, investorId);

  return row ? mapHolding(row) : null;
}

export function upsertBondHolding(input) {
  const existing = getBondHoldingByInvestor(input.bondId, input.investorId);
  const now = currentTimestamp();

  if (existing) {
    getDb().prepare(`
      UPDATE bond_holdings
      SET units = ?, cost_basis = ?, updated_at = ?
      WHERE id = ?
    `).run(input.units, input.costBasis, now, existing.id);

    return getBondHoldingByInvestor(input.bondId, input.investorId);
  }

  const id = input.id || `hold-${randomUUID().slice(0, 8)}`;
  getDb().prepare(`
    INSERT INTO bond_holdings (
      id, bond_id, investor_id, units, cost_basis, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.bondId, input.investorId, input.units, input.costBasis, now, now);

  return getBondHoldingByInvestor(input.bondId, input.investorId);
}

export function countBondHoldingRecipients(bondId) {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS count FROM bond_holdings WHERE bond_id = ? AND units > 0")
    .get(bondId);
  return Number(row?.count || 0);
}

export function listBondDistributionRecipients(bondId, payoutAmount) {
  const holdings = getBondHoldingsByBondId(bondId).filter((holding) => holding.units > 0);
  const totalUnits = holdings.reduce((sum, holding) => sum + holding.units, 0);

  return holdings.map((holding) => ({
    investorId: holding.investorId,
    investorName: holding.investorName,
    walletAlias: holding.walletAlias,
    units: holding.units,
    payoutAmount: totalUnits ? Math.round((payoutAmount * holding.units) / totalUnits) : 0
  }));
}

export function createPayoutRecord(input) {
  const id = input.id || `pay-${randomUUID().slice(0, 8)}`;
  getDb().prepare(`
    INSERT INTO payout_records (
      id, bond_id, investor_id, transaction_id, scheduled_tx_id, amount, units, status, network, integration_mode, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.bondId,
    input.investorId,
    input.transactionId,
    input.scheduledTxId || null,
    input.amount,
    input.units,
    input.status || "scheduled",
    input.network,
    input.integrationMode,
    input.createdAt || currentTimestamp()
  );

  return getPayoutRecords(1)[0];
}

export function getPayoutRecords(limit = 100) {
  return getDb()
    .prepare(`
      SELECT
        p.*,
        b.name AS bond_name,
        i.name AS investor_name,
        i.wallet_alias
      FROM payout_records p
      JOIN bonds b ON b.id = p.bond_id
      JOIN investors i ON i.id = p.investor_id
      ORDER BY p.created_at DESC
      LIMIT ?
    `)
    .all(limit)
    .map(mapPayoutRecord);
}

export function getPayoutRecordsByInvestorId(investorId, limit = 50) {
  return getDb()
    .prepare(`
      SELECT
        p.*,
        b.name AS bond_name,
        i.name AS investor_name,
        i.wallet_alias
      FROM payout_records p
      JOIN bonds b ON b.id = p.bond_id
      JOIN investors i ON i.id = p.investor_id
      WHERE p.investor_id = ?
      ORDER BY p.created_at DESC
      LIMIT ?
    `)
    .all(investorId, limit)
    .map(mapPayoutRecord);
}

export function getInvestorPortfolio(investorId) {
  const investor = getInvestorById(investorId);

  if (!investor) {
    return null;
  }

  const holdings = getDb()
    .prepare(`
      SELECT
        h.*,
        b.name AS bond_name,
        i.name AS investor_name,
        i.email AS investor_email,
        i.wallet_alias,
        i.account_id,
        i.kyc_status
      FROM bond_holdings h
      JOIN bonds b ON b.id = h.bond_id
      JOIN investors i ON i.id = h.investor_id
      WHERE h.investor_id = ?
      ORDER BY h.updated_at DESC
    `)
    .all(investorId)
    .map(mapHolding);
  const payouts = getPayoutRecordsByInvestorId(investorId);
  const transfers = getTransferRecordsByInvestorId(investorId);
  const listings = getMarketListingsByInvestorId(investorId);
  const invested = holdings.reduce((sum, holding) => sum + Number(holding.costBasis || 0), 0);
  const units = holdings.reduce((sum, holding) => sum + Number(holding.units || 0), 0);
  const distributed = payouts.reduce((sum, payout) => sum + Number(payout.amount || 0), 0);

  return {
    investor,
    holdings,
    payouts,
    transfers,
    listings,
    summary: {
      activePositions: holdings.length,
      totalUnits: units,
      investedCapital: invested,
      distributedYield: distributed,
      transferCount: transfers.length,
      openListings: listings.filter((listing) => listing.status === "open").length
    }
  };
}

export function createTransferRecord(input) {
  const id = input.id || `xfer-${randomUUID().slice(0, 8)}`;
  getDb().prepare(`
    INSERT INTO transfer_records (
      id, bond_id, token_id, from_investor_id, to_investor_id, from_account_id, to_account_id, units,
      transaction_id, hedera_tx_id, status, network, integration_mode, transfer_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.bondId,
    input.tokenId || null,
    input.fromInvestorId || null,
    input.toInvestorId || null,
    input.fromAccountId || null,
    input.toAccountId || null,
    input.units,
    input.transactionId,
    input.hederaTxId,
    input.status || "completed",
    input.network,
    input.integrationMode,
    input.transferType,
    input.createdAt || currentTimestamp()
  );

  return getTransferRecords(1)[0];
}

export function getTransferRecords(limit = 100) {
  return getDb()
    .prepare(`
      SELECT
        t.*,
        b.name AS bond_name,
        fi.name AS from_investor_name,
        ti.name AS to_investor_name
      FROM transfer_records t
      JOIN bonds b ON b.id = t.bond_id
      LEFT JOIN investors fi ON fi.id = t.from_investor_id
      LEFT JOIN investors ti ON ti.id = t.to_investor_id
      ORDER BY t.created_at DESC
      LIMIT ?
    `)
    .all(limit)
    .map(mapTransferRecord);
}

export function getTransferRecordsByInvestorId(investorId, limit = 50) {
  return getDb()
    .prepare(`
      SELECT
        t.*,
        b.name AS bond_name,
        fi.name AS from_investor_name,
        ti.name AS to_investor_name
      FROM transfer_records t
      JOIN bonds b ON b.id = t.bond_id
      LEFT JOIN investors fi ON fi.id = t.from_investor_id
      LEFT JOIN investors ti ON ti.id = t.to_investor_id
      WHERE t.from_investor_id = ? OR t.to_investor_id = ?
      ORDER BY t.created_at DESC
      LIMIT ?
    `)
    .all(investorId, investorId, limit)
    .map(mapTransferRecord);
}

export function createMarketListing(input) {
  const id = input.id || `list-${randomUUID().slice(0, 8)}`;
  const now = currentTimestamp();
  getDb().prepare(`
    INSERT INTO market_listings (
      id, bond_id, seller_investor_id, units, price_per_unit, status, buyer_investor_id, transaction_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.bondId,
    input.sellerInvestorId,
    input.units,
    input.pricePerUnit,
    input.status || "open",
    input.buyerInvestorId || null,
    input.transactionId || null,
    now,
    now
  );

  return getMarketListingById(id);
}

export function getMarketListings(limit = 100) {
  return getDb()
    .prepare(`
      SELECT
        l.*,
        b.name AS bond_name,
        s.name AS seller_name,
        buyer.name AS buyer_name
      FROM market_listings l
      JOIN bonds b ON b.id = l.bond_id
      JOIN investors s ON s.id = l.seller_investor_id
      LEFT JOIN investors buyer ON buyer.id = l.buyer_investor_id
      ORDER BY l.updated_at DESC
      LIMIT ?
    `)
    .all(limit)
    .map(mapMarketListing);
}

export function getMarketListingById(id) {
  const row = getDb()
    .prepare(`
      SELECT
        l.*,
        b.name AS bond_name,
        s.name AS seller_name,
        buyer.name AS buyer_name
      FROM market_listings l
      JOIN bonds b ON b.id = l.bond_id
      JOIN investors s ON s.id = l.seller_investor_id
      LEFT JOIN investors buyer ON buyer.id = l.buyer_investor_id
      WHERE l.id = ?
    `)
    .get(id);

  return row ? mapMarketListing(row) : null;
}

export function updateMarketListing(id, patch) {
  const existing = getMarketListingById(id);

  if (!existing) {
    return null;
  }

  const next = { ...existing, ...patch, updatedAt: currentTimestamp() };
  getDb().prepare(`
    UPDATE market_listings
    SET units = ?, price_per_unit = ?, status = ?, buyer_investor_id = ?, transaction_id = ?, updated_at = ?
    WHERE id = ?
  `).run(
    next.units,
    next.pricePerUnit,
    next.status,
    next.buyerInvestorId || null,
    next.transactionId || null,
    next.updatedAt,
    id
  );

  return getMarketListingById(id);
}

export function getMarketListingsByInvestorId(investorId, limit = 50) {
  return getDb()
    .prepare(`
      SELECT
        l.*,
        b.name AS bond_name,
        s.name AS seller_name,
        buyer.name AS buyer_name
      FROM market_listings l
      JOIN bonds b ON b.id = l.bond_id
      JOIN investors s ON s.id = l.seller_investor_id
      LEFT JOIN investors buyer ON buyer.id = l.buyer_investor_id
      WHERE l.seller_investor_id = ? OR l.buyer_investor_id = ?
      ORDER BY l.updated_at DESC
      LIMIT ?
    `)
    .all(investorId, investorId, limit)
    .map(mapMarketListing);
}
