# Merge Billing + Earnings, comprehensive profile, drop Admin

## 1. One "Billing & earnings" page

`/dashboard/billing` becomes the single money page. `/dashboard/earnings` is removed and redirects here. Sidebar keeps one entry under Account.

The page has two sections:

**You pay (everyone)**
- Plan card: Free vs Basic ($12/mo), renewal/cancel date, "Go live for $12" on Free or "Manage billing" (Stripe portal) on Basic.
- Performance fees this period: accrued total, number of profitable closed trades charged, the high-water-mark rule in plain English, next batch charge date.
- What Basic unlocks: live execution, real-time data, premium feeds, multi-account, broker connections, intraday sync.
- Charge history: subscription invoices and fee batches in one list.
- Removed: the strategies / backtests / AI-request usage meters (both plans are unlimited on these, so the bars are meaningless) and the stale "Pro+ / Elite" feature rows.

**You earn (contributors only)**
Rendered only when the signed-in user has a contributor profile. Non-contributors instead see a one-line "Start selling your strategies" link to the listing flow.
- Gross sales this period, platform commission, net to you.
- Transactions table (model, kind, gross, commission, net, status, date).
- Payout history and payout/KYC/tax status, with the link to the payouts page.

## 2. Comprehensive, editable profile

`/dashboard/settings` is rebuilt as a proper profile page, all fields editable and saving:
- Avatar (initials fallback), display name, email (read-only, from the account), bio, country, website.
- Trading preferences: risk tolerance, base currency, timezone, preferred language.
- Contributor identity, shown when a contributor profile exists: public handle, public display name, bio, payout email, plus read-only KYC / tax / payout status badges. A "Become a contributor" action creates the profile for users who don't have one.
- Notification preferences: email on fill, on risk event, on payout.
- Account section: change password, sign out everywhere, delete account request.

Each card saves independently with inline validation and a success toast.

## 3. Remove Admin

- Delete `/dashboard/admin`, `/dashboard/admin/revenue` and `/dashboard/admin/backtest`.
- Remove both admin nav entries and the `nav.admin` / `nav.adminRevenue` keys from all three locales.
- Remove admin-only UI branches and the `src/lib/admin.functions.ts` calls the pages used.

## Technical notes

- Rewrite `src/routes/_authenticated/dashboard.billing.tsx` to compose the pay section plus a `<ContributorEarnings />` component extracted from the current earnings page; delete `dashboard.earnings.tsx` and add a redirect route.
- Contributor gating uses the existing `getContributorBilling` result (`contributor: null` means not a contributor), so no new role check is needed.
- Fee accrual/batch reads come from the existing `performance_fees` / `fee_batches` tables via a new `getMyFeeSummary` server fn in `src/lib/payments.functions.ts`.
- Profile edits write to `profiles` and `contributor_profiles`; new profile columns (bio, country, website, timezone, base currency, notification prefs) need one migration adding nullable columns — no policy changes, existing owner-scoped RLS covers them.
- `src/lib/nav.ts` and `src/lib/i18n.tsx` updated for the removed entries and the renamed billing label.
- The database `app_role` enum and `has_role` stay in place; only the admin UI goes.
