# Final monetization: free for creators, $12 Basic, per-trade performance fees

Replaces the current Pro/Desk + contributor-compute-fee model with: contributors pay nothing, consumers pay a low subscription plus a performance fee on profitable exits.

## 1. Plan changes (consumer side)

- Plans become `free` and `basic` only. Basic = $12/mo or $120/yr, unlocks live execution (unlimited strategies), real-time data, API access.
- Free = unlimited browsing, unlimited paper trading (including HFT and remote listings) with simulated fee accrual, unlimited sandbox backtests, delayed data, no live execution.
- `pro`/`desk` become legacy aliases mapping to `basic` so existing subscription rows keep working.
- Retire contributor compute plans and Signal API tiers: hosted AI models, hosted algos, and remote/HFT gateway are all free and unlimited.

## 2. Performance fee engine

Per listing: `performance_fee_pct` set by the contributor, 5–25%. Default 15% for AI models, 10% for algos with the volume guidance note.

On every closed trade with net profit (after broker fees/slippage from actual fills):
- profit < $1 → micro-profit exemption, no fee.
- else check the subscriber-strategy watermark: cumulative realized P&L since subscription must be positive; a fee accrues only on profit above the recovery amount.
- fee = profit x fee%; split 80/20 contributor/platform, 85/15 once the contributor's trailing-30-day collected fees exceed $10k (Pro Creator, with progress bar).

Paper trades run the same engine but write `simulated` rows that never charge.

## 3. Batch charging

Accrued fees charge the consumer's card when the balance reaches $10 or on the weekly Sunday cycle, whichever comes first. Each batch produces an itemized receipt (date, instrument, profit, fee, strategy). Failed charge → 3 retries over 7 days with notifications, then live strategies auto-pause while paper keeps running. A per-consumer monthly fee cap auto-pauses strategies with a notification when hit.

## 4. Pages to build or rewrite

- `/pricing` → rewritten: Free vs Basic ($12), performance-fee explainer, worked watermark example.
- `/creators` (new, replaces contributor pricing): "Free for Creators, Forever", AI and algo audiences side by side, both earnings simulators (500 trades x $40 @ 15% and 5,000 trades x $6 @ 10% → both $2,400).
- `/how-we-make-money` (new): $12 + 20% of fees, incentive alignment.
- `/models/$slug` and model cards: "Pay Only on Winning Trades" badge, fee %, fee-efficiency stats (% of closed trades fee-able, avg effective fee/subscriber/month) compared within type, catalog filter by fee %.
- `/models/compare` and leaderboard: fee column with the "verified profitable trades only" note.
- Activation flow (`apply-model-dialog`): fee %, $1 exemption, watermark explanation, batch rule, type-split historical stats, consent checkbox stored in `compliance_acks`.
- Upload wizard: new type-aware fee step with live backtest-derived projection (fee-able trade %, avg fee/trade, subscriber net return after fees, projected exemption rate) and a competitiveness indicator vs marketplace average for that type + frequency class.
- `/dashboard/billing` → two sections: Basic subscription, and Performance fees (live accrued counter, batch history with receipts, fees-vs-profits analytics filterable AI/algo, monthly statement download, fee cap setting, grace-flow banner).
- `/dashboard/execution` + strategy panels: cumulative P&L, watermark status ("fees active" / "$340 of losses to recover"), per-trade fee ledger, "fees accrued this week".
- `/dashboard/models/payouts` → contributor earnings dashboard: subscriber capital, trades closed, profits generated, accrued vs collected, 80/85% share, anonymized per-subscriber rows, collection rate, Stripe Connect Express payout status (7 days after each weekly batch), statements, both simulators.
- `/dashboard/admin/revenue`: MRR from Basic, subscriber count and Free→Basic conversion, capital split by AI / algo / remote HFT, trades and fee volume accrued vs collected per type, 20% commission, payouts, referral revenue, promoted-listing revenue, unit economics ($12 + avg fee commission per subscriber), supply-side view (listings by type, earnings distribution by type, time-to-first-payout).
- `/dashboard/gateway` and `/dashboard/compute`: repositioned as free consoles (usage/telemetry only, no pricing).

## 5. Secondary revenue and compliance

Broker referrals stay on Connected Accounts with HFT-compatible tags and the disclosure line. Promoted listings stay built but dark behind the admin "Launch paid discovery" toggle, open to both listing types, labeled and never affecting ranking. Compliance layer adds the per-trade fee disclosure text, per-listing risk disclosures for both types, HFT notes, creator license warranty, signup jurisdiction notice, and the admin takedown queue.

## 6. Demo data

Seed the full loop with realistic figures: one AI model contributor and one algo contributor through validation → fee setting → listing; a Free user paper-trading a Tier 1 AI model, a Tier 1 algo, and a Tier 2 HFT listing with simulated accrual; upgrade to Basic and go live; many small algo fees batching into one charge vs larger AI-model fees; losing trades moving watermarks; weekly 80% payouts; and a losing week with zero fees and "fees resume after $X of recovered losses" notifications.

## Technical notes

- Migration: `performance_fee_pct` on `ai_models`; new tables `strategy_watermarks` (subscriber x listing cumulative P&L), `performance_fees` (per-trade accrual, simulated flag, split amounts, batch id), `fee_batches` (charge attempts, retries, receipt items), `consumer_fee_settings` (monthly cap). All with GRANTs, RLS scoped to owner/subscriber, and service-role access for the engine.
- Fee computation lives in a server-only module (`src/lib/fees.server.ts`) invoked from the existing execution/fill path so paper and live share one code path.
- Batch charging runs from a public cron route under `src/routes/api/public/` (signature-verified) plus the $10 threshold trigger inline on accrual; charges via the existing Stripe client.
- Pricing constants stay in `src/lib/monetization.ts`; `src/lib/entitlements.ts` collapses to `free | basic` with legacy mapping so `tierFromPriceId` still resolves old rows.
- Marketplace fee-efficiency stats are computed from `performance_fees` aggregated per listing and cached on the listing row for catalog sorting.
