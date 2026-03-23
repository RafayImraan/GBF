import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "url";
import { bondSeeds, investorSeeds, holdingSeeds, protocolOverviewSeed } from "../data/seed.js";
import { hashPassword } from "./auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../../data");
const databaseFilePath = path.join(dataDir, "gbf.sqlite");

let database;

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function currentTimestamp() {
  return new Date().toISOString();
}

function initializeSchema(db) {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS protocol_overview (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      project_title TEXT NOT NULL,
      ticker TEXT NOT NULL,
      network TEXT NOT NULL,
      asset_layer TEXT NOT NULL,
      trust_layer TEXT NOT NULL,
      audit_trail TEXT NOT NULL,
      thesis TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bonds (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      issuer TEXT NOT NULL,
      category TEXT NOT NULL,
      face_value INTEGER NOT NULL,
      token_price REAL NOT NULL,
      coupon_rate REAL NOT NULL,
      maturity TEXT NOT NULL,
      verified_impact TEXT NOT NULL,
      impact_metric TEXT NOT NULL,
      progress INTEGER NOT NULL,
      liquidity_score INTEGER NOT NULL,
      token_id TEXT,
      topic_id TEXT,
      guardian_policy TEXT NOT NULL,
      status TEXT NOT NULL,
      wallet_holders INTEGER NOT NULL,
      treasury_account_id TEXT,
      telemetry_unit TEXT NOT NULL,
      telemetry_base_value REAL NOT NULL,
      onboarding_tx_id TEXT,
      onboarding_mode TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS truth_events (
      id TEXT PRIMARY KEY,
      bond_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      source TEXT NOT NULL,
      project TEXT NOT NULL,
      metric TEXT NOT NULL,
      value TEXT NOT NULL,
      guardian_score INTEGER NOT NULL,
      topic_sequence INTEGER NOT NULL,
      status TEXT NOT NULL,
      topic_id TEXT,
      tx_id TEXT NOT NULL,
      integration_mode TEXT NOT NULL,
      FOREIGN KEY (bond_id) REFERENCES bonds(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      bond_id TEXT NOT NULL,
      bond_name TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      network TEXT NOT NULL,
      integration_mode TEXT NOT NULL,
      tx_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      details_json TEXT NOT NULL,
      FOREIGN KEY (bond_id) REFERENCES bonds(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT,
      actor_email TEXT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      status TEXT NOT NULL,
      details_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS investors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      wallet_alias TEXT NOT NULL,
      account_id TEXT,
      region TEXT NOT NULL,
      kyc_status TEXT NOT NULL,
      risk_tier TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bond_holdings (
      id TEXT PRIMARY KEY,
      bond_id TEXT NOT NULL,
      investor_id TEXT NOT NULL,
      units INTEGER NOT NULL,
      cost_basis REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (bond_id, investor_id),
      FOREIGN KEY (bond_id) REFERENCES bonds(id),
      FOREIGN KEY (investor_id) REFERENCES investors(id)
    );

    CREATE TABLE IF NOT EXISTS payout_records (
      id TEXT PRIMARY KEY,
      bond_id TEXT NOT NULL,
      investor_id TEXT NOT NULL,
      transaction_id TEXT NOT NULL,
      scheduled_tx_id TEXT,
      amount REAL NOT NULL,
      units INTEGER NOT NULL,
      status TEXT NOT NULL,
      network TEXT NOT NULL,
      integration_mode TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (bond_id) REFERENCES bonds(id),
      FOREIGN KEY (investor_id) REFERENCES investors(id),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );

    CREATE TABLE IF NOT EXISTS transfer_records (
      id TEXT PRIMARY KEY,
      bond_id TEXT NOT NULL,
      token_id TEXT,
      from_investor_id TEXT,
      to_investor_id TEXT,
      from_account_id TEXT,
      to_account_id TEXT,
      units INTEGER NOT NULL,
      transaction_id TEXT NOT NULL,
      hedera_tx_id TEXT NOT NULL,
      status TEXT NOT NULL,
      network TEXT NOT NULL,
      integration_mode TEXT NOT NULL,
      transfer_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (bond_id) REFERENCES bonds(id),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );

    CREATE TABLE IF NOT EXISTS market_listings (
      id TEXT PRIMARY KEY,
      bond_id TEXT NOT NULL,
      seller_investor_id TEXT NOT NULL,
      units INTEGER NOT NULL,
      price_per_unit REAL NOT NULL,
      status TEXT NOT NULL,
      buyer_investor_id TEXT,
      transaction_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (bond_id) REFERENCES bonds(id),
      FOREIGN KEY (seller_investor_id) REFERENCES investors(id),
      FOREIGN KEY (buyer_investor_id) REFERENCES investors(id),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );

    CREATE TABLE IF NOT EXISTS wallet_links (
      id TEXT PRIMARY KEY,
      investor_id TEXT NOT NULL,
      wallet_provider TEXT NOT NULL,
      wallet_address TEXT NOT NULL,
      account_id TEXT,
      status TEXT NOT NULL,
      challenge_nonce TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (investor_id, wallet_address),
      FOREIGN KEY (investor_id) REFERENCES investors(id)
    );

    CREATE TABLE IF NOT EXISTS guardian_policies (
      id TEXT PRIMARY KEY,
      bond_id TEXT,
      policy_name TEXT NOT NULL,
      version TEXT NOT NULL,
      status TEXT NOT NULL,
      methodology TEXT NOT NULL,
      artifact_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (bond_id) REFERENCES bonds(id)
    );

    CREATE TABLE IF NOT EXISTS compliance_cases (
      id TEXT PRIMARY KEY,
      bond_id TEXT,
      investor_id TEXT,
      listing_id TEXT,
      case_type TEXT NOT NULL,
      status TEXT NOT NULL,
      severity TEXT NOT NULL,
      summary TEXT NOT NULL,
      details_json TEXT NOT NULL,
      resolution_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (bond_id) REFERENCES bonds(id),
      FOREIGN KEY (investor_id) REFERENCES investors(id),
      FOREIGN KEY (listing_id) REFERENCES market_listings(id)
    );
  `);

  const userColumns = db.prepare("PRAGMA table_info(users)").all();
  const hasInvestorId = userColumns.some((column) => column.name === "investor_id");

  if (!hasInvestorId) {
    db.exec("ALTER TABLE users ADD COLUMN investor_id TEXT;");
  }
}

function seedDatabase(db) {
  const now = currentTimestamp();
  const existingOverview = db.prepare("SELECT COUNT(*) AS count FROM protocol_overview").get();

  if (!existingOverview.count) {
    db.prepare(`
      INSERT INTO protocol_overview (
        id, project_title, ticker, network, asset_layer, trust_layer, audit_trail, thesis, created_at, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      protocolOverviewSeed.projectTitle,
      protocolOverviewSeed.ticker,
      protocolOverviewSeed.network,
      protocolOverviewSeed.assetLayer,
      protocolOverviewSeed.trustLayer,
      protocolOverviewSeed.auditTrail,
      protocolOverviewSeed.thesis,
      now,
      now
    );
  }

  const existingBonds = db.prepare("SELECT COUNT(*) AS count FROM bonds").get();

  if (!existingBonds.count) {
    const insertBond = db.prepare(`
      INSERT INTO bonds (
        id, name, issuer, category, face_value, token_price, coupon_rate, maturity, verified_impact,
        impact_metric, progress, liquidity_score, token_id, topic_id, guardian_policy, status, wallet_holders,
        treasury_account_id, telemetry_unit, telemetry_base_value, onboarding_tx_id, onboarding_mode, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const bond of bondSeeds) {
      insertBond.run(
        bond.id,
        bond.name,
        bond.issuer,
        bond.category,
        bond.faceValue,
        bond.tokenPrice,
        bond.couponRate,
        bond.maturity,
        bond.verifiedImpact,
        bond.impactMetric,
        bond.progress,
        bond.liquidityScore,
        bond.tokenId,
        bond.topicId,
        bond.guardianPolicy,
        bond.status,
        bond.walletHolders,
        bond.treasuryAccountId,
        bond.telemetryUnit,
        bond.telemetryBaseValue,
        bond.onboardingTxId,
        bond.onboardingMode,
        now,
        now
      );
    }
  }

  const existingUsers = db.prepare("SELECT COUNT(*) AS count FROM users").get();

  if (!existingUsers.count) {
    const email = process.env.GBF_ADMIN_EMAIL || "admin@gbf.local";
    const password = process.env.GBF_ADMIN_PASSWORD || "ChangeMe123!";
    const name = process.env.GBF_ADMIN_NAME || "GBF Admin";
    db.prepare(`
      INSERT INTO users (id, email, name, role, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      "user-admin",
      email.toLowerCase(),
      name,
      "admin",
      hashPassword(password),
      now,
      now
    );
  }

  const existingInvestors = db.prepare("SELECT COUNT(*) AS count FROM investors").get();

  if (!existingInvestors.count) {
    const insertInvestor = db.prepare(`
      INSERT INTO investors (
        id, name, email, wallet_alias, account_id, region, kyc_status, risk_tier, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const investor of investorSeeds) {
      insertInvestor.run(
        investor.id,
        investor.name,
        investor.email,
        investor.walletAlias,
        investor.accountId || null,
        investor.region,
        investor.kycStatus,
        investor.riskTier,
        now,
        now
      );
    }
  }

  const existingHoldings = db.prepare("SELECT COUNT(*) AS count FROM bond_holdings").get();

  if (!existingHoldings.count) {
    const insertHolding = db.prepare(`
      INSERT INTO bond_holdings (
        id, bond_id, investor_id, units, cost_basis, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const holding of holdingSeeds) {
      insertHolding.run(
        holding.id,
        holding.bondId,
        holding.investorId,
        holding.units,
        holding.costBasis,
        now,
        now
      );
    }
  }
}

export function getDb() {
  if (!database) {
    ensureDataDir();
    database = new DatabaseSync(databaseFilePath);
    initializeSchema(database);
    seedDatabase(database);
  }

  return database;
}

export function resetDatabase() {
  const db = getDb();
  db.exec(`
    DELETE FROM sessions;
    DELETE FROM users;
    DELETE FROM audit_logs;
    DELETE FROM payout_records;
    DELETE FROM transfer_records;
    DELETE FROM market_listings;
    DELETE FROM wallet_links;
    DELETE FROM guardian_policies;
    DELETE FROM compliance_cases;
    DELETE FROM bond_holdings;
    DELETE FROM investors;
    DELETE FROM transactions;
    DELETE FROM truth_events;
    DELETE FROM bonds;
    DELETE FROM protocol_overview;
  `);
  seedDatabase(db);
  return db;
}

export { currentTimestamp, databaseFilePath };
