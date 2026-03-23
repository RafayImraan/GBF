import { Router } from "express";
import {
  createAuditLog,
  computeOverviewKpis,
  createBond,
  createInvestor,
  createMarketListing,
  createPayoutRecord,
  createTransferRecord,
  createTransaction,
  createTruthEvent,
  getBondById,
  getBonds,
  getBondHoldings,
  getBondHoldingsByBondId,
  getInvestorById,
  getInvestorPortfolio,
  getInvestors,
  getMarketListingById,
  getMarketListings,
  getPayoutRecords,
  getProtocolOverview,
  getTransferRecords,
  getTransactions,
  getTruthEvents,
  getWalletLinks,
  getAuditLogs,
  countBondHoldingRecipients,
  findInvestorByEmail,
  getOpenReservedUnitsForInvestor,
  listBondDistributionRecipients,
  createWalletLink,
  updateWalletLink,
  updateMarketListing,
  upsertBondHolding,
  updateBond
} from "../lib/repository.js";
import { resetDatabase } from "../lib/db.js";
import { buildTelemetryReading, evaluateBondForDistribution } from "../services/guardianService.js";
import {
  importGuardianPolicyArtifact,
  listComplianceCases,
  listGuardianPolicies,
  publishGuardianPolicy,
  resolveComplianceCase,
  runGuardianComplianceReview
} from "../services/guardianPolicyService.js";
import {
  createConsensusTopic,
  createFractionalBondToken,
  hederaExecutionStatus,
  publishTruthStreamEvent,
  scheduleCouponDistribution,
  transferFractionalBondUnits
} from "../services/hederaService.js";
import { buildNarrative, computeProtocolHealth } from "../utils/stateTransforms.js";
import { normalizeBondInput } from "../utils/bondInput.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { canUseLiveSigning } from "../lib/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();

function getProtocolSnapshot() {
  const bonds = getBonds();
  const truthEvents = getTruthEvents();
  const transactions = getTransactions();
  const investors = getInvestors();
  const holdings = getBondHoldings();

  return { bonds, truthEvents, transactions, investors, holdings };
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

function assertInvestorScope(req, investorId) {
  if (req.auth.user.role === "investor" && req.auth.user.investorId !== investorId) {
    const error = new Error("Investor users can only act on their own positions.");
    error.statusCode = 403;
    throw error;
  }
}

function evaluateTransferPreflight({ bond, fromInvestor, toInvestor, units, excludeListingId = null }) {
  const issues = [];
  const warnings = [];
  const sourceHolding = fromInvestor ? getBondHoldingsByBondId(bond.id).find((holding) => holding.investorId === fromInvestor.id) : null;
  const reservedUnits = fromInvestor
    ? getOpenReservedUnitsForInvestor(bond.id, fromInvestor.id, excludeListingId)
    : 0;
  const availableUnits = sourceHolding ? Math.max(0, sourceHolding.units - reservedUnits) : 0;

  if (!bond.tokenId) {
    issues.push("Bond has not been fractionalized on HTS yet.");
  }

  if (fromInvestor) {
    if (fromInvestor.kycStatus !== "approved") {
      issues.push(`${fromInvestor.name} is not KYC approved.`);
    }

    if (!sourceHolding || availableUnits < units) {
      issues.push(`${fromInvestor.name} does not have enough available units.`);
    }

    if (!fromInvestor.accountId) {
      warnings.push(`${fromInvestor.name} does not have a Hedera account ID configured.`);
    }
  }

  if (toInvestor) {
    if (toInvestor.kycStatus !== "approved") {
      issues.push(`${toInvestor.name} is not KYC approved.`);
    }

    if (!toInvestor.accountId) {
      warnings.push(`${toInvestor.name} does not have a Hedera account ID configured.`);
    }

    if (toInvestor.riskTier === "conservative" && ["Carbon Capture"].includes(bond.category)) {
      issues.push(`${toInvestor.name}'s conservative mandate blocks ${bond.category} allocations.`);
    }

    if (toInvestor.region !== fromInvestor?.region) {
      warnings.push("Cross-border transfer detected. Compliance review may be required.");
    }
  }

  if (bond.progress < 60) {
    warnings.push("Bond impact progress is below 60%; secondary transfer should be reviewed.");
  }

  return {
    passed: issues.length === 0,
    issues,
    warnings,
    sourceHolding,
    reservedUnits,
    availableUnits
  };
}

router.get("/health", (_req, res) => {
  const snapshot = getProtocolSnapshot();

  res.json({
    ok: true,
    service: "gbf-server",
    network: process.env.HEDERA_NETWORK || "testnet",
    time: new Date().toISOString(),
    hederaConfigured: Boolean(process.env.HEDERA_OPERATOR_ID && process.env.HEDERA_OPERATOR_KEY),
    liveSigningEnabled: process.env.HEDERA_ENABLE_LIVE_SIGNING === "true",
    signer: hederaExecutionStatus(),
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
    signer: hederaExecutionStatus(),
    ...computeProtocolHealth(snapshot)
  });
});

router.get("/bonds", (_req, res) => {
  res.json({ items: getBonds() });
});

router.get("/investors", (_req, res) => {
  res.json({ items: getInvestors() });
});

router.get("/holdings", (req, res) => {
  const bondId = String(req.query?.bondId || "").trim();
  res.json({
    items: bondId ? getBondHoldingsByBondId(bondId) : getBondHoldings()
  });
});

router.get("/payouts", (_req, res) => {
  res.json({ items: getPayoutRecords() });
});

router.get("/transfers", (_req, res) => {
  res.json({ items: getTransferRecords() });
});

router.get("/wallet-links", requireRole(["admin", "operator"]), (_req, res) => {
  res.json({ items: getWalletLinks() });
});

router.get("/guardian/policies", requireRole(["admin", "operator"]), (_req, res) => {
  res.json({ items: listGuardianPolicies() });
});

router.get("/compliance/cases", requireRole(["admin", "operator"]), (_req, res) => {
  res.json({ items: listComplianceCases() });
});

router.get("/market/listings", (_req, res) => {
  res.json({ items: getMarketListings() });
});

router.get("/audit-logs/export", requireRole(["admin"]), (_req, res) => {
  res.setHeader("Content-Type", "text/csv");
  res.send(
    ["id,action,target_type,target_id,status,actor_email,created_at"]
      .concat(
        getAuditLogs().map((entry) =>
          [entry.id, entry.action, entry.targetType, entry.targetId || "", entry.status, entry.actorEmail || "", entry.createdAt]
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(",")
        )
      )
      .join("\n")
  );
});

router.get("/market/preflight", requireAuth, (req, res) => {
  try {
    const bond = requireBond(req.query?.bondId);
    const fromInvestor = req.query?.fromInvestorId ? getInvestorById(req.query.fromInvestorId) : null;
    const toInvestor = req.query?.toInvestorId ? getInvestorById(req.query.toInvestorId) : null;
    const units = Number(req.query?.units);

    if (!Number.isFinite(units) || units <= 0) {
      throw new Error("Units must be a positive number.");
    }

    if (fromInvestor) {
      assertInvestorScope(req, fromInvestor.id);
    }

    const preflight = evaluateTransferPreflight({
      bond,
      fromInvestor,
      toInvestor,
      units: Math.round(units)
    });

    res.json({
      ok: true,
      bond: {
        id: bond.id,
        name: bond.name,
        tokenId: bond.tokenId,
        category: bond.category
      },
      preflight
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "Unable to run transfer preflight."
    });
  }
});

router.get("/investors/:investorId/portfolio", (req, res) => {
  const portfolio = getInvestorPortfolio(req.params.investorId);

  if (!portfolio) {
    return res.status(404).json({
      ok: false,
      message: "Investor not found."
    });
  }

  return res.json({
    ok: true,
    ...portfolio
  });
});

router.get("/me/portfolio", requireAuth, (req, res) => {
  if (req.auth.user.role !== "investor" || !req.auth.user.investorId) {
    return res.status(403).json({
      ok: false,
      message: "Investor session required."
    });
  }

  const portfolio = getInvestorPortfolio(req.auth.user.investorId);

  if (!portfolio) {
    return res.status(404).json({
      ok: false,
      message: "Investor portfolio not found."
    });
  }

  return res.json({
    ok: true,
    ...portfolio
  });
});

router.post("/bonds", requireRole(["admin", "operator"]), rateLimit({ windowMs: 60 * 1000, limit: 12 }), async (req, res) => {
  try {
    const input = normalizeBondInput(req.body);
    let bond = createBond(input);
    const topicProvision = await createConsensusTopic(bond, {
      allowLiveSigning: canUseLiveSigning(req.auth.user)
    });
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
    createAuditLog({
      actorUserId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      action: "bond.onboard",
      targetType: "bond",
      targetId: bond.id,
      status: "success",
      details: {
        transactionId: transaction.id,
        integrationMode: transaction.integrationMode
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

router.post("/investors", requireRole(["admin", "operator"]), rateLimit({ windowMs: 60 * 1000, limit: 20 }), (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const walletAlias = String(req.body?.walletAlias || "").trim();
    const accountId = String(req.body?.accountId || "").trim();
    const region = String(req.body?.region || "").trim();
    const kycStatus = String(req.body?.kycStatus || "pending").trim().toLowerCase();
    const riskTier = String(req.body?.riskTier || "balanced").trim().toLowerCase();

    if (!name || !email || !walletAlias || !region) {
      throw new Error("Missing required investor fields.");
    }

    if (!["pending", "approved", "rejected"].includes(kycStatus)) {
      throw new Error("KYC status must be pending, approved, or rejected.");
    }

    if (!["conservative", "balanced", "income", "growth"].includes(riskTier)) {
      throw new Error("Risk tier must be conservative, balanced, income, or growth.");
    }

    if (findInvestorByEmail(email)) {
      throw new Error("An investor with that email already exists.");
    }

    const investor = createInvestor({
      id: `inv-${Date.now().toString(36)}`,
      name,
      email,
      walletAlias,
      accountId,
      region,
      kycStatus,
      riskTier
    });

    createAuditLog({
      actorUserId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      action: "investor.create",
      targetType: "investor",
      targetId: investor.id,
      status: "success",
      details: {
        email: investor.email,
        walletAlias: investor.walletAlias,
        kycStatus: investor.kycStatus
      }
    });

    res.status(201).json({
      ok: true,
      message: `Investor ${investor.name} onboarded successfully.`,
      investor
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to create investor."
    });
  }
});

router.post("/wallet-links", requireAuth, rateLimit({ windowMs: 60 * 1000, limit: 30 }), (req, res) => {
  try {
    const investor = getInvestorById(req.body?.investorId);

    if (!investor) {
      throw new Error("Investor not found.");
    }

    assertInvestorScope(req, investor.id);

    const walletLink = createWalletLink({
      investorId: investor.id,
      walletProvider: String(req.body?.walletProvider || "hedera-wallet").trim(),
      walletAddress: String(req.body?.walletAddress || "").trim(),
      accountId: String(req.body?.accountId || "").trim() || null,
      status: "pending",
      challengeNonce: `link-${Date.now()}`
    });

    res.status(201).json({
      ok: true,
      message: "Wallet link challenge created.",
      walletLink
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "Unable to create wallet link."
    });
  }
});

router.post("/wallet-links/:walletLinkId/verify", requireAuth, rateLimit({ windowMs: 60 * 1000, limit: 30 }), (req, res) => {
  try {
    const walletLink = updateWalletLink(req.params.walletLinkId, {
      status: "verified",
      challengeNonce: null
    });

    if (!walletLink) {
      throw new Error("Wallet link not found.");
    }

    assertInvestorScope(req, walletLink.investorId);

    res.json({
      ok: true,
      message: "Wallet link verified.",
      walletLink
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "Unable to verify wallet link."
    });
  }
});

router.post("/guardian/policies", requireRole(["admin", "operator"]), rateLimit({ windowMs: 60 * 1000, limit: 20 }), (req, res) => {
  try {
    const policy = importGuardianPolicyArtifact({
      bondId: req.body?.bondId || null,
      policyName: String(req.body?.policyName || "").trim(),
      version: String(req.body?.version || "1.0.0").trim(),
      methodology: String(req.body?.methodology || "").trim(),
      artifact: req.body?.artifact || {},
      status: "draft"
    });

    res.status(201).json({
      ok: true,
      message: "Guardian policy artifact imported.",
      policy
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to import Guardian policy."
    });
  }
});

router.post("/guardian/policies/:policyId/publish", requireRole(["admin", "operator"]), rateLimit({ windowMs: 60 * 1000, limit: 20 }), (req, res) => {
  try {
    const policy = publishGuardianPolicy(req.params.policyId);

    if (!policy) {
      throw new Error("Guardian policy not found.");
    }

    res.json({
      ok: true,
      message: "Guardian policy published.",
      policy
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to publish Guardian policy."
    });
  }
});

router.post("/compliance/cases/:caseId/resolve", requireRole(["admin", "operator"]), rateLimit({ windowMs: 60 * 1000, limit: 20 }), (req, res) => {
  try {
    const caseRecord = resolveComplianceCase(req.params.caseId, String(req.body?.resolutionNotes || "").trim());

    if (!caseRecord) {
      throw new Error("Compliance case not found.");
    }

    res.json({
      ok: true,
      message: "Compliance case resolved.",
      caseRecord
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to resolve compliance case."
    });
  }
});

router.post("/market/listings", requireAuth, rateLimit({ windowMs: 60 * 1000, limit: 30 }), (req, res) => {
  try {
    if (!["admin", "operator", "investor"].includes(req.auth.user.role)) {
      throw new Error("You do not have permission to create listings.");
    }

    const bond = requireBond(req.body?.bondId);
    const sellerInvestor = getInvestorById(req.body?.sellerInvestorId);
    const units = Number(req.body?.units);
    const pricePerUnit = Number(req.body?.pricePerUnit || bond.tokenPrice);

    if (!sellerInvestor) {
      throw new Error("Seller investor not found.");
    }

    assertInvestorScope(req, sellerInvestor.id);

    if (!Number.isFinite(units) || units <= 0) {
      throw new Error("Units must be a positive number.");
    }

    if (!Number.isFinite(pricePerUnit) || pricePerUnit <= 0) {
      throw new Error("Price per unit must be a positive number.");
    }

    const preflight = evaluateTransferPreflight({
      bond,
      fromInvestor: sellerInvestor,
      toInvestor: null,
      units: Math.round(units)
    });

    if (!preflight.passed) {
      runGuardianComplianceReview({
        bond,
        investor: sellerInvestor,
        listing: null,
        preflight
      });
      return res.status(400).json({
        ok: false,
        message: "Listing failed compliance preflight.",
        preflight
      });
    }

    const listing = createMarketListing({
      bondId: bond.id,
      sellerInvestorId: sellerInvestor.id,
      units: Math.round(units),
      pricePerUnit
    });

    createAuditLog({
      actorUserId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      action: "market.create_listing",
      targetType: "listing",
      targetId: listing.id,
      status: "success",
      details: {
        bondId: bond.id,
        sellerInvestorId: sellerInvestor.id,
        units: listing.units
      }
    });

    res.status(201).json({
      ok: true,
      message: `Listing created for ${listing.units.toLocaleString()} units of ${bond.name}.`,
      listing,
      preflight
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "Unable to create listing."
    });
  }
});

router.post("/market/listings/:listingId/cancel", requireAuth, rateLimit({ windowMs: 60 * 1000, limit: 30 }), (req, res) => {
  try {
    const listing = getMarketListingById(req.params.listingId);

    if (!listing) {
      throw new Error("Listing not found.");
    }

    if (listing.status !== "open") {
      throw new Error("Only open listings can be cancelled.");
    }

    assertInvestorScope(req, listing.sellerInvestorId);

    const updated = updateMarketListing(listing.id, {
      status: "cancelled"
    });

    createAuditLog({
      actorUserId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      action: "market.cancel_listing",
      targetType: "listing",
      targetId: listing.id,
      status: "success",
      details: {
        bondId: listing.bondId
      }
    });

    res.json({
      ok: true,
      message: "Listing cancelled.",
      listing: updated
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "Unable to cancel listing."
    });
  }
});

router.post("/market/listings/:listingId/fill", requireAuth, rateLimit({ windowMs: 60 * 1000, limit: 30 }), async (req, res) => {
  try {
    const listing = getMarketListingById(req.params.listingId);

    if (!listing) {
      throw new Error("Listing not found.");
    }

    if (listing.status !== "open") {
      throw new Error("Only open listings can be filled.");
    }

    const bond = requireBond(listing.bondId);
    const sellerInvestor = getInvestorById(listing.sellerInvestorId);
    const buyerInvestor = getInvestorById(req.body?.buyerInvestorId);

    if (!sellerInvestor || !buyerInvestor) {
      throw new Error("Seller or buyer investor not found.");
    }

    assertInvestorScope(req, buyerInvestor.id);

    const preflight = evaluateTransferPreflight({
      bond,
      fromInvestor: sellerInvestor,
      toInvestor: buyerInvestor,
      units: listing.units,
      excludeListingId: listing.id
    });

    if (!preflight.passed) {
      runGuardianComplianceReview({
        bond,
        investor: buyerInvestor,
        listing,
        preflight
      });
      return res.status(400).json({
        ok: false,
        message: "Listing fill failed compliance preflight.",
        preflight
      });
    }

    const transfer = await transferFractionalBondUnits(
      bond,
      {
        action: "fill-listing",
        units: listing.units,
        fromAccountId: sellerInvestor.accountId,
        toAccountId: buyerInvestor.accountId
      },
      {
        allowLiveSigning: canUseLiveSigning(req.auth.user)
      }
    );

    const sourceHolding = getBondHoldingsByBondId(bond.id).find((holding) => holding.investorId === sellerInvestor.id);
    const destinationHolding = getBondHoldingsByBondId(bond.id).find((holding) => holding.investorId === buyerInvestor.id);
    const updatedSource = upsertBondHolding({
      bondId: bond.id,
      investorId: sellerInvestor.id,
      units: sourceHolding.units - listing.units,
      costBasis: Math.max(0, sourceHolding.costBasis - listing.units * bond.tokenPrice)
    });
    const updatedDestination = upsertBondHolding({
      bondId: bond.id,
      investorId: buyerInvestor.id,
      units: (destinationHolding?.units || 0) + listing.units,
      costBasis: (destinationHolding?.costBasis || 0) + listing.units * listing.pricePerUnit
    });
    const holderCount = countBondHoldingRecipients(bond.id);
    const updatedBond = updateBond(bond.id, {
      walletHolders: holderCount
    });
    const transaction = createTransaction({
      bondId: bond.id,
      bondName: bond.name,
      action: "fill-listing",
      network: transfer.network,
      integrationMode: transfer.integrationMode,
      txId: transfer.txId,
      summary: `Filled listing for ${listing.units.toLocaleString()} units from ${sellerInvestor.name} to ${buyerInvestor.name}.`,
      details: {
        listingId: listing.id,
        sellerInvestorId: sellerInvestor.id,
        buyerInvestorId: buyerInvestor.id,
        pricePerUnit: listing.pricePerUnit,
        tokenId: bond.tokenId,
        fallbackReason: transfer.fallbackReason || null
      }
    });
    const transferRecord = createTransferRecord({
      bondId: bond.id,
      tokenId: bond.tokenId,
      fromInvestorId: sellerInvestor.id,
      toInvestorId: buyerInvestor.id,
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
      units: listing.units,
      transactionId: transaction.id,
      hederaTxId: transfer.txId,
      status: "completed",
      network: transfer.network,
      integrationMode: transfer.integrationMode,
      transferType: "listing_fill"
    });
    const updatedListing = updateMarketListing(listing.id, {
      status: "filled",
      buyerInvestorId: buyerInvestor.id,
      transactionId: transaction.id
    });

    createAuditLog({
      actorUserId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      action: "market.fill_listing",
      targetType: "listing",
      targetId: listing.id,
      status: "success",
      details: {
        buyerInvestorId: buyerInvestor.id,
        transactionId: transaction.id,
        transferRecordId: transferRecord.id
      }
    });

    res.json({
      ok: true,
      message: `Listing filled for ${buyerInvestor.name}.`,
      listing: updatedListing,
      sourceHolding: updatedSource,
      destinationHolding: updatedDestination,
      transaction,
      transfer: transferRecord,
      bond: updatedBond,
      preflight
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "Unable to fill listing."
    });
  }
});

router.get("/truth-stream", (_req, res) => {
  res.json({ items: getTruthEvents() });
});

router.get("/transactions", (_req, res) => {
  res.json({ items: getTransactions() });
});

router.get("/audit-logs", requireRole(["admin"]), (_req, res) => {
  res.json({ items: getAuditLogs() });
});

router.post("/actions/fractionalize", requireRole(["admin", "operator"]), rateLimit({ windowMs: 60 * 1000, limit: 20 }), async (req, res) => {
  try {
    const bond = requireBond(req.body?.bondId);
    const hedera = await createFractionalBondToken(bond, {
      allowLiveSigning: canUseLiveSigning(req.auth.user)
    });
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
    for (const recipient of recipients) {
      createPayoutRecord({
        bondId: bond.id,
        investorId: recipient.investorId,
        transactionId: transaction.id,
        scheduledTxId: hedera.scheduledTxId,
        amount: recipient.payoutAmount,
        units: recipient.units,
        network: hedera.network,
        integrationMode: hedera.integrationMode,
        status: "scheduled"
      });
    }
    createAuditLog({
      actorUserId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      action: "bond.fractionalize",
      targetType: "bond",
      targetId: bond.id,
      status: "success",
      details: {
        transactionId: transaction.id,
        integrationMode: transaction.integrationMode
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

router.post("/actions/distribute-yield", requireRole(["admin", "operator"]), rateLimit({ windowMs: 60 * 1000, limit: 20 }), async (req, res) => {
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
    const recipients = listBondDistributionRecipients(bond.id, payoutAmount);
    const recipientCount = recipients.length;
    const hedera = await scheduleCouponDistribution(
      {
        ...bond,
        walletHolders: recipientCount
      },
      payoutAmount,
      {
      allowLiveSigning: canUseLiveSigning(req.auth.user)
      }
    );
    const updatedBond = updateBond(bond.id, {
      walletHolders: recipientCount,
      status: "Distribution Window"
    });
    const transaction = createTransaction({
      bondId: bond.id,
      bondName: bond.name,
      action: "distribute-yield",
      network: hedera.network,
      integrationMode: hedera.integrationMode,
      txId: hedera.txId,
      summary: `Prepared coupon distribution for ${recipientCount.toLocaleString()} wallets.`,
      details: {
        scheduledTxId: hedera.scheduledTxId,
        recipients: hedera.recipients,
        amount: hedera.amount,
        guardianScore: guardian.score,
        allocations: recipients,
        fallbackReason: hedera.fallbackReason || null
      }
    });
    createAuditLog({
      actorUserId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      action: "bond.distribute_yield",
      targetType: "bond",
      targetId: bond.id,
      status: "success",
      details: {
        transactionId: transaction.id,
        integrationMode: transaction.integrationMode
      }
    });

    return res.json({
      ok: true,
      action: "distribute-yield",
      message: `${transaction.summary} ${transaction.integrationMode === "live" ? "Scheduled on Hedera." : "Recorded with fallback execution."}`,
      guardian,
      allocations: recipients,
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

router.post("/actions/allocate-holdings", requireRole(["admin", "operator"]), rateLimit({ windowMs: 60 * 1000, limit: 30 }), (req, res) => {
  try {
    const bond = requireBond(req.body?.bondId);
    const investor = getInvestorById(req.body?.investorId);
    const units = Number(req.body?.units);
    const costBasis = Number(req.body?.costBasis ?? units * bond.tokenPrice);

    if (!investor) {
      throw new Error("Investor not found.");
    }

    if (investor.kycStatus !== "approved") {
      throw new Error(`Investor ${investor.name} is not KYC approved.`);
    }

    if (!Number.isFinite(units) || units <= 0) {
      throw new Error("Units must be a positive number.");
    }

    const holding = upsertBondHolding({
      bondId: bond.id,
      investorId: investor.id,
      units: Math.round(units),
      costBasis: Number.isFinite(costBasis) ? costBasis : units * bond.tokenPrice
    });
    const holderCount = countBondHoldingRecipients(bond.id);
    const updatedBond = updateBond(bond.id, {
      walletHolders: holderCount
    });
    const transaction = createTransaction({
      bondId: bond.id,
      bondName: bond.name,
      action: "allocate-holdings",
      status: "completed",
      network: process.env.HEDERA_NETWORK || "testnet",
      integrationMode: "off-ledger",
      txId: `ALLOC-${Date.now()}`,
      summary: `Allocated ${holding.units.toLocaleString()} FBT units to ${investor.name}.`,
      details: {
        investorId: investor.id,
        investorName: investor.name,
        walletAlias: investor.walletAlias,
        units: holding.units,
        costBasis: holding.costBasis,
        holderCount
      }
    });

    createAuditLog({
      actorUserId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      action: "bond.allocate_holdings",
      targetType: "bond",
      targetId: bond.id,
      status: "success",
      details: {
        investorId: investor.id,
        transactionId: transaction.id,
        units: holding.units
      }
    });

    res.json({
      ok: true,
      message: `Allocated ${holding.units.toLocaleString()} units of ${bond.name} to ${investor.name}.`,
      holding,
      transaction,
      bond: updatedBond
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "Unable to allocate holdings."
    });
  }
});

router.post("/actions/settle-allocation", requireRole(["admin", "operator"]), rateLimit({ windowMs: 60 * 1000, limit: 30 }), async (req, res) => {
  try {
    const bond = requireBond(req.body?.bondId);
    const investor = getInvestorById(req.body?.investorId);
    const units = Number(req.body?.units);

    if (!investor) {
      throw new Error("Investor not found.");
    }

    if (!bond.tokenId) {
      throw new Error("Bond must be fractionalized before settlement.");
    }

    if (!investor.accountId) {
      throw new Error(`Investor ${investor.name} does not have a Hedera account ID.`);
    }

    if (!Number.isFinite(units) || units <= 0) {
      throw new Error("Units must be a positive number.");
    }

    const transfer = await transferFractionalBondUnits(
      bond,
      {
        action: "settle-allocation",
        units: Math.round(units),
        fromAccountId: bond.treasuryAccountId || process.env.HEDERA_TREASURY_ACCOUNT_ID,
        toAccountId: investor.accountId
      },
      {
        allowLiveSigning: canUseLiveSigning(req.auth.user)
      }
    );

    const existingHolding = getBondHoldingsByBondId(bond.id).find((holding) => holding.investorId === investor.id);
    const nextUnits = (existingHolding?.units || 0) + Math.round(units);
    const holding = upsertBondHolding({
      bondId: bond.id,
      investorId: investor.id,
      units: nextUnits,
      costBasis: (existingHolding?.costBasis || 0) + Math.round(units) * bond.tokenPrice
    });
    const holderCount = countBondHoldingRecipients(bond.id);
    const updatedBond = updateBond(bond.id, {
      walletHolders: holderCount
    });
    const transaction = createTransaction({
      bondId: bond.id,
      bondName: bond.name,
      action: "settle-allocation",
      network: transfer.network,
      integrationMode: transfer.integrationMode,
      txId: transfer.txId,
      summary: `Settled ${Math.round(units).toLocaleString()} FBT units to ${investor.name}.`,
      details: {
        investorId: investor.id,
        investorName: investor.name,
        fromAccountId: transfer.fromAccountId,
        toAccountId: transfer.toAccountId,
        tokenId: bond.tokenId,
        units: Math.round(units),
        fallbackReason: transfer.fallbackReason || null
      }
    });
    const transferRecord = createTransferRecord({
      bondId: bond.id,
      tokenId: bond.tokenId,
      fromInvestorId: null,
      toInvestorId: investor.id,
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
      units: Math.round(units),
      transactionId: transaction.id,
      hederaTxId: transfer.txId,
      status: "completed",
      network: transfer.network,
      integrationMode: transfer.integrationMode,
      transferType: "primary_settlement"
    });

    createAuditLog({
      actorUserId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      action: "bond.settle_allocation",
      targetType: "bond",
      targetId: bond.id,
      status: "success",
      details: {
        investorId: investor.id,
        transactionId: transaction.id,
        transferRecordId: transferRecord.id,
        units: Math.round(units)
      }
    });

    res.json({
      ok: true,
      message: `Settled ${Math.round(units).toLocaleString()} units of ${bond.name} to ${investor.name}.`,
      holding,
      transfer: transferRecord,
      transaction,
      bond: updatedBond
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "Unable to settle allocation."
    });
  }
});

router.post("/actions/transfer-holdings", requireRole(["admin", "operator"]), rateLimit({ windowMs: 60 * 1000, limit: 30 }), async (req, res) => {
  try {
    const bond = requireBond(req.body?.bondId);
    const fromInvestor = getInvestorById(req.body?.fromInvestorId);
    const toInvestor = getInvestorById(req.body?.toInvestorId);
    const units = Number(req.body?.units);

    if (!fromInvestor || !toInvestor) {
      throw new Error("Both source and destination investors are required.");
    }

    if (fromInvestor.id === toInvestor.id) {
      throw new Error("Source and destination investors must be different.");
    }

    if (!bond.tokenId) {
      throw new Error("Bond must be fractionalized before secondary transfers.");
    }

    if (!fromInvestor.accountId || !toInvestor.accountId) {
      throw new Error("Both investors must have Hedera account IDs.");
    }

    if (!Number.isFinite(units) || units <= 0) {
      throw new Error("Units must be a positive number.");
    }

    const sourceHolding = getBondHoldingsByBondId(bond.id).find((holding) => holding.investorId === fromInvestor.id);
    const reservedUnits = getOpenReservedUnitsForInvestor(bond.id, fromInvestor.id);
    const availableUnits = Math.max(0, (sourceHolding?.units || 0) - reservedUnits);

    if (!sourceHolding || availableUnits < Math.round(units)) {
      throw new Error(`${fromInvestor.name} does not have enough available units for this transfer.`);
    }

    const transfer = await transferFractionalBondUnits(
      bond,
      {
        action: "transfer-holdings",
        units: Math.round(units),
        fromAccountId: fromInvestor.accountId,
        toAccountId: toInvestor.accountId
      },
      {
        allowLiveSigning: canUseLiveSigning(req.auth.user)
      }
    );

    const destinationHolding = getBondHoldingsByBondId(bond.id).find((holding) => holding.investorId === toInvestor.id);
    const updatedSource = upsertBondHolding({
      bondId: bond.id,
      investorId: fromInvestor.id,
      units: sourceHolding.units - Math.round(units),
      costBasis: Math.max(0, sourceHolding.costBasis - Math.round(units) * bond.tokenPrice)
    });
    const updatedDestination = upsertBondHolding({
      bondId: bond.id,
      investorId: toInvestor.id,
      units: (destinationHolding?.units || 0) + Math.round(units),
      costBasis: (destinationHolding?.costBasis || 0) + Math.round(units) * bond.tokenPrice
    });
    const holderCount = countBondHoldingRecipients(bond.id);
    const updatedBond = updateBond(bond.id, {
      walletHolders: holderCount
    });
    const transaction = createTransaction({
      bondId: bond.id,
      bondName: bond.name,
      action: "transfer-holdings",
      network: transfer.network,
      integrationMode: transfer.integrationMode,
      txId: transfer.txId,
      summary: `Transferred ${Math.round(units).toLocaleString()} FBT units from ${fromInvestor.name} to ${toInvestor.name}.`,
      details: {
        fromInvestorId: fromInvestor.id,
        toInvestorId: toInvestor.id,
        fromAccountId: transfer.fromAccountId,
        toAccountId: transfer.toAccountId,
        tokenId: bond.tokenId,
        units: Math.round(units),
        fallbackReason: transfer.fallbackReason || null
      }
    });
    const transferRecord = createTransferRecord({
      bondId: bond.id,
      tokenId: bond.tokenId,
      fromInvestorId: fromInvestor.id,
      toInvestorId: toInvestor.id,
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
      units: Math.round(units),
      transactionId: transaction.id,
      hederaTxId: transfer.txId,
      status: "completed",
      network: transfer.network,
      integrationMode: transfer.integrationMode,
      transferType: "secondary_transfer"
    });

    createAuditLog({
      actorUserId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      action: "bond.transfer_holdings",
      targetType: "bond",
      targetId: bond.id,
      status: "success",
      details: {
        fromInvestorId: fromInvestor.id,
        toInvestorId: toInvestor.id,
        transactionId: transaction.id,
        transferRecordId: transferRecord.id,
        units: Math.round(units)
      }
    });

    res.json({
      ok: true,
      message: `Transferred ${Math.round(units).toLocaleString()} units from ${fromInvestor.name} to ${toInvestor.name}.`,
      sourceHolding: updatedSource,
      destinationHolding: updatedDestination,
      transfer: transferRecord,
      transaction,
      bond: updatedBond
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "Unable to transfer holdings."
    });
  }
});

router.post("/actions/sync-impact", requireRole(["admin", "operator"]), rateLimit({ windowMs: 60 * 1000, limit: 30 }), async (req, res) => {
  try {
    let bond = requireBond(req.body?.bondId);

    if (!bond.topicId) {
      const topicProvision = await createConsensusTopic(bond, {
        allowLiveSigning: canUseLiveSigning(req.auth.user)
      });
      bond = updateBond(bond.id, {
        topicId: topicProvision.topicId,
        onboardingTxId: topicProvision.txId,
        onboardingMode: topicProvision.integrationMode
      });
    }

    const telemetry = buildTelemetryReading(bond);
    const nextSequence = (getTruthEvents(1)[0]?.topicSequence || 188400) + 1;
    const hedera = await publishTruthStreamEvent(bond, telemetry, nextSequence, {
      allowLiveSigning: canUseLiveSigning(req.auth.user)
    });
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
    createAuditLog({
      actorUserId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      action: "bond.sync_impact",
      targetType: "bond",
      targetId: bond.id,
      status: "success",
      details: {
        transactionId: transaction.id,
        eventId: event.id,
        integrationMode: transaction.integrationMode
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

router.post("/demo/reset", requireRole(["admin"]), rateLimit({ windowMs: 60 * 1000, limit: 5 }), (req, res) => {
  resetDatabase();
  const snapshot = getProtocolSnapshot();
  createAuditLog({
    actorUserId: req.auth.user.id,
    actorEmail: req.auth.user.email,
    action: "system.reset_database",
    targetType: "system",
    status: "success"
  });

  res.json({
    ok: true,
    message: "SQL database reset to the GBF seed dataset.",
    totals: computeProtocolHealth(snapshot)
  });
});

export default router;
