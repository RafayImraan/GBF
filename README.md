# Global Green-Bond Fractionalizer (GBF)

GBF is a full-stack DeFi project that democratizes access to institutional green bonds by fractionalizing them into $1 units and pairing every investment flow with live, verifiable ecological evidence on Hedera rails.

## What GBF delivers

- Fractional green bond issuance through a real-or-simulated HTS integration layer
- Live dMRV telemetry publishing into a Truth Stream backed by HCS-style events
- Guardian-style policy enforcement before coupon distribution can proceed
- SQL-backed backend state, so bond programs, telemetry, and transactions survive restarts
- Executive-grade frontend for investors, operators, and hackathon judges

## Tech stack

- Frontend: Vite, React, Tailwind CSS, Lucide React
- Backend: Node.js, Express
- Persistence: SQLite-backed lifecycle store
- Hedera integration: `@hashgraph/sdk` with automatic fallback when live provisioning fails

## Project layout

- `client/` frontend dashboard
- `server/` API, SQL lifecycle store, Hedera services, seed script
- `docs/architecture.md` technical walkthrough
- `docs/demo-script.md` pitch/demo flow

## Quick start

```bash
npm install
npm install --prefix server
npm install --prefix client
npm run dev
```

Default ports:

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`

If `4000` is already in use, start the server with another port such as `PORT=4100`.

## Environment setup

Copy `server/.env.example` to `server/.env`.

For live Hedera testnet execution, provide:

- `HEDERA_NETWORK=testnet`
- `HEDERA_OPERATOR_ID`
- `HEDERA_OPERATOR_KEY`
- `HEDERA_TREASURY_ACCOUNT_ID`

If these are missing or invalid, GBF still runs in fallback mode and labels transactions clearly in the UI.

## Useful scripts

 ```bash
 npm run dev
 npm run build --prefix client
 npm run seed --prefix server
 ```

## API highlights

- `GET /api/health`
- `GET /api/overview`
- `GET /api/bonds`
- `GET /api/truth-stream`
- `GET /api/transactions`
- `POST /api/bonds`
- `POST /api/actions/fractionalize`
- `POST /api/actions/sync-impact`
- `POST /api/actions/distribute-yield`
- `POST /api/demo/reset`

## Demo flow

1. Onboard a new bond program from the UI.
2. Provision its Truth Stream infrastructure automatically.
3. Mint FBTs from the operator console.
4. Publish a new dMRV event and watch impact progress update.
5. Schedule coupon distribution after Guardian checks pass.

## Architecture

See [docs/architecture.md](c:\Users\HomePC\Desktop\GBF\docs\architecture.md) for the system design and [docs/demo-script.md](c:\Users\HomePC\Desktop\GBF\docs\demo-script.md) for a short judge-ready walkthrough.
