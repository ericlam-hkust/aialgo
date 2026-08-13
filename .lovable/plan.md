# aiAlgo monetization: hybrid compute, trust tiers, and the full revenue loop

Replaces the current single-subscription billing with a complete marketplace economy: every model is either platform-hosted (Tier 1) or remote via Signal Gateway (Tier 2), consumers pay for live execution, contributors pay for compute or gateway access, and the platform takes commission on all sales.

## 1. Trust tiers

Every listing gets a tier derived automatically, never set by hand:

- **Platform Verified** — hosted model, code runs in our sandbox, full backtest audit passed.
- **Live Verified** — remote model with 90+ days of gateway-timestamped signals.
- **New — Unproven** — under 90 days of live history.

Remote models graduate automatically at day 90 (recomputed on read and on each gateway ingest). The badge appears on catalog cards, model detail headers, leaderboard rows, compare view and API responses, with a tooltip and a link to a public **/models/verification** page explaining how each tier is earned and what it does not promise.

## 2. Signal Gateway (Tier 2)

New page `/dashboard/gateway` for remote contributors:

- Signal API credentials, reusing the existing team API token system with a new `signals:write` scope.
- Ingestion endpoint docs with a copyable payload example and schema reference.
- Live gateway status, throughput stats (calls today / this month, p95 latency, validation error rate).
- Per-model signal log: received timestamp, schema validation result, subscriber count reached, rejection reason.
- Auto kill-switch: a model is paused when signals stop arriving past its declared heartbeat window or validation failures exceed a threshold; subscribers get an in-app + email notification and the activation is set to paused.

Public endpoint `POST /api/public/v1/signals` authenticates the token, validates against the model manifest, timestamps and stores the signal, then hands it to the existing execution engine. Remote models can only reach execution through this path.

## 3. Consumer plans

Pricing page `/pricing` (public) with a monthly/annual toggle (annual = 2 months free):

- **Free** — browsing, paper trading with any model, 3 sandbox backtests/month, delayed leaderboard, community feeds. No live execution.
- **Pro $49/mo** — live execution, up to 3 concurrent live strategies, real-time data, unlimited sandbox backtests, priority execution slot, full API access.
- **Desk $249/mo** — unlimited concurrent strategies, fastest execution slot, premium feeds included, multi-account execution, dedicated support.

Entitlements are re-cut around these three tiers; going live from the apply-model flow checks the plan and offers upgrade or paper mode instead of blocking.

## 4. Contributor compute plans (Tier 1)

`/dashboard/compute`: Shared CPU (free, delayed data, 1 model), Dedicated CPU $99/mo, GPU metered at $0.80/hr with an hours-used dashboard and a monthly spending cap the contributor sets (hitting the cap suspends GPU runs and notifies). Includes an earnings calculator: compute plan cost + expected subscribers x price − 20% commission = projected net.

## 5. Signal API pricing (Tier 2)

Metered by default: 10,000 calls/month free, then $5 per additional 1,000, or flat **Remote Pro $199/mo** unlimited. Usage meter with projected overage on the gateway and contributor billing pages, plus a switch between metered and flat that takes effect at the next cycle.

## 6. Commission and revenue split

20% platform / 80% contributor on every sale and model subscription. Automatic volume tier: trailing 30-day gross above $10,000 flips the contributor to 85/15 with a **Pro Creator** badge and a progress bar ("$3,240 more this month to unlock 85/15"). The split is computed at checkout and stored per transaction, and the earnings dashboard shows gross → commission → tier bonus → net for each line.

## 7. Stripe Connect payouts

Express onboarding with KYC, state machine: onboarding incomplete → verified → payout scheduled → paid (plus failed). Monthly automated payout cycle batches all cleared transactions; payout history with downloadable statements. No manual payout action exists anywhere in the UI. Admin sees commissions earned, payouts pending, and failures with the Stripe error reason.

## 8. Data feed add-ons

Add-on store on the market data page: community (free, delayed), real-time crypto $15/mo, real-time equities $30/mo, premium tick $79/mo. Pro bundles crypto + equities; Desk bundles all three. Contributors can attach paid feeds to a hosted model's compute environment, billed on their contributor invoice.

## 9. Broker referral revenue

Partner offer cards for Alpaca, IBKR and Binance on Connected Accounts with tracked referral links, and a permanent disclosure line: "aiAlgo may receive referral compensation from broker partners. This never influences broker rankings or integration quality." Admin panel reports clicks, signups and revenue by broker.

## 10. Promoted listings (ships dark)

Contributors can buy featured placement from their listing page. Promoted cards are visually distinct and labelled "Promoted". Hard rules enforced in code: promotion never reorders leaderboards or performance sorts, never affects verification, and a promoted model must already hold a trust tier. An admin "Launch paid discovery" switch keeps the whole surface hidden until enabled.

## 11. Compliance layer

Risk disclosure block on every model page, a platform-wide disclaimer footer, a creator licensing warranty checkbox in the submission wizard, and a jurisdiction notice at signup. Admin gets a content/takedown queue where compliance flags can be raised, reviewed, and resolved with a listing delist action.

## 12. Unified billing

- **Consumer billing** — plan, model subscriptions, data add-ons, payment methods, invoices.
- **Contributor billing** — compute plan, Signal API usage and overage, earnings, commission breakdown, payout status, in one costs-vs-revenue view.
- **Admin revenue dashboard** — MRR, commission, compute margin, Signal API, data, referral and promoted-listing revenue, each its own line with a trend chart.

## Technical notes

- **One migration** adds: `hosting_mode` and `trust_tier` to `ai_models`; `signal_events`, `gateway_status`, `compute_plans`, `compute_usage`, `signal_api_usage`, `data_addons`, `user_data_addons`, `referral_clicks`, `promoted_listings`, `compliance_flags`, `platform_settings` rows for the discovery switch and commission rates; and extends `model_transactions` with `commission_rate`, `tier_bonus`, `net_amount`. Enums for trust tier, hosting mode, compute plan, payout state. Every new public table gets GRANTs plus RLS scoped to owner, team, or `has_role(auth.uid(),'admin')`; only catalog-facing rows are readable by `anon`. Seeded with realistic financial data — 90+ days of signal history for several remote models, compute usage, transactions across the commission tiers, referral and promoted revenue — so every dashboard is populated on first load.
- **Server functions**: `gateway.functions.ts`, `compute.functions.ts`, `revenue.functions.ts`, `referrals.functions.ts`, `promotions.functions.ts`, `compliance.functions.ts`; existing `payments.functions.ts` and `entitlements.server.ts` are re-cut for Free/Pro/Desk plus add-ons. Trust-tier derivation lives in a shared pure module used by both server and UI.
- **Stripe**: new products/prices for Pro, Desk (monthly + annual), Dedicated CPU, Remote Pro, three data feeds, GPU metered usage and promoted placements. Checkout stays embedded; the webhook is extended for subscription lifecycle, metered usage records, Connect `account.updated`, and payout events. Digital products, so Stripe handles end-to-end tax compliance for buyers in ~80 countries (+3.5% per transaction), falling back to calculation-only elsewhere.
- **Navigation**: gateway and compute under EARN, pricing and data add-ons under ACCOUNT/DISCOVER, verification page public under DISCOVER; existing nav search terms extended.

## Delivery order

1. Migration, seed data, trust-tier derivation and badges everywhere.
2. Consumer plans, pricing page, entitlement re-cut, live-execution gating.
3. Signal Gateway page, ingest endpoint, kill-switch and notifications.
4. Compute plans, GPU metering, Signal API metering, contributor calculator.
5. Commission engine, Pro Creator tier, Connect payouts and statements.
6. Data add-ons, broker referrals, promoted listings (gated), compliance layer.
7. Unified consumer/contributor billing and the admin revenue dashboard.
