let sdkPromise;

async function loadSdk() {
  if (!sdkPromise) {
    sdkPromise = import("@hashgraph/sdk").catch(() => null);
  }

  return sdkPromise;
}

function operatorConfigured() {
  return Boolean(process.env.HEDERA_OPERATOR_ID && process.env.HEDERA_OPERATOR_KEY);
}

async function buildClient() {
  const sdk = await loadSdk();

  if (!sdk || !operatorConfigured()) {
    return null;
  }

  const { Client, PrivateKey } = sdk;
  const network = (process.env.HEDERA_NETWORK || "testnet").toLowerCase();
  const client = network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
  client.setOperator(process.env.HEDERA_OPERATOR_ID, PrivateKey.fromStringED25519(process.env.HEDERA_OPERATOR_KEY));
  return { sdk, client, network };
}

function simulatedId(prefix) {
  return `${prefix}-${Date.now()}`;
}

function toFallback(action, payload, error) {
  return {
    action,
    network: process.env.HEDERA_NETWORK || "testnet",
    integrationMode: "simulated",
    fallbackReason: error?.status?.toString?.() || error?.message || "Live Hedera call failed",
    ...payload
  };
}

export async function createConsensusTopic(bond) {
  const context = await buildClient();

  if (!context) {
    return toFallback("onboard-bond", {
      txId: simulatedId("SIM-TOPIC-TX"),
      topicId: simulatedId("SIM-TOPIC")
    });
  }

  try {
    const { sdk, client, network } = context;
    const { TopicCreateTransaction } = sdk;
    const submit = await new TopicCreateTransaction()
      .setTopicMemo(`GBF Truth Stream for ${bond.id}`)
      .execute(client);
    const receipt = await submit.getReceipt(client);

    return {
      action: "onboard-bond",
      network,
      integrationMode: "live",
      txId: submit.transactionId.toString(),
      topicId: receipt.topicId?.toString() || simulatedId("HCS-TOPIC")
    };
  } catch (error) {
    return toFallback(
      "onboard-bond",
      {
        txId: simulatedId("SIM-TOPIC-TX"),
        topicId: simulatedId("SIM-TOPIC")
      },
      error
    );
  }
}

export async function createFractionalBondToken(bond) {
  const context = await buildClient();

  if (!context) {
    return toFallback(
      "fractionalize",
      {
        txId: simulatedId("SIM-HTS"),
        tokenId: bond.tokenId,
        topicId: bond.topicId,
        treasuryAccountId: bond.treasuryAccountId,
        mintedFractions: bond.faceValue
      }
    );
  }

  try {
    const { sdk, client, network } = context;
    const { Hbar, TokenCreateTransaction, TokenSupplyType, TokenType, PrivateKey } = sdk;
    const transaction = await new TokenCreateTransaction()
      .setTokenName(`${bond.name} Fractional Bond Token`)
      .setTokenSymbol(`FBT${bond.id.slice(-4).toUpperCase()}`)
      .setDecimals(0)
      .setInitialSupply(bond.faceValue)
      .setTreasuryAccountId(process.env.HEDERA_TREASURY_ACCOUNT_ID || process.env.HEDERA_OPERATOR_ID)
      .setTokenType(TokenType.FungibleCommon)
      .setSupplyType(TokenSupplyType.Finite)
      .setMaxSupply(bond.faceValue)
      .setMaxTransactionFee(new Hbar(30))
      .setTransactionMemo(`GBF fractionalized green bond: ${bond.id}`)
      .freezeWith(client);

    const signed = await transaction.sign(PrivateKey.fromStringED25519(process.env.HEDERA_OPERATOR_KEY));
    const submit = await signed.execute(client);
    const receipt = await submit.getReceipt(client);

    return {
      action: "fractionalize",
      network,
      integrationMode: "live",
      txId: submit.transactionId.toString(),
      tokenId: receipt.tokenId?.toString() || bond.tokenId,
      topicId: bond.topicId,
      treasuryAccountId: process.env.HEDERA_TREASURY_ACCOUNT_ID || process.env.HEDERA_OPERATOR_ID,
      mintedFractions: bond.faceValue
    };
  } catch (error) {
    return toFallback(
      "fractionalize",
      {
        txId: simulatedId("SIM-HTS"),
        tokenId: bond.tokenId,
        topicId: bond.topicId,
        treasuryAccountId: bond.treasuryAccountId,
        mintedFractions: bond.faceValue
      },
      error
    );
  }
}

export async function publishTruthStreamEvent(bond, telemetry, sequence) {
  const context = await buildClient();

  if (!context) {
    return toFallback(
      "sync-impact",
      {
        txId: simulatedId("SIM-HCS"),
        topicId: bond.topicId,
        sequenceNumber: sequence
      }
    );
  }

  try {
    const { sdk, client, network } = context;
    const { TopicMessageSubmitTransaction } = sdk;
    const payload = JSON.stringify({
      bondId: bond.id,
      project: bond.name,
      metric: telemetry.metric,
      value: telemetry.value,
      guardianScore: telemetry.guardianScore,
      timestamp: new Date().toISOString()
    });
    const submit = await new TopicMessageSubmitTransaction()
      .setTopicId(bond.topicId)
      .setMessage(payload)
      .execute(client);
    const receipt = await submit.getReceipt(client);

    return {
      action: "sync-impact",
      network,
      integrationMode: "live",
      txId: submit.transactionId.toString(),
      topicId: bond.topicId,
      sequenceNumber: receipt.topicSequenceNumber?.toNumber?.() || sequence
    };
  } catch (error) {
    return toFallback(
      "sync-impact",
      {
        txId: simulatedId("SIM-HCS"),
        topicId: bond.topicId,
        sequenceNumber: sequence
      },
      error
    );
  }
}

export async function scheduleCouponDistribution(bond, payoutAmount) {
  const context = await buildClient();

  if (!context) {
    return toFallback(
      "distribute-yield",
      {
        txId: simulatedId("SIM-SCHEDULE"),
        scheduledTxId: simulatedId("SIM-SCHEDULED"),
        recipients: bond.walletHolders,
        amount: payoutAmount
      }
    );
  }

  try {
    const { sdk, client, network } = context;
    const { Hbar, ScheduleCreateTransaction, TransferTransaction } = sdk;
    const transferTx = new TransferTransaction()
      .addHbarTransfer(process.env.HEDERA_OPERATOR_ID, new Hbar(-Math.max(1, Math.round(payoutAmount / 10000))))
      .addHbarTransfer(
        process.env.HEDERA_TREASURY_ACCOUNT_ID || process.env.HEDERA_OPERATOR_ID,
        new Hbar(Math.max(1, Math.round(payoutAmount / 10000)))
      );
    const scheduled = await new ScheduleCreateTransaction()
      .setScheduledTransaction(transferTx)
      .setScheduleMemo(`GBF coupon distribution for ${bond.id}`)
      .execute(client);
    const receipt = await scheduled.getReceipt(client);

    return {
      action: "distribute-yield",
      network,
      integrationMode: "live",
      txId: scheduled.transactionId.toString(),
      scheduledTxId: receipt.scheduleId?.toString() || simulatedId("HEDERA-SCHEDULE"),
      recipients: bond.walletHolders,
      amount: payoutAmount
    };
  } catch (error) {
    return toFallback(
      "distribute-yield",
      {
        txId: simulatedId("SIM-SCHEDULE"),
        scheduledTxId: simulatedId("SIM-SCHEDULED"),
        recipients: bond.walletHolders,
        amount: payoutAmount
      },
      error
    );
  }
}
