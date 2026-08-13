# Backend cleanup: drop obsolete tables

Goal: remove tables left over from retired models (credits/wallet, signal gateway, compute metering, promoted listings, referral partners, data add-ons) so the backend matches the current model: free platform + marketplace commission + $12 Basic subscription + performance fees on winning trades.

## Verified findings

Checked every public table against app code (excluding generated types) and against live row counts.

Unreferenced by any app code AND empty or only demo rows:

| Table | Rows | Why it goes |
| --- | --- | --- |
| user_wallets, model_purchases | 0, 0 | credit balance / one-time model purchase — retired |
| marketplace_subscriptions | 0 | replaced by `subscriptions` + performance fees |
| creator_payouts | 0 | superseded by `payout_batches` |
| consumer_fee_settings | 0 | fee config now in `platform_settings` |
| contributor_billing | 7 | old contributor billing, no code path |
| compute_usage, gateway_status, signal_api_usage, signal_events | 108, 6, 30, 1080 | Signal Gateway + compute modules were removed from the product |
| promoted_listings | 0 | paid promotion never shipped |
| referral_partners, referral_clicks, broker_referrals | 3, 0, 4 | referral program not part of current model |
| data_addons, user_data_addons | 4, 0 | paid data add-ons retired with the free-platform pivot |
| compliance_flags | 0 | unused; `compliance_acks` stays |
| market_data_intraday | 0 | never populated; daily bars + live quotes cover the app |
| model_appeals, model_access_grants | 0, 0 | appeals UI and private grant flow are not wired up |

## Kept deliberately

- `performance_fees`, `strategy_watermarks`, `fee_batches` — empty today, but they are the storage for the current performance-fee model; the accrual/batch logic will write to them.
- `user_roles` — no direct code reference, but `has_role()` and many RLS policies depend on it. Removing it would break access control.
- `platform_revenue_events`, `model_transactions`, `payout_batches`, `subscriptions`, `usage_counters` — active billing/earnings surfaces.
- `api_changelog`, `api_incidents` — still power the public API status page.

## Technical steps

1. One migration that drops the tables above with `DROP TABLE ... CASCADE` in dependency order, plus the enum types left orphaned (`signal_plan`, `compute_plan`, `hosting_mode` if no remaining column uses them — verified per column before dropping).
2. Drop any dependent policies/functions that reference dropped tables (CASCADE handles policies; check `can_view_model`, which reads `model_access_grants`, and rewrite it without that branch).
3. Regenerate backend types after the migration.
4. Remove the now-dead code that only touched dropped tables: `src/lib/addons.functions.ts`, `src/lib/referrals.functions.ts`, and the wallet/purchase branches in `src/lib/marketplace-payments.functions.ts` and `src/lib/entitlements.server.ts`; drop any routes/nav entries that render them.
5. Build and typecheck.

Data in the dropped tables is demo/seed data and will not be recoverable.
