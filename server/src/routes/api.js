import { Router } from "express";
import {
  computeOverviewKpis,
  createBond,
  createTransaction,
  createTruthEvent,
  getBondById,
  getBonds,
  getProtocolOverview,
  getTransactions,
  getTruthEvents,
  updateBond
} from "../lib/repository.js";
import { resetDatabase } from "../lib/db.js";
import { buildTelemetryReading, evaluateBondForDistribution } from "../services/guardianService.js";
import {
  createConsensusTopic,
  createFractionalBondToken,
  publishTruthStreamEvent,
  scheduleCouponDistribution
} from "../services/hederaService.js";
import { buildNarrative, computeProtocolHealth } from "../utils/stateTransforms.js";
import { normalizeBondInput } from "../utils/bondInput.js";

const router = Router();

function getProtocolSnapshot() {
  const bonds = getBonds();
  const truthEvents = getTruthEvents();
  const transactions = getTransactions();

  return { bonds, truthEvents, transactions };
}

function requireBond(id) {
  const bond = getBondById(id);

  if (!bond) {
    const error = new Error("Bond not found.");
    error.statusCode = 404;
    throw error;
  }

  return bond;
}

router.get("/health", (_req, res) => {
  const snapshot = getProtocolSnapshot();

  res.json({
    ok: true,
    service: "gbf-server",
    network: process.env.HEDERA_NETWORK || "testnet",
    time: new Date().toISOString(),
    hederaConfigured: Boolean(process.env.HEDERA_OPERATOR_ID && process.env.HEDERA_OPERATOR_KEY),
    protocolHealth: computeProtocolHealth(snapshot)
  });
});

router.get("/overview", (_req, res) => {
  const overview = getProtocolOverview();
  const snapshot = getProtocolSnapshot();

  res.json({
    ...overview,
    kpis: computeOverviewKpis(),
    narrative: buildNarrative(),
    ...computeProtocolHealth(snapshot)
  });
});

router.get("/bonds", (_req, res) => {
  res.json({ items: getBonds() });
});

router.post("/bonds", async (req, res) => {
  try {
    const input = normalizeBondInput(req.body);
    let bond = createBond(input);
    const topicProvision = await createConsensusTopic(bond);
    bond = updateBond(bond.id, {
      topicId: topicProvision.topicId,
      onboardingTxId: topicProvision.txId,
      onboardingMode: topicProvision.integrationMode,
      status: "Monitoring"
    });

    const transaction = createTransaction({
      bondId: bond.id,
      bondName: bond.name,
      action: "onboard-bond",
      network: topicProvision.network,
      integrationMode: topicProvision.integrationMode,
      txId: topicProvision.txId,
      summary: `Onboarded ${bond.name} and provisioned its Truth Stream.`,
      details: {
        topicId: topicProvision.topicId,
        fallbackReason: topicProvision.fallbackReason || null
      }
    });

    res.status(201).json({
      ok: true,
      message: `Bond onboarded successfully.${topicProvision.integrationMode === "live" ? " Hedera topic created." : " Running in fallback mode until live infrastructure succeeds."}`,
      bond,
      transaction
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "Unable to onboard bond."
    });
  }
});

router.get("/truth-stream", (_req, res) => {
  res.json({ items: getTruthEvents() });
});

router.get("/transactions", (_req, res) => {
  res.json({ items: getTransactions() });
});

router.post("/actions/fractionalize", async (req, res) => {
  try {
    const bond = requireBond(req.body?.bondId);
    const hedera = await createFractionalBondToken(bond);
    const updatedBond = updateBond(bond.id, {
      tokenId: hedera.tokenId || bond.tokenId,
      treasuryAccountId: hedera.treasuryAccountId || bond.treasuryAccountId,
      status: bond.progress >= 80 ? "Yield Ready" : "Monitoring"
    });
    const transaction = createTransaction({
      bondId: bond.id,
      bondName: bond.name,
      action: "fractionalize",
      network: hedera.network,
      integrationMode: hedera.integrationMode,
      txId: hedera.txId,
      summary: `Minted ${bond.faceValue.toLocaleString()} $1 FBT units.`,
      details: {
        tokenId: updatedBond.tokenId,
        topicId: updatedBond.topicId,
        treasuryAccountId: updatedBond.treasuryAccountId,
        mintedFractions: hedera.mintedFractions,
        fallbackReason: hedera.fallbackReason || null
      }
    });

    res.json({
      ok: true,
      action: "fractionalize",
      message: `${transaction.summary} ${transaction.integrationMode === "live" ? "Submitted to Hedera." : "Stored with fallback execution because live provisioning did not complete."}`,
      transaction,
      bond: updatedBond
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "Unable to fractionalize bond."
    });
  }
});

router.post("/actions/distribute-yield", async (req, res) => {
  try {
    const bond = requireBond(req.body?.bondId);
    const guardian = evaluateBondForDistribution(bond);

    if (!guardian.passed) {
      return res.status(400).json({
        ok: false,
        message: `Guardian policy did not clear ${bond.name} for coupon distribution.`,
        guardian
      });
    }

    const payoutAmount = Math.round(bond.faceValue * (bond.couponRate / 100) * 0.5);
    const hedera = await scheduleCouponDistribution(bond, payoutAmount);
    const updatedBond = updateBond(bond.id, {
      status: "Distribution Window"
    });
    const transaction = createTransaction({
      bondId: bond.id,
      bondName: bond.name,
      action: "distribute-yield",
      network: hedera.network,
      integrationMode: hedera.integrationMode,
      txId: hedera.txId,
      summary: `Prepared coupon distribution for ${bond.walletHolders.toLocaleString()} wallets.`,
      details: {
        scheduledTxId: hedera.scheduledTxId,
        recipients: hedera.recipients,
        amount: hedera.amount,
        guardianScore: guardian.score,
        fallbackReason: hedera.fallbackReason || null
      }
    });

    return res.json({
      ok: true,
      action: "distribute-yield",
      message: `${transaction.summary} ${transaction.integrationMode === "live" ? "Scheduled on Hedera." : "Recorded with fallback execution."}`,
      guardian,
      transaction,
      bond: updatedBond
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "Unable to distribute yield."
    });
  }
});

router.post("/actions/sync-impact", async (req, res) => {
  try {
    let bond = requireBond(req.body?.bondId);

    if (!bond.topicId) {
      const topicProvision = await createConsensusTopic(bond);
      bond = updateBond(bond.id, {
        topicId: topicProvision.topicId,
        onboardingTxId: topicProvision.txId,
        onboardingMode: topicProvision.integrationMode
      });
    }

    const telemetry = buildTelemetryReading(bond);
    const nextSequence = (getTruthEvents(1)[0]?.topicSequence || 188400) + 1;
    const hedera = await publishTruthStreamEvent(bond, telemetry, nextSequence);
    const nextProgress = Math.min(99, bond.progress + (bond.progress < 80 ? 4 : 2));
    const nextStatus =
      nextProgress >= 90 ? "Distribution Window" : nextProgress >= 80 ? "Yield Ready" : "Monitoring";
    const updatedBond = updateBond(bond.id, {
      progress: nextProgress,
      status: nextStatus,
      verifiedImpact: `${telemetry.value} ${bond.telemetryUnit} latest checkpoint`
    });
    const event = createTruthEvent({
      bondId: bond.id,
      source: telemetry.source,
      project: bond.name,
      metric: telemetry.metric,
      value: telemetry.value,
      guardianScore: telemetry.guardianScore,
      topicSequence: hedera.sequenceNumber,
      topicId: updatedBond.topicId,
      txId: hedera.txId,
      integrationMode: hedera.integrationMode
    });
    const transaction = createTransaction({
      bondId: bond.id,
      bondName: bond.name,
      action: "sync-impact",
      network: hedera.network,
      integrationMode: hedera.integrationMode,
      txId: hedera.txId,
      summary: "Published verified telemetry event to the Truth Stream.",
      details: {
        topicId: updatedBond.topicId,
        guardianScore: telemetry.guardianScore,
        topicSequence: hedera.sequenceNumber,
        metric: telemetry.metric,
        value: telemetry.value,
        fallbackReason: hedera.fallbackReason || null
      }
    });

    res.json({
      ok: true,
      action: "sync-impact",
      message: `Published fresh ${bond.impactMetric} telemetry for ${bond.name}.`,
      guardian: {
        policyId: bond.guardianPolicy,
        compliance: "pass",
        score: telemetry.guardianScore
      },
      consensus: {
        topicId: updatedBond.topicId,
        sequence: hedera.sequenceNumber
      },
      event,
      transaction,
      bond: updatedBond
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "Unable to sync impact."
    });
  }
});

router.post("/demo/reset", (_req, res) => {
  resetDatabase();
  const snapshot = getProtocolSnapshot();

  res.json({
    ok: true,
    message: "SQL database reset to the GBF seed dataset.",
    totals: computeProtocolHealth(snapshot)
  });
});

export default router;
