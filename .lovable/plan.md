# Keep Billing, but rebuild it for the new model

Billing is still needed. Under the current model users still pay: $12/month for live execution, plus performance fees charged on profitable closed trades. That money flow needs one place to see the plan, the card, the fee accruals, and invoices — that is the Billing page.

What is obsolete is the page's *content*, which is left over from the old Free/Pro/Elite tier limits.

## What is stale today

- Usage meters for strategies, backtests and AI requests — all three limits are now Unlimited on both Free and Basic, so the bars show "0 / Unlimited" and mean nothing.
- The plan card lists "Live data sources — Pro+", "Paper deployments — Pro+", "Broker connections — Elite". Free already includes live data sources and paper deployments, and there is no Elite plan.
- The upgrade button reads "Change plan" only when the tier is already Basic; there is nothing to change to.
- Nothing on the page shows performance fees, which are the main charge users actually care about.

## Rebuilt Billing page

1. **Plan card** — Free vs Basic ($12/mo), renewal or cancel date, one primary action: "Go live for $12" on Free, "Manage billing" (Stripe portal) on Basic.
2. **Performance fees this period** — accrued fee total, number of profitable closed trades charged, the high-water-mark rule stated in plain English ("charged only on new profit above your previous peak"), and next batch charge date.
3. **What Basic unlocks** — live execution, real-time data, premium feeds, multi-account, broker connections, intraday sync. Drop every entry that Free already includes.
4. **Charge history** — subscription invoices and performance-fee batches in one list, newest first, with amount, date and status.
5. Remove the strategies/backtests/AI usage meters entirely.

Sidebar keeps the Billing entry under Account.

## Technical notes

- Rewrite `src/routes/_authenticated/dashboard.billing.tsx`; drop the `UsageBar` block and the `limits.*` rows, keep `useEntitlements`, `createPortalSession` and `UpgradeDialog`.
- Fee accrual and batch data come from the existing performance-fee tables via a read in `src/lib/payments.functions.ts` (add a `getMyFeeSummary` server fn if one does not already cover it).
- Fix the `tier === "basic"` button label logic.
- No schema changes; no change to how fees are calculated.
