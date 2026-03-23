# GBF Architecture

## System overview

GBF Phase 1 is structured as a two-tier application:

- `client/` delivers the investor and operator experience through a Vite + React dashboard.
- `server/` exposes protocol APIs, persists lifecycle state in SQLite, evaluates Guardian-style policy rules, and calls Hedera services when credentials are configured.
- `server/signer/` can run as a separate remote signer process so live Hedera keys do not need to live in the main API process.

## Core data flows

### 1. Bond onboarding

- An operator submits a new bond through `POST /api/bonds`.
- The server validates the payload, stores the bond in SQLite, and attempts to create a real HCS topic for the bond.
- The topic ID and onboarding transaction are persisted on the bond record.
- If live provisioning fails, the app records fallback mode rather than crashing.

### 2. Fractionalization

- An operator selects a bond and triggers `POST /api/actions/fractionalize`.
- The server loads the selected bond from SQLite.
- `server/src/services/hederaService.js` either:
  - creates a real HTS fungible token on Hedera Testnet when credentials are valid, or
  - falls back to safe simulated execution for local demo mode.
- The resulting transaction is stored in the persistent transaction log.

### 3. Truth Stream publishing

- An operator triggers `POST /api/actions/sync-impact`.
- `guardianService` generates a telemetry reading and policy score.
- If the bond does not yet have an HCS topic, the server provisions one first.
- `hederaService` publishes the event to HCS when live credentials exist.
- The server appends a new truth event plus an auditable transaction entry.
- Bond progress and status update in persistent state, so the UI changes after refresh.

### 4. Yield distribution

- An operator triggers `POST /api/actions/distribute-yield`.
- Guardian-style checks verify that progress and policy score are sufficient.
- If approved, the server creates a simulated or live scheduled payout action.
- The payout transaction is stored and surfaced in the dashboard.

## Persistence model

GBF currently uses a SQLite-backed relational store:

- Database file: `server/data/gbf.sqlite`
- DB bootstrap: `server/src/lib/db.js`
- Repository layer: `server/src/lib/repository.js`
- Seed reset script: `npm run seed --prefix server`

This keeps Phase 1 deployable on a single node while still giving you durable backend state for operators and repeated lifecycle actions.

## Hedera integration notes

Real Hedera calls are enabled through environment variables in `server/.env`:

- `HEDERA_NETWORK`
- `HEDERA_OPERATOR_ID`
- `HEDERA_OPERATOR_KEY`
- `HEDERA_TREASURY_ACCOUNT_ID`
- `HEDERA_SIGNER_MODE`
- `HEDERA_REMOTE_SIGNER_URL`
- `HEDERA_REMOTE_SIGNER_TOKEN`

When signer mode is `remote`, the API sends Hedera actions to the dedicated signer process and no longer needs to own the signing implementation directly.

## Demo story

1. Onboard a new bond from the product.
2. Show the returned topic provisioning transaction.
3. Use the operator console to mint FBTs.
4. Publish a fresh dMRV event and watch bond progress update.
5. Trigger coupon scheduling on a bond that has passed Guardian checks.
