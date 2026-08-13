# aiAlgo monetization: hybrid compute (Model C), trust tiers, and the full revenue loop

Replaces the current single-subscription billing with a complete marketplace economy. Every listing runs one of two ways — **Tier 1 Platform-Hosted** (AI/ML model artifact or traditional algo strategy, run in our sandbox on our feeds) or **Tier 2 Remote via Signal Gateway** (contributor runs it on their own low-latency infrastructure and posts signals to us). Consumers pay for live execution, contributors pay for compute or gateway access, and the platform takes commission on every sale.

## 1. Model types (both Tier 1)

- **AI/ML model** — uploaded artifact (weights, ONNX, pickle) plus the full interface manifest.
- **Algo strategy** — rule-based logic (momentum, mean-reversion, grid, arbitrage) uploaded as strategy code or built from a parameterized template, with a simplified manifest: parameters and instruments only, no ML dependencies.

Both share the same model card, backtest pipeline, versioning, trust badges and 80/20 split. The upload wizard branches on type at step 1, the catalog gets a type filter, and each type carries its own icon and label everywhere it appears.

## 2. Trust tiers

Derived automatically, never set by hand:

- **Platform Verified** — Tier 1 hosted (AI model or algo), code runs on our infra, full backtest audit passed.
- **Live Verified** — Tier 2 remote with 90+ days of gateway-timestamped signals.
- **New — Unproven** — under 90 days of live history; remote models graduate automatically at day 90.

Badge on catalog cards, model header, leaderboard rows, compare view and API responses, with a tooltip linking to a public **/models/verification** page that explains how each tier is earned and what it does not promise.

## 3. Trading frequency classification

Declared at upload and verified by the backtest pipeline — if measured trade frequency contradicts the declaration, validation fails with a note to the contributor. Classes: **HFT** (sub-minute to minute), **Intraday**, **Swing**, **Position**. Rendered as a prominent badge with icon ("⚡ HFT-Ready", "📊 Swing Trading") on cards, model pages and the comparison tool, with a dedicated "Trading frequency" catalog filter. Model pages show measured signal latency and average holding period from the verified backtest to back the claim.

## 4. HFT suitability in model selection

- Tier 1 hosted models are labelled "Standard Execution — suitable for Intraday, Swing and Position trading".
- Tier 2 remote models earn "⚡ HFT-Ready — runs on contributor's low-latency infrastructure" only when the contributor declares HFT and the gateway's measured p95 latency is consistently under 100ms; the live measurement is displayed next to the badge.
- Selecting an HFT model in the apply flow shows an informational note about contributor-side colocation, API-trading broker requirements and capital needs, and a compatibility warning before activation if the chosen broker connection's measured latency is too slow.

## 5. Signal Gateway (Tier 2)

`/dashboard/gateway` for remote contributors: Signal API credentials (existing team token system, new `signals:write` scope), endpoint documentation for both REST and a low-latency WebSocket streaming endpoint, live gateway status, throughput stats, latency monitoring (receipt → validation → routing, per model, with a chart and percentile breakdown), and per-model signal logs (received timestamp, validation result, subscriber count reached, rejection reason). An auto kill-switch pauses a remote model when signals stop arriving past its heartbeat window, validation failures cross a threshold, or latency degrades beyond the declared class — subscribers get in-app and email notification. `POST /api/public/v1/signals` (plus the WS channel) is the only path from a remote model to execution.

## 6. Consumer plans

Public `/pricing` with a monthly/annual toggle (annual = 2 months free):

- **Free** — browsing, paper trading with all models except HFT ("HFT simulation requires Pro"), 3 sandbox backtests/month, delayed leaderboard, community feeds, no live execution.
- **Pro $49/mo** — live execution up to 3 concurrent strategies, real-time data, unlimited sandbox backtests, priority execution, HFT model access, full API access.
- **Desk $249/mo** — unlimited concurrent strategies, fastest execution slots, premium feeds included, multi-account execution, dedicated support.

Entitlements are re-cut around these three tiers; the apply-model flow offers upgrade or paper mode instead of a dead end.

## 7. Contributor compute plans (Tier 1, type-aware)

`/dashboard/compute` shows the plans relevant to the declared model type:

- Algos — Shared CPU (free, delayed data, 1 algo) and Dedicated CPU Basic $29/mo.
- AI/ML — Dedicated CPU Pro $99/mo and GPU metered at $0.80/hr with an hours dashboard and a contributor-set monthly spending cap that suspends GPU runs and notifies on breach.

Each type gets a cost calculator: compute cost + expected subscriber revenue − 20% commission = projected net.

## 8. Signal API pricing (Tier 2)

Standard: 10,000 calls/month free, then $5 per additional 1,000, or flat **Remote Pro $199/mo** unlimited REST. **Remote HFT $499/mo** adds unlimited calls, the WebSocket endpoint, priority routing, sub-100ms SLA monitoring and dedicated capacity — required for any HFT-classified model. Usage meter shows calls used, projected overage and current latency percentile, with a switch between metered and flat effective next cycle.

## 9. Commission and revenue split

20/80 on every sale and subscription, identical for AI models, algos and remote HFT. Trailing 30-day gross above $10,000 flips the contributor to 85/15 with a **Pro Creator** badge and progress bar ("$3,240 more this month to unlock 85/15"). Split is computed at checkout and stored per transaction; earnings show gross → commission → tier bonus → net per line.

## 10. Stripe Connect payouts

Express onboarding with KYC; states onboarding incomplete → verified → payout scheduled → paid (plus failed). Monthly automated cycle batches cleared transactions, with payout history and downloadable statements. No manual payout action exists anywhere. Admin sees commissions earned, payouts pending and failures with the Stripe reason.

## 11. Data feed add-ons

Community (free, delayed), real-time crypto $15/mo, real-time equities $30/mo, premium tick $79/mo (flagged as required for HFT backtests). Pro bundles crypto + equities; Desk bundles all. Contributors can attach paid feeds to a hosted model's compute environment, billed on their contributor invoice.

## 12. Broker referrals (disclosed)

Partner cards for Alpaca, IBKR and Binance on Connected Accounts with tracked links, an "HFT-compatible" tag on brokers whose API latency qualifies, and a permanent disclosure line. Admin reports clicks, signups and revenue by broker.

## 13. Promoted listings (ships dark)

Contributors can buy featured placement; promoted cards are visually distinct and labelled "Promoted". Enforced in code: promotion never reorders leaderboards or performance sorts, never affects verification, and requires an existing trust tier. An admin "Launch paid discovery" switch hides the whole surface until enabled.

## 14. Compliance layer

Risk disclosure on every model page, an extra HFT execution/slippage note on HFT models, a platform-wide disclaimer footer, a creator licensing warranty in the submission wizard, and a jurisdiction notice at signup. Admin gets a content/takedown queue with review and delist actions.

## 15. Unified billing

- **Consumer** — plan, model subscriptions, data add-ons, payment methods, invoices.
- **Contributor** — compute plan (type-aware), Signal API usage and overage (Standard vs HFT), earnings, commission breakdown, payout status, costs and revenue in one view.
- **Admin revenue** — MRR, commission split by AI model / algo / remote HFT, compute margin by algo / AI / GPU, Signal API revenue by tier, data, referral and promoted revenue, each with a trend chart.

## Technical notes

- **One migration** adds to `ai_models`: `hosting_mode`, `model_type`, `trust_tier`, `frequency_class`, `measured_latency_ms`, `avg_holding_period`. New tables: `signal_events`, `gateway_metrics`, `compute_plans`, `compute_usage`, `signal_api_usage`, `data_addons`, `user_data_addons`, `referral_partners`, `referral_clicks`, `promoted_listings`, `compliance_flags`, plus `platform_settings` rows for the discovery switch and commission tiers; `model_transactions` gains `commission_rate`, `tier_bonus`, `net_amount`. Enums for hosting mode, model type, trust tier, frequency class, compute plan, payout state. Every new public table gets GRANTs and RLS scoped to owner, team or `has_role(auth.uid(),'admin')`; only catalog-facing rows are readable by `anon`. Seeded with realistic financials — 90+ days of gateway signals with latency traces for remote models, algo and AI listings across all four frequency classes, compute and GPU usage, transactions spanning both commission tiers, referral and promoted revenue — so every dashboard is populated on first load.
- **Server functions**: `gateway.functions.ts`, `compute.functions.ts`, `revenue.functions.ts`, `referrals.functions.ts`, `promotions.functions.ts`, `compliance.functions.ts`; `payments.functions.ts` and `entitlements.server.ts` re-cut for Free/Pro/Desk plus add-ons. Trust-tier and frequency derivation live in a shared pure module used by server and UI.
- **Stripe**: products/prices for Pro and Desk (monthly + annual), Dedicated CPU Basic and Pro, Remote Pro, Remote HFT, three data feeds, GPU metered usage and promoted placements. Embedded checkout stays; the webhook extends to subscription lifecycle, metered usage records, Connect `account.updated` and payout events. Digital products, so Stripe handles end-to-end tax compliance for buyers in ~80 countries (+3.5% per transaction), falling back to calculation-only elsewhere.
- **Navigation**: gateway and compute under EARN, pricing and data add-ons under ACCOUNT/DISCOVER, verification page public under DISCOVER; nav search terms extended.

## Delivery order

1. Migration, seed data, model-type/trust-tier/frequency derivation and badges everywhere.
2. Consumer plans, pricing page, entitlement re-cut, live-execution and HFT gating.
3. Signal Gateway page, REST + WS ingest, latency monitoring, kill-switch and notifications.
4. Compute plans by model type, GPU metering, Signal API tiers, contributor calculators.
5. Commission engine, Pro Creator tier, Connect payouts and statements.
6. Data add-ons, broker referrals, promoted listings (gated), compliance layer.
7. Unified consumer/contributor billing and the admin revenue dashboard.
