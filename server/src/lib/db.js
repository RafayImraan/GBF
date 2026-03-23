import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "url";
import { bondSeeds, protocolOverviewSeed } from "../data/seed.js";

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
  `);
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
    DELETE FROM transactions;
    DELETE FROM truth_events;
    DELETE FROM bonds;
    DELETE FROM protocol_overview;
  `);
  seedDatabase(db);
  return db;
}

export { currentTimestamp, databaseFilePath };
