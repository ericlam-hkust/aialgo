# Remove Signal Gateway, slim Compute & earnings down to Earnings

## What changes for you

1. **Signal Gateway is gone.** The `/dashboard/gateway` console, its sidebar entry, and the public signal-ingestion endpoint are removed. Nothing else in the marketplace depends on it for browsing, backtests, activation, or payouts.
2. **"Compute & earnings" becomes "Earnings".** The compute usage history table, compute-cost stat card, and compute wording disappear. What stays: gross sales this month, platform commission, net to you, Pro Creator progress, the "free for creators" panel, and payout history.

## Technical details

Remove:
- `src/routes/_authenticated/dashboard.gateway.tsx`
- `src/lib/gateway.functions.ts`, `src/lib/gateway.server.ts`
- `src/routes/api/public/v1/signals.ts`
- Nav entry `/dashboard/gateway` in `src/lib/nav.ts`; `nav.gateway` keys in all three locales in `src/lib/i18n.tsx`

Rename/trim:
- Move the page to `src/routes/_authenticated/dashboard.earnings.tsx` (route `/dashboard/earnings`), update nav entry and `nav.compute` → `nav.earnings` label ("Earnings" / "收益" / "收益"), update page head/meta and headings.
- Drop the "Compute cost" stat, the Usage history card, and compute-related copy; keep the earnings, Pro Creator, free-for-creators, and payout sections.
- In `src/lib/compute.functions.ts`, keep the earnings/payout queries and drop the `compute_usage` query and its return field.

Leave alone: database tables (`compute_usage`, `signal_events`, `gateway_status`, etc.) stay in place unused; `hosting_mode`/trust-tier data and badges elsewhere are untouched. Any remaining gateway mentions in marketing copy (`creators.tsx`, `models.verification.tsx`, admin revenue labels) get reworded so nothing references a Signal Gateway product.
