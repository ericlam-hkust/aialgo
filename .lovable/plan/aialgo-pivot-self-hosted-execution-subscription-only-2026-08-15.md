# aiAlgo pivot: self-hosted execution, subscription-only

aiAlgo becomes a **strategy builder and software vendor**. All live execution runs on infrastructure the user owns. The platform never holds broker credentials, never transmits an order, and never connects inbound to user machines. Revenue is 100% subscription — every commission, per-trade and performance fee is removed.

## Hard constraints (enforced in code, not just copy)

- No platform code path may transmit an order or trade instruction.
- No broker password or trade-permission key is ever stored or even collectable — those form fields are deleted, the encrypted credential columns are dropped, and existing blobs are purged.
- No inbound connection to user infrastructure. Everything is pull-based over HTTPS from the agent.
- Strategy logic changes require explicit user approval before going live.
- No commission, per-trade or performance fee anywhere in pricing, code, or copy.
- No performance or return claims in marketing copy.

## Business model

| Tier | Price | Includes |
| --- | --- | --- |
| Free / Starter | $0 | Builder with basic indicators, 1 year of backtest history, full package download, manual updates, community templates |
| Pro | monthly / annual | Full builder + code editor, full history and walk-forward, one-click deploy to the user's own cloud, automatic pull updates, read-only live monitoring, agent data sync |
| Elite / Team | monthly / annual | Everything in Pro, multiple concurrent deployments, paper-run + canary + auto-rollback pipeline, priority templates and early access, team collaboration |

Lapsed subscription: the already-deployed package keeps running its current version (the user owns the box). Updates, new templates and cloud features pause until renewal — enforced at the agent's entitlement check, not by disabling anything on the user's machine.

## Architecture

**Platform (aiAlgo cloud)** — builder, backtester on platform-licensed market data, versioned template library, read-only monitoring dashboard fed by the agent, a **release registry** of signed packages with version metadata, changelogs and diffs, subscription billing with tier gating, and an audit log of every deployment and approval.

**Local package (user's machine or VPS)** — one-command Docker Compose bundle containing the execution engine, broker gateway connector and update agent. It talks to the user's broker gateway (e.g. Futu OpenD) over localhost only, generates and places orders locally, takes broker credentials from a local `.env` the user fills in, and syncs positions/order history back to aiAlgo read-only, only with an explicit consent toggle the user can flip off at any time.

**Deploy options** — (a) manual download plus setup docs, any machine the user wants; (b) one-click deploy to the user's *own* cloud (AWS / DigitalOcean / generic VPS), where the deployer provisions, installs, then destroys its credentials and retains no SSH key or management channel. The dashboard states plainly that access was relinquished.

**Pull-based updates** — the agent authenticates with the user's *platform* account token, checks tier entitlement, and pulls from the release registry. Update policy is set once at onboarding: infra/security patches auto-apply; parameter changes within user-set bounds auto-apply or notify-only; strategy logic changes always require one-tap approval. Every release is signed and the agent verifies signature and hash before applying. Pipeline: validate → optional paper-run → canary → live, with automatic rollback to last-known-good, one-click revert and version pinning in the dashboard, and a pre-deployment diff view.

## Broker linking

Read-only OAuth where the broker or an aggregator (e.g. SnapTrade for moomoo in supported regions) offers it — aiAlgo receives a revocable read token, never a password. Everywhere else, the local agent is the only path and the UI says so. Each provider gets a `linking` mode of `oauth`, `aggregator` or `agent_only`; nothing is claimed supported until its program terms are verified. No broker credential form remains anywhere in the app.

## What changes in the product

1. **Landing page** rewritten around "build it here, run it yourself": self-hosted, credential-free, subscription-only. All "pay only when you win" / performance-fee messaging is removed, as is `/how-we-make-money` in its current form (replaced by a plain "how pricing works" section). No return claims.
2. **New pricing page** with the three tiers, monthly/annual toggle, and an explicit "no commissions, no per-trade fees" line.
3. **Onboarding** gains two steps after tier selection: update policy (three categories) and data-sync consent.
4. **Trading accounts** becomes "Linked accounts (read-only)" — OAuth buttons or "install the agent", plus a banner explaining the regulatory change and the purge of stored credentials.
5. **Trading Desk** becomes read-only monitoring: positions, PnL, deployment status and a blotter of fills reported by the agent, keeping the Manual / Algo / AI origin badges. Manual order entry and all order-placement UI are removed.
6. **New Deployments page**: package downloads, one-click cloud deploy, agent health/heartbeat, version pinning, rollback, pending-approval cards with the diff view, and the deployment audit log.
7. **Billing** drops fee accrual, watermarks and batch charging; it becomes plan management plus invoices.
8. **Marketplace / contributor earnings**: the 80/20 commission split and payout machinery are removed. Templates and models become part of the subscription-gated library. Contributor recognition stays; monetary earnings, Stripe Connect payouts and fee dashboards are retired. *This is the largest deletion in the plan — confirm before build if contributors should instead be paid from a subscription revenue pool rather than not at all.*
9. **Backtesting** is gated by tier: 1 year on Free, full history and walk-forward on Pro and above.

## Technical notes

- **Schema**: drop `credentials_encrypted` and secret fields from `broker_connections`; add `linking_mode`, `auth_status`, `scope`, `token_ref`. New `releases` (version, kind, signature, hash, changelog, min tier), `deployments` (machine label, package version, channel, status, heartbeat, agent token hash), `deployment_events` (validate/paper/canary/live/rollback), `update_policies`, `approvals`, `sync_consents`. Drop or archive fee/commission tables (`fee_accruals`, payout tables, Connect account refs) after confirming step 8. All new tables with owner-scoped RLS and explicit GRANTs.
- **Agent API** lives under `src/routes/api/public/agent/*`: `GET /manifest` (entitlement-checked release list), `GET /package/:version` (signed artifact URL), `POST /telemetry` (positions, fills, heartbeat), `POST /events`. Every handler verifies a hashed agent token bound to a user and deployment, and rate-limits. No endpoint accepts or emits an order instruction.
- **Package generation** reuses `strategy-codegen.ts`, zipped with `docker-compose.yml`, `.env.example`, runbook and a detached signature; served through an authenticated server function.
- **Removals**: `execution.server.ts` order paths, `trading-desk.functions.ts` order placement, broker write adapters in `brokers.server.ts`, `credentialsEncrypted` handling in `data-routing.server.ts`, the managed-bridge concept, and the performance-fee logic in `monetization.ts`.
- **Entitlements**: `PLAN_LIMITS` reshaped to free / pro / elite with `backtestYears`, `maxDeployments`, `autoUpdates`, `oneClickDeploy`, `liveMonitoring`, `advancedPipeline`, `teamSeats`; `marketplaceFeeRate` deleted. New Stripe products/prices for pro and elite, monthly and annual.
- **Legal**: `/trading-disclaimer` states aiAlgo is software tooling with no discretionary authority, is not a broker or adviser, and that the user operates the execution software and bears responsibility for every order it places. Consent is versioned and required before a package download or cloud deploy.
