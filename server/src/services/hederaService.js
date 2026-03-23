import { executeWithSigner, getSignerStatus } from "./signerGateway.js";

function simulatedId(prefix) {
  return `${prefix}-${Date.now()}`;
}

function toFallback(action, payload, error) {
  return {
    action,
    network: process.env.HEDERA_NETWORK || "testnet",
    integrationMode: "simulated",
    signerMode: getSignerStatus().mode,
    fallbackReason: error?.status?.toString?.() || error?.message || "Live Hedera call failed",
    ...payload
  };
}

function liveResponse(action, payload, signerMode) {
  return {
    action,
    integrationMode: "live",
    signerMode,
    ...payload
  };
}

export function hederaExecutionStatus() {
  return getSignerStatus();
}

export async function createConsensusTopic(bond, options = {}) {
  if (!options.allowLiveSigning) {
    return toFallback("onboard-bond", {
      txId: simulatedId("SIM-TOPIC-TX"),
      topicId: simulatedId("SIM-TOPIC")
    }, { message: "Live signing is disabled." });
  }

  try {
    return await executeWithSigner(
      "create-topic",
      {
        bondId: bond.id,
        memo: `GBF Truth Stream for ${bond.id}`
      },
      {
        local: async ({ sdk, client, network }) => {
          const { TopicCreateTransaction } = sdk;
          const submit = await new TopicCreateTransaction()
            .setTopicMemo(`GBF Truth Stream for ${bond.id}`)
            .execute(client);
          const receipt = await submit.getReceipt(client);

          return liveResponse(
            "onboard-bond",
            {
              network,
              txId: submit.transactionId.toString(),
              topicId: receipt.topicId?.toString() || simulatedId("HCS-TOPIC")
            },
            "local"
          );
        },
        remote: async (request) => {
          const response = await request({
            bondId: bond.id,
            memo: `GBF Truth Stream for ${bond.id}`
          });

          return liveResponse(
            "onboard-bond",
            {
              network: response.network || process.env.HEDERA_NETWORK || "testnet",
              txId: response.txId,
              topicId: response.topicId
            },
            "remote"
          );
        }
      }
    );
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

export async function createFractionalBondToken(bond, options = {}) {
  if (!options.allowLiveSigning) {
    return toFallback(
      "fractionalize",
      {
        txId: simulatedId("SIM-HTS"),
        tokenId: bond.tokenId,
        topicId: bond.topicId,
        treasuryAccountId: bond.treasuryAccountId,
        mintedFractions: bond.faceValue
      },
      { message: "Live signing is disabled." }
    );
  }

  try {
    return await executeWithSigner(
      "create-token",
      {
        bondId: bond.id,
        bondName: bond.name,
        faceValue: bond.faceValue
      },
      {
        local: async ({ sdk, client, privateKey, network, treasuryAccountId }) => {
          const { Hbar, TokenCreateTransaction, TokenSupplyType, TokenType } = sdk;
          const transaction = await new TokenCreateTransaction()
            .setTokenName(`${bond.name} Fractional Bond Token`)
            .setTokenSymbol(`FBT${bond.id.slice(-4).toUpperCase()}`)
            .setDecimals(0)
            .setInitialSupply(bond.faceValue)
            .setTreasuryAccountId(treasuryAccountId)
            .setTokenType(TokenType.FungibleCommon)
            .setSupplyType(TokenSupplyType.Finite)
            .setMaxSupply(bond.faceValue)
            .setMaxTransactionFee(new Hbar(30))
            .setTransactionMemo(`GBF fractionalized green bond: ${bond.id}`)
            .freezeWith(client);

          const signed = await transaction.sign(privateKey);
          const submit = await signed.execute(client);
          const receipt = await submit.getReceipt(client);

          return liveResponse(
            "fractionalize",
            {
              network,
              txId: submit.transactionId.toString(),
              tokenId: receipt.tokenId?.toString() || bond.tokenId,
              topicId: bond.topicId,
              treasuryAccountId,
              mintedFractions: bond.faceValue
            },
            "local"
          );
        },
        remote: async (request) => {
          const response = await request({
            bondId: bond.id,
            bondName: bond.name,
            faceValue: bond.faceValue
          });

          return liveResponse(
            "fractionalize",
            {
              network: response.network || process.env.HEDERA_NETWORK || "testnet",
              txId: response.txId,
              tokenId: response.tokenId,
              topicId: response.topicId || bond.topicId,
              treasuryAccountId: response.treasuryAccountId,
              mintedFractions: response.mintedFractions ?? bond.faceValue
            },
            "remote"
          );
        }
      }
    );
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

export async function publishTruthStreamEvent(bond, telemetry, sequence, options = {}) {
  if (!options.allowLiveSigning) {
    return toFallback(
      "sync-impact",
      {
        txId: simulatedId("SIM-HCS"),
        topicId: bond.topicId,
        sequenceNumber: sequence
      },
      { message: "Live signing is disabled." }
    );
  }

  try {
    return await executeWithSigner(
      "publish-message",
      {
        bondId: bond.id,
        topicId: bond.topicId,
        telemetry,
        sequence
      },
      {
        local: async ({ sdk, client, network }) => {
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

          return liveResponse(
            "sync-impact",
            {
              network,
              txId: submit.transactionId.toString(),
              topicId: bond.topicId,
              sequenceNumber: receipt.topicSequenceNumber?.toNumber?.() || sequence
            },
            "local"
          );
        },
        remote: async (request) => {
          const response = await request({
            bondId: bond.id,
            topicId: bond.topicId,
            telemetry,
            sequence
          });

          return liveResponse(
            "sync-impact",
            {
              network: response.network || process.env.HEDERA_NETWORK || "testnet",
              txId: response.txId,
              topicId: response.topicId || bond.topicId,
              sequenceNumber: response.sequenceNumber ?? sequence
            },
            "remote"
          );
        }
      }
    );
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

export async function scheduleCouponDistribution(bond, payoutAmount, options = {}) {
  if (!options.allowLiveSigning) {
    return toFallback(
      "distribute-yield",
      {
        txId: simulatedId("SIM-SCHEDULE"),
        scheduledTxId: simulatedId("SIM-SCHEDULED"),
        recipients: bond.walletHolders,
        amount: payoutAmount
      },
      { message: "Live signing is disabled." }
    );
  }

  try {
    return await executeWithSigner(
      "schedule-yield",
      {
        bondId: bond.id,
        payoutAmount,
        recipients: bond.walletHolders
      },
      {
        local: async ({ sdk, client, network, operatorId, treasuryAccountId }) => {
          const { Hbar, ScheduleCreateTransaction, TransferTransaction } = sdk;
          const transferTx = new TransferTransaction()
            .addHbarTransfer(operatorId, new Hbar(-Math.max(1, Math.round(payoutAmount / 10000))))
            .addHbarTransfer(treasuryAccountId, new Hbar(Math.max(1, Math.round(payoutAmount / 10000))));
          const scheduled = await new ScheduleCreateTransaction()
            .setScheduledTransaction(transferTx)
            .setScheduleMemo(`GBF coupon distribution for ${bond.id}`)
            .execute(client);
          const receipt = await scheduled.getReceipt(client);

          return liveResponse(
            "distribute-yield",
            {
              network,
              txId: scheduled.transactionId.toString(),
              scheduledTxId: receipt.scheduleId?.toString() || simulatedId("HEDERA-SCHEDULE"),
              recipients: bond.walletHolders,
              amount: payoutAmount
            },
            "local"
          );
        },
        remote: async (request) => {
          const response = await request({
            bondId: bond.id,
            payoutAmount,
            recipients: bond.walletHolders
          });

          return liveResponse(
            "distribute-yield",
            {
              network: response.network || process.env.HEDERA_NETWORK || "testnet",
              txId: response.txId,
              scheduledTxId: response.scheduledTxId,
              recipients: response.recipients ?? bond.walletHolders,
              amount: response.amount ?? payoutAmount
            },
            "remote"
          );
        }
      }
    );
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

export async function transferFractionalBondUnits(bond, transfer, options = {}) {
  if (!options.allowLiveSigning) {
    return toFallback(
      transfer.action || "transfer-fbt",
      {
        txId: simulatedId("SIM-TRANSFER"),
        tokenId: bond.tokenId,
        units: transfer.units,
        fromAccountId: transfer.fromAccountId || bond.treasuryAccountId,
        toAccountId: transfer.toAccountId
      },
      { message: "Live signing is disabled." }
    );
  }

  try {
    return await executeWithSigner(
      "transfer-token",
      {
        bondId: bond.id,
        tokenId: bond.tokenId,
        units: transfer.units,
        fromAccountId: transfer.fromAccountId || bond.treasuryAccountId,
        toAccountId: transfer.toAccountId
      },
      {
        local: async ({ sdk, client, network }) => {
          const { TransferTransaction } = sdk;
          const submit = await new TransferTransaction()
            .addTokenTransfer(bond.tokenId, transfer.fromAccountId || bond.treasuryAccountId, -Math.abs(transfer.units))
            .addTokenTransfer(bond.tokenId, transfer.toAccountId, Math.abs(transfer.units))
            .execute(client);
          await submit.getReceipt(client);

          return liveResponse(
            transfer.action || "transfer-fbt",
            {
              network,
              txId: submit.transactionId.toString(),
              tokenId: bond.tokenId,
              units: transfer.units,
              fromAccountId: transfer.fromAccountId || bond.treasuryAccountId,
              toAccountId: transfer.toAccountId
            },
            "local"
          );
        },
        remote: async (request) => {
          const response = await request({
            bondId: bond.id,
            tokenId: bond.tokenId,
            units: transfer.units,
            fromAccountId: transfer.fromAccountId || bond.treasuryAccountId,
            toAccountId: transfer.toAccountId
          });

          return liveResponse(
            transfer.action || "transfer-fbt",
            {
              network: response.network || process.env.HEDERA_NETWORK || "testnet",
              txId: response.txId,
              tokenId: response.tokenId || bond.tokenId,
              units: response.units ?? transfer.units,
              fromAccountId: response.fromAccountId || transfer.fromAccountId || bond.treasuryAccountId,
              toAccountId: response.toAccountId || transfer.toAccountId
            },
            "remote"
          );
        }
      }
    );
  } catch (error) {
    return toFallback(
      transfer.action || "transfer-fbt",
      {
        txId: simulatedId("SIM-TRANSFER"),
        tokenId: bond.tokenId,
        units: transfer.units,
        fromAccountId: transfer.fromAccountId || bond.treasuryAccountId,
        toAccountId: transfer.toAccountId
      },
      error
    );
  }
}
