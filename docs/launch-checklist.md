# GBF Launch Checklist

## Technical

- Restrict `GBF_CORS_ORIGIN` to trusted domains only.
- Set `GBF_ENABLE_MAINNET=true` only after controlled mainnet rehearsal.
- Use `HEDERA_SIGNER_MODE=remote` for production and isolate the signer host.
- Verify treasury funding and token-association flows for all investor accounts.
- Confirm `/metrics`, `/api/health`, and signer `/health` are monitored.
- Run `npm --prefix server test`.
- Run `npm --prefix client run build`.

## Operations

- Export and archive audit logs before each release.
- Confirm backup/restore runbooks for SQLite during the interim phase.
- Review all open compliance cases before enabling trading windows.
- Review all open market listings and reserved inventory counts.

## Compliance

- Confirm KYC status for every investor allowed to receive or transfer units.
- Validate regional transfer restrictions and suitability rules.
- Review Guardian policy artifacts for each live bond program.
- Record sign-off for disclosures, risk statements, and investor communications.
