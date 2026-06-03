# Global Green-Bond Fractionalizer

![GBF hero dashboard](images/Screenshot%202026-06-03%20184856.png)

**Global Green-Bond Fractionalizer (GBF)** is a full-stack climate-finance demo that turns institutional green bonds into retail-accessible fractional units, then ties issuance, verification, and coupon workflows to live impact evidence.

GBF combines a React operator dashboard, an Express API, SQLite persistence, Guardian-style policy checks, and Hedera Testnet integration concepts for HTS tokenization and HCS truth-stream publishing. It is built for teams exploring transparent climate finance, tokenized fixed income, dMRV, and verifiable green-bond servicing.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=111827)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Hedera](https://img.shields.io/badge/Hedera-Testnet-111827)](https://hedera.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Persistence-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)

## Why GBF

Traditional green bonds are usually institutional, slow to verify, and opaque after issuance. GBF demonstrates how a modern climate-finance platform can make them more accessible and accountable:

- **Fractional access:** convert large green-bond programs into $1 Fractional Bond Token units.
- **Impact-linked servicing:** connect payout readiness to dMRV progress and Guardian-style policy checks.
- **Truth Stream auditability:** publish verification events through HCS-style telemetry records.
- **Operator-grade workflows:** onboard bonds, mint FBTs, sync impact, schedule coupons, and inspect transactions from one dashboard.
- **Demo-safe Hedera mode:** run locally with simulated execution, or enable live Hedera Testnet signing through explicit environment flags.
- **Persistent backend state:** store bonds, investors, telemetry, transactions, listings, policies, and wallet links in SQLite.

## Product Preview

| Platform overview | Bond onboarding |
| --- | --- |
| ![Executive platform overview](images/Screenshot%202026-06-03%20184911.png) | ![Bond onboarding workflow](images/Screenshot%202026-06-03%20184931.png) |

| Bond registry | Fractionalization result |
| --- | --- |
| ![Bond registry with impact progress](images/Screenshot%202026-06-03%20185030.png) | ![Fractionalization transaction result](images/Screenshot%202026-06-03%20185049.png) |

## Core Workflows

1. **Onboard a green bond program**
   Operators create a bond with issuer, face value, coupon rate, maturity, methodology, target metric, and Guardian policy status.

2. **Provision verification infrastructure**
   The API persists the bond and attempts to provision Hedera Consensus Service infrastructure. If live credentials are unavailable, GBF records a fallback transaction instead of blocking the demo.

3. **Fractionalize into FBTs**
   Authorized sessions can mint or simulate HTS-backed $1 Fractional Bond Tokens for the selected bond.

4. **Sync dMRV evidence**
   The platform generates a telemetry reading, evaluates policy readiness, appends a Truth Stream event, and updates verified impact progress.

5. **Schedule coupon distribution**
   Yield distribution is gated by policy checks, impact readiness, and operator/admin authorization.

## Tech Stack

| Layer | Tools |
| --- | --- |
| Frontend | Vite, React, Tailwind CSS, Lucide React |
| Backend | Node.js, Express |
| Persistence | SQLite-backed lifecycle store |
| Ledger concepts | Hedera Token Service, Hedera Consensus Service, explicit live-signing controls |
| Policy layer | Guardian-style policy evaluation |
| Deployment | Vercel-ready frontend/API routing, Docker assets, optional signer service |

## Repository Structure

```text
.
|-- api/                    # Vercel serverless API entrypoint
|-- client/                 # Vite + React dashboard
|-- docs/                   # Architecture, demo script, launch notes, disclosures
|-- images/                 # README screenshots
|-- server/                 # Express API, SQLite store, Hedera services
|   |-- signer/             # Optional remote signer process
|   |-- src/routes/         # API and auth routes
|   |-- src/services/       # Hedera, Guardian, signer gateway services
|   `-- src/lib/            # DB, repository, env, auth, metrics, logging
|-- docker-compose.yml
|-- Dockerfile
|-- package.json
`-- vercel.json
```

## Quick Start

```bash
npm install
npm install --prefix server
npm install --prefix client
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`

If port `4000` is already in use, start the server with another port:

```bash
PORT=4100 npm run dev --prefix server
```

## Environment Setup

Copy the server environment template:

```bash
cp server/.env.example server/.env
```

For local demo mode, keep live signing disabled:

```env
HEDERA_NETWORK=testnet
HEDERA_ENABLE_LIVE_SIGNING=false
HEDERA_SIGNER_MODE=disabled
GBF_ENABLE_MAINNET=false
GBF_CORS_ORIGIN=http://localhost:5173
GBF_ADMIN_EMAIL=admin@gbf.local
GBF_ADMIN_PASSWORD=ChangeMe123!
```

For live Hedera Testnet execution, add the required operator and treasury credentials, then explicitly enable signing:

```env
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=
HEDERA_OPERATOR_KEY=
HEDERA_TREASURY_ACCOUNT_ID=
HEDERA_ENABLE_LIVE_SIGNING=true
HEDERA_SIGNER_MODE=local
GBF_ENABLE_MAINNET=false
```

GBF is intentionally conservative: if `HEDERA_ENABLE_LIVE_SIGNING` is not set to `true`, the application stays in fallback mode even when credentials exist.

## Useful Scripts

```bash
npm run dev
npm run build
npm run start --prefix server
npm run seed --prefix server
npm run signer --prefix server
npm run test --prefix server
```

## API Highlights

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | API health check |
| `GET` | `/api/overview` | Dashboard KPIs and platform status |
| `GET` | `/api/bonds` | Bond registry |
| `GET` | `/api/truth-stream` | dMRV and policy telemetry events |
| `GET` | `/api/transactions` | Protocol activity log |
| `GET` | `/api/market/listings` | Secondary-market listings |
| `GET` | `/api/guardian/policies` | Guardian-style policy states |
| `POST` | `/api/bonds` | Onboard a bond program |
| `POST` | `/api/actions/fractionalize` | Mint or simulate FBT creation |
| `POST` | `/api/actions/sync-impact` | Publish dMRV evidence |
| `POST` | `/api/actions/distribute-yield` | Schedule coupon distribution |
| `POST` | `/api/demo/reset` | Reset demo state |

## Deployment

GBF can run as a Vercel-only demo from this repository.

Recommended Vercel settings:

- Root Directory: repository root
- Framework Preset: `Other`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `client/dist`

Recommended Vercel environment variables:

```env
GBF_CORS_ORIGIN=https://your-project.vercel.app
GBF_ADMIN_EMAIL=admin@gbf.local
GBF_ADMIN_PASSWORD=ChangeMe123!
HEDERA_NETWORK=testnet
HEDERA_ENABLE_LIVE_SIGNING=false
HEDERA_SIGNER_MODE=disabled
GBF_ENABLE_MAINNET=false
```

Do not set `VITE_API_URL` when you want the frontend to call the same-origin Vercel API under `/api`.

### Production Note

The current Vercel deployment path uses serverless runtime storage, so SQLite data is suitable for demos and hackathons, not durable production persistence. For a production deployment, replace SQLite with hosted Postgres, Neon, Supabase, or another durable database.

## Demo Script

1. Open the dashboard and introduce GBF as a Hedera-powered platform for fractional green bonds.
2. Sign in as an operator or admin.
3. Onboard a new green bond program.
4. Show the transaction result and fallback/live execution mode.
5. Mint FBTs for the selected bond.
6. Sync dMRV evidence and show the Truth Stream and impact progress update.
7. Schedule coupon distribution once policy checks pass.

## Documentation

- [Architecture](docs/architecture.md)
- [Demo Script](docs/demo-script.md)
- [Launch Checklist](docs/launch-checklist.md)
- [Risk Disclosures](docs/risk-disclosures.md)

## Roadmap Ideas

- Hosted durable database adapter
- Wallet onboarding flow for investors
- Real Guardian policy package integration
- Expanded secondary-market settlement workflow
- Mainnet-readiness checklist with stronger operational controls
- Public hosted demo and video walkthrough

## Contributing

Contributions are welcome. The most useful improvements are focused pull requests that improve demo reliability, deepen Hedera/Guardian integration, harden production readiness, or improve the investor/operator experience.

If this project helps you explore climate finance, tokenized assets, or dMRV infrastructure, star the repo so more builders can find it.

