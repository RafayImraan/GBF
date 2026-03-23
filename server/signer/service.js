let sdkPromise;

async function loadSdk() {
  if (!sdkPromise) {
    sdkPromise = import("@hashgraph/sdk");
  }

  return sdkPromise;
}

function configuredNetwork(requestedNetwork) {
  return (requestedNetwork || process.env.HEDERA_NETWORK || "testnet").toLowerCase();
}

function operatorId() {
  return process.env.HEDERA_SIGNER_OPERATOR_ID || process.env.HEDERA_OPERATOR_ID;
}

function treasuryAccountId(requestValue) {
  return (
    process.env.HEDERA_SIGNER_TREASURY_ACCOUNT_ID ||
    requestValue ||
    process.env.HEDERA_TREASURY_ACCOUNT_ID ||
    operatorId()
  );
}

function operatorKey() {
  return process.env.HEDERA_SIGNER_OPERATOR_KEY || process.env.HEDERA_OPERATOR_KEY;
}

export function getRemoteSignerStatus() {
  return {
    network: process.env.HEDERA_NETWORK || "testnet",
    mode: "remote",
    ready: Boolean(operatorId() && operatorKey() && process.env.HEDERA_REMOTE_SIGNER_TOKEN)
  };
}

async function buildClient(network) {
  const sdk = await loadSdk();

  if (!operatorId() || !operatorKey()) {
    throw new Error("Remote signer Hedera credentials are not configured.");
  }

  const { Client, PrivateKey } = sdk;
  const client = network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
  const privateKey = PrivateKey.fromStringED25519(operatorKey());
  client.setOperator(operatorId(), privateKey);
  return { sdk, client, privateKey };
}

export async function createTopic(request) {
  const network = configuredNetwork(request.network);
  const { sdk, client } = await buildClient(network);
  const { TopicCreateTransaction } = sdk;
  const memo = request.payload?.memo || `GBF Truth Stream for ${request.payload?.bondId || "bond"}`;

  const submit = await new TopicCreateTransaction()
    .setTopicMemo(memo)
    .execute(client);
  const receipt = await submit.getReceipt(client);

  return {
    ok: true,
    network,
    txId: submit.transactionId.toString(),
    topicId: receipt.topicId?.toString()
  };
}

export async function createToken(request) {
  const network = configuredNetwork(request.network);
  const { sdk, client, privateKey } = await buildClient(network);
  const { Hbar, TokenCreateTransaction, TokenSupplyType, TokenType } = sdk;
  const payload = request.payload || {};

  const transaction = await new TokenCreateTransaction()
    .setTokenName(`${payload.bondName} Fractional Bond Token`)
    .setTokenSymbol(`FBT${String(payload.bondId || "").slice(-4).toUpperCase()}`)
    .setDecimals(0)
    .setInitialSupply(payload.faceValue)
    .setTreasuryAccountId(treasuryAccountId(request.treasuryAccountId))
    .setTokenType(TokenType.FungibleCommon)
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(payload.faceValue)
    .setMaxTransactionFee(new Hbar(30))
    .setTransactionMemo(`GBF fractionalized green bond: ${payload.bondId}`)
    .freezeWith(client);

  const signed = await transaction.sign(privateKey);
  const submit = await signed.execute(client);
  const receipt = await submit.getReceipt(client);

  return {
    ok: true,
    network,
    txId: submit.transactionId.toString(),
    tokenId: receipt.tokenId?.toString(),
    treasuryAccountId: treasuryAccountId(request.treasuryAccountId),
    mintedFractions: payload.faceValue
  };
}

export async function publishMessage(request) {
  const network = configuredNetwork(request.network);
  const { sdk, client } = await buildClient(network);
  const { TopicMessageSubmitTransaction } = sdk;
  const payload = request.payload || {};

  const submit = await new TopicMessageSubmitTransaction()
    .setTopicId(payload.topicId)
    .setMessage(
      JSON.stringify({
        bondId: payload.bondId,
        telemetry: payload.telemetry,
        timestamp: new Date().toISOString()
      })
    )
    .execute(client);
  const receipt = await submit.getReceipt(client);

  return {
    ok: true,
    network,
    txId: submit.transactionId.toString(),
    topicId: payload.topicId,
    sequenceNumber: receipt.topicSequenceNumber?.toNumber?.()
  };
}

export async function scheduleYield(request) {
  const network = configuredNetwork(request.network);
  const { sdk, client } = await buildClient(network);
  const { Hbar, ScheduleCreateTransaction, TransferTransaction } = sdk;
  const payload = request.payload || {};

  const transferTx = new TransferTransaction()
    .addHbarTransfer(operatorId(), new Hbar(-Math.max(1, Math.round(payload.payoutAmount / 10000))))
    .addHbarTransfer(
      treasuryAccountId(request.treasuryAccountId),
      new Hbar(Math.max(1, Math.round(payload.payoutAmount / 10000)))
    );

  const scheduled = await new ScheduleCreateTransaction()
    .setScheduledTransaction(transferTx)
    .setScheduleMemo(`GBF coupon distribution for ${payload.bondId}`)
    .execute(client);
  const receipt = await scheduled.getReceipt(client);

  return {
    ok: true,
    network,
    txId: scheduled.transactionId.toString(),
    scheduledTxId: receipt.scheduleId?.toString(),
    recipients: payload.recipients,
    amount: payload.payoutAmount
  };
}

export async function transferToken(request) {
  const network = configuredNetwork(request.network);
  const { sdk, client } = await buildClient(network);
  const { TransferTransaction } = sdk;
  const payload = request.payload || {};

  const submit = await new TransferTransaction()
    .addTokenTransfer(payload.tokenId, payload.fromAccountId, -Math.abs(payload.units))
    .addTokenTransfer(payload.tokenId, payload.toAccountId, Math.abs(payload.units))
    .execute(client);
  await submit.getReceipt(client);

  return {
    ok: true,
    network,
    txId: submit.transactionId.toString(),
    tokenId: payload.tokenId,
    fromAccountId: payload.fromAccountId,
    toAccountId: payload.toAccountId,
    units: payload.units
  };
}
