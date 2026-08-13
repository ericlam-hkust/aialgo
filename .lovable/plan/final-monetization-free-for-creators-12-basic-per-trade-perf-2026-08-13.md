# Final monetization: free for creators, $12 Basic, per-trade performance fees

Replaces the current Pro/Desk + contributor-compute-fee model. Contributors pay nothing; consumers pay a low subscription plus a performance fee on profitable exits. Every numbered requirement is covered below in order.

## 1. Free for contributors — both types

Retire all contributor charges: no listing fees, no hosted compute fees (Tier 1 AI models and Tier 1 algos alike), no Signal Gateway fees (Tier 2 remote/HFT, unlimited signal calls). `COMPUTE_PLANS`, `GPU_HOURLY_RATE` and `SIGNAL_PLANS` are removed from the pricing model; `/dashboard/compute` and `/dashboard/gateway` stay as free usage/telemetry consoles with no pricing.

New `/creators` page replaces contributor pricing: "Free for Creators, Forever", AI-model and algo audiences side by side, the shared promise line ("free hosting, free gateway, free backtest pipeline, free execution data — the platform earns only when you earn"), and the math for both: set your own 5–25% per-trade fee, keep 80% of every fee collected.

## 2. Consumer platform subscription

Plans collapse to two:
- **Free** — unlimited browsing, unlimited paper trading with every model and algo including HFT, unlimited sandbox backtests, delayed data, no live execution.
- **Basic $12/mo or $120/yr** — live execution with unlimited strategies, real-time data, API access. The only platform subscription.

Paper trading is always free; going live requires Basic. `pro`/`desk` become legacy aliases resolving to `basic` so existing subscription rows keep working.

## 3. Per-trade performance fee engine

Each listing carries a contributor-set `performance_fee_pct` (5–25%), shown on the model card and activation flow. The upload wizard fee step is type-aware:
- AI model default 15%; algo default 10% with the guidance note about higher frequency and smaller per-trade profits.
- Live backtest-derived projection while the slider moves: % of trades fee-able, average fee per trade, subscriber net return after fees.
- Competitiveness indicator vs the marketplace average for that listing type and frequency class.
- Projected micro-profit exemption rate ("~18% of your trades would be fee-exempt") so contributors can tune before publishing.

On every closed trade with net profit (net of broker fees and slippage, from actual fills):
- profit < $1 → micro-profit exemption, labeled as such, no fee.
- otherwise fee = profit x fee%, split 80/20 contributor/platform. Example: $50 profit at 15% → $7.50 fee → contributor $6.00, platform $1.50.
- Contributors above $10k/month collected fees auto-promote to 85/15 "Pro Creator", with a progress bar — same threshold for both types.

## 4. Per-strategy cumulative watermark

Track cumulative realized P&L per subscriber-strategy pair, identical for AI models and algos. A profitable trade accrues a fee only while cumulative P&L since subscription is positive; losses must be recovered first. Each active strategy panel shows cumulative P&L, watermark status ("fees active" or "$340 of losses to recover before fees resume"), and the per-trade fee ledger. The worked example appears on every model and algo page.

## 5. Fee accrual and batch charging

Fees accrue in real time and show as "Fees accrued this week". Card charges batch at $10 accrued or every Sunday, whichever comes first — the mechanism that makes high-frequency small-fee algos viable, stated explicitly in the algo contributor docs. Each batch produces an itemized receipt (date, instrument, profit, fee). Failed charges: 3 automatic retries over 7 days with notifications, then live strategies auto-pause while paper keeps running free until the payment method is updated. Paper trading simulates accrual, clearly labeled "simulated".

## 6. Fee consent and transparency in activation

Before going live on any listing the activation dialog shows: fee %, the $1 micro-profit exemption, the cumulative watermark explanation, the $10/weekly batch rule, historical stats (average fees per $1,000 of subscriber capital per month, % of trades fee-able) broken out AI vs algo for like-for-like comparison, and a checkbox acknowledgment recorded in `compliance_acks`. Consumers always see total fees paid per strategy and globally, plus a monthly fee cap that auto-pauses the strategy with a notification when hit.

## 7. Consumer billing page

`/dashboard/billing` splits into two sections:
- **Basic subscription** — status, renewal date, payment method.
- **Performance fees** — real-time accrued counter, batch charge history with itemized receipts, fee analytics (fees paid vs profits made, effective fee % over time, filter by AI vs algo), downloadable monthly statements, fee cap control, and the failed-payment grace banner.

## 8. Contributor earnings dashboard (type-aware)

`/dashboard/models/payouts` shows total subscriber capital allocated, trades closed this period, total profits generated for subscribers, fees accrued vs collected, the 80% (or 85%) share, anonymized per-subscriber breakdown, collection rate, and payout status — automated Stripe Connect Express only, KYC onboarding, payouts 7 days after each weekly batch cycle, downloadable statements. Two simulators side by side: AI (500 trades x $40 @ 15% → $3,000 fees → $2,400 earned) and Algo (5,000 trades x $6 @ 10% → $3,000 fees → $2,400 earned — algos win on volume).

## 9. Marketplace trust layer

"Pay Only on Winning Trades" badge on every model and algo card; fee % on all catalog cards with a fee filter; leaderboard column noting fees are charged only on verified profitable trades; per-listing fee-efficiency stats (% of closed trades fee-able, average effective fee per subscriber per month) compared within type so high-frequency low-fee algos aren't ranked against low-frequency AI models. New public `/how-we-make-money` page: "$12/month for live execution + 20% of the per-trade fees. If models and algos don't win trades, we earn nothing from fees."

## 10. Secondary revenue lines

- **Broker referrals** — disclosed partner offers on Connected Accounts with "HFT-compatible" tags, admin revenue tracking, and the disclosure: "aiAlgo may receive referral compensation from broker partners. This never influences broker rankings."
- **Promoted listings** — optional paid visibility open to both listing types, labeled "Promoted", never affecting rankings, shipping dark behind the admin "Launch paid discovery" toggle.

Both surface as separate admin revenue lines.

## 11. Compliance layer

Per-listing risk disclosures for both types, HFT risk notes, the per-trade fee disclosure ("Fees apply to each profitable closed trade above $1, subject to your cumulative watermark; fees are charged to your payment method, not deducted from your broker account"), the platform-wide software-marketplace disclaimer, a creator license warranty covering model authors and algo developers, a jurisdiction notice at signup, and the admin takedown queue.

## 12. Admin revenue dashboard

`/dashboard/admin/revenue` gains: MRR from Basic, subscriber count and Free→Basic conversion, total subscriber capital split by AI models / algos / remote HFT, trades closed per type, fee volume accrued vs collected per type with collection rate, 20% platform commission, contributor payouts, broker referral revenue, promoted listings revenue — each with a trend chart. Unit economics view: revenue per Basic subscriber = $12 + average fee commission. Supply-side view: listings by type, contributor earnings distribution by type (are algo contributors earning comparably?), and time-to-first-payout for new contributors.

## Demo data — full loop, both journeys

Seeded realistic figures covering: an AI model contributor and an algo contributor each going through backtest validation → type-aware fee setting (algo sees the 10% default, exemption-rate warning, volume simulator) → listing with badges; a Free user paper-trading a Tier 1 AI model, a Tier 1 algo and a Tier 2 HFT listing with simulated accrual; upgrade to Basic and go live; the algo's many small wins batching into one efficient charge while the AI model accrues larger fees; losing trades moving watermarks; weekly 80% Stripe Connect payouts to both contributors; the admin dashboard showing MRR + fee commission + referral revenue split by type. Plus a losing week: zero fees accrued anywhere, watermarks updated, consumers notified "No fees — fees resume after $X of recovered losses."

## Technical notes

- Migration: `performance_fee_pct` on `ai_models`; new tables `strategy_watermarks` (subscriber x listing cumulative P&L), `performance_fees` (per-trade accrual, simulated flag, split amounts, batch id), `fee_batches` (charge attempts, retries, receipt items), `consumer_fee_settings` (monthly cap), plus a `pro_creator` flag/threshold view for contributors. All with GRANTs, RLS scoped to owner/subscriber, and service-role access for the engine.
- Fee computation lives in a server-only module (`src/lib/fees.server.ts`) invoked from the existing execution/fill path so paper and live share one code path; watermark updates happen in the same transaction as accrual.
- Batch charging runs from a signature-verified cron route under `src/routes/api/public/` plus the $10 threshold trigger inline on accrual; charges via the existing Stripe client and writes receipts.
- Pricing constants stay in `src/lib/monetization.ts`; `src/lib/entitlements.ts` collapses to `free | basic` with legacy mapping so `tierFromPriceId` still resolves existing rows.
- Fee-efficiency stats aggregate from `performance_fees` per listing and cache on the listing row for catalog sorting and filtering.
