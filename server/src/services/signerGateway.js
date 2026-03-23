let sdkPromise;

async function loadSdk() {
  if (!sdkPromise) {
    sdkPromise = import("@hashgraph/sdk").catch(() => null);
  }

  return sdkPromise;
}

function networkName() {
  return (process.env.HEDERA_NETWORK || "testnet").toLowerCase();
}

function operatorId() {
  return process.env.HEDERA_OPERATOR_ID || "";
}

function treasuryAccountId() {
  return process.env.HEDERA_TREASURY_ACCOUNT_ID || process.env.HEDERA_OPERATOR_ID || "";
}

function signerMode() {
  const mode = (process.env.HEDERA_SIGNER_MODE || "disabled").toLowerCase();

  if (["disabled", "local", "remote"].includes(mode)) {
    return mode;
  }

  return "disabled";
}

function localReady() {
  return Boolean(process.env.HEDERA_OPERATOR_ID && process.env.HEDERA_OPERATOR_KEY);
}

function remoteReady() {
  return Boolean(process.env.HEDERA_REMOTE_SIGNER_URL && process.env.HEDERA_REMOTE_SIGNER_TOKEN);
}

export function getSignerStatus() {
  const mode = signerMode();
  return {
    mode,
    network: networkName(),
    operatorId: operatorId() || null,
    enabled: mode !== "disabled",
    ready:
      mode === "local" ? localReady() : mode === "remote" ? remoteReady() : false,
    remoteUrl: mode === "remote" ? process.env.HEDERA_REMOTE_SIGNER_URL || null : null
  };
}

async function localClient() {
  const sdk = await loadSdk();

  if (!sdk || !localReady()) {
    return null;
  }

  const { Client, PrivateKey } = sdk;
  const client = networkName() === "mainnet" ? Client.forMainnet() : Client.forTestnet();
  const privateKey = PrivateKey.fromStringED25519(process.env.HEDERA_OPERATOR_KEY);
  client.setOperator(process.env.HEDERA_OPERATOR_ID, privateKey);
  return { sdk, client, privateKey };
}

async function remoteRequest(action, payload) {
  const response = await fetch(`${process.env.HEDERA_REMOTE_SIGNER_URL}/hedera/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.HEDERA_REMOTE_SIGNER_TOKEN}`
    },
    body: JSON.stringify({
      network: networkName(),
      operatorId: operatorId(),
      treasuryAccountId: treasuryAccountId(),
      payload
    })
  });

  if (!response.ok) {
    let message = `Remote signer request failed with status ${response.status}`;

    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      // Keep default message.
    }

    throw new Error(message);
  }

  return response.json();
}

export async function executeWithSigner(action, payload, handlers) {
  const status = getSignerStatus();

  if (status.mode === "disabled") {
    throw new Error("Signer mode is disabled.");
  }

  if (status.mode === "local") {
    const context = await localClient();

    if (!context) {
      throw new Error("Local signer is not configured.");
    }

    return handlers.local({
      sdk: context.sdk,
      client: context.client,
      privateKey: context.privateKey,
      network: networkName(),
      operatorId: operatorId(),
      treasuryAccountId: treasuryAccountId()
    });
  }

  if (!remoteReady()) {
    throw new Error("Remote signer is not configured.");
  }

  return handlers.remote((remotePayload) => remoteRequest(action, remotePayload), {
    network: networkName(),
    operatorId: operatorId(),
    treasuryAccountId: treasuryAccountId(),
    payload
  });
}
