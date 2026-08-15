# Credential-free brokerage: OAuth read-only linking + self-hosted execution

aiAlgo stops holding any brokerage credential. Two clean boundaries replace today's model:

- **Read (aiAlgo cloud)** — the user authorizes aiAlgo through the broker's own OAuth screen and grants a **read-only** scope. aiAlgo receives a revocable token (held by the aggregator/broker, not a password) and uses it for positions, balances, executions and — where the broker permits — historical bars.
- **Write (user's own machine)** — order placement never touches aiAlgo. The platform emits a signed, downloadable **strategy package** the user runs on their own VPS with their own broker credentials, which never leave their infrastructure.

This removes the regulatory exposure of custodying trading credentials and matches how portfolio trackers (Sharesight, and moomoo's US/Canada linking via SnapTrade) already work.

## What changes for the user

1. **Trading accounts page becomes "Linked accounts (read-only)".** Each broker card shows an "Authorize with <broker>" button that opens the broker's own consent screen in a popup. No API key, secret, private key, gateway URL or unlock password fields anywhere.
2. **Existing stored credentials are purged.** On the first deploy every encrypted credential blob is deleted and affected accounts move to a `needs_reauth` state with a banner explaining the regulatory change and a one-click re-link.
3. **Trading Desk loses manual order entry against aiAlgo-held credentials.** It becomes a live *monitoring* desk: positions, balances, and executions streamed read-only from the linked account, with the existing origin badges (Manual / Algo / AI / Broker) preserved because executions still carry their tagging from the runner.
4. **Deploy replaces "go live".** From a verified strategy the user clicks **Download runner package** — a zip with the compiled strategy, a `docker-compose.yml`, an `.env.example` for *their* broker keys, and a runbook. The runner executes locally and reports fills back to aiAlgo over a scoped, user-issued API token so the desk, blotter and performance-fee accounting keep working.
5. **Data sources**: broker-backed market data continues, but only through the read-only OAuth token, and only for brokers whose data scope allows it. Where it doesn't, the account is listed as "positions only" and backtests fall back to aiAlgo's own market data providers.

## Broker coverage (to be confirmed against each program during build)

| Broker | Read-only linking path |
| --- | --- |
| moomoo / Futu | Aggregator OAuth (SnapTrade) where available by region; otherwise self-host only |
| Interactive Brokers | IBKR OAuth / third-party program, or aggregator |
| Tiger | No public OAuth today — self-host runner only |
| Alpaca | Native OAuth with read-only scopes |
| Binance / Coinbase | Coinbase OAuth (read scopes); Binance = self-host only |

Every provider entry gains a `linking` mode of `oauth`, `aggregator` or `self_host_only`, so unsupported brokers degrade honestly instead of asking for keys. Nothing is claimed as supported until its program terms are verified.

## Trading authorisation and consent (carried over, now simpler)

aiAlgo is a software tool with **no** discretionary authority, and after this change it is also technically incapable of placing an order. The consent dialog is retained and reworded to say exactly that: read-only access on aiAlgo's side, all execution performed by software the user runs under their own control, every strategy selected and enabled by the user, past performance no guarantee. Acceptance stays versioned and is required before a link or a package download.

## Technical notes

- **Schema**: drop `credentials_encrypted` and secret-bearing keys from `broker_connections`; add `linking_mode`, `auth_status`, `scope`, `aggregator_user_id`, `token_ref`, `last_read_at`. New `runner_deployments` (package version, machine label, heartbeat, scoped token hash) and `runner_events` (fills/heartbeats posted by the runner). New `trading_consents`. All with owner-scoped RLS plus explicit GRANTs.
- **OAuth**: aggregator/broker client secrets stay platform-side in Lovable Cloud secrets. Start and callback handled by server functions plus a public callback route; access tokens are stored server-side only (encrypted at rest, never returned to the browser) or held by the aggregator behind a user reference, depending on the program.
- **Read path**: `brokers.server.ts` is rewritten to read-only calls (accounts, positions, activities, optional candles). `data-routing.server.ts` swaps `credentialsEncrypted` for the token reference and skips brokers whose scope excludes market data. All order-placement code paths in `execution.server.ts` / `trading-desk.functions.ts` are removed or converted to ingesting runner reports.
- **Runner package**: generated server-side from the existing Python codegen (`strategy-codegen.ts`), zipped with compose + runbook, signed, and downloaded through an authenticated server function. Reporting endpoint lives under `src/routes/api/public/runner/*` with token verification in the handler.
- **Removed**: managed OpenD/IBKR bridge concept, all credential input forms, `crypto.server` usage for broker secrets (kept for any remaining platform-side token encryption).
- **Docs**: connection guides rewritten from "create an API key" to "authorize aiAlgo" for OAuth brokers, and to "install the runner" for self-host-only brokers. A public `/trading-disclaimer` page states the read-only, non-discretionary posture.
