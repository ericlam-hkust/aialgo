# Monetization for AlgoForge

Business model: tiered SaaS subscription (primary) + marketplace commission (secondary), with usage limits enforced in-app.

## Plans

| Plan | Price | Limits |
| --- | --- | --- |
| Free | HK$0 | 1 strategy, 5 backtests/month, delayed data, no paper deployment, no marketplace publishing |
| Pro | HK$299/mo | 25 strategies, 500 backtests/month, live data sources, paper trading + deployments, AI assistant, publish to marketplace |
| Elite | HK$799/mo | Unlimited strategies/backtests, broker connections, intraday sync, priority AI, 0% marketplace fee on sales |

Marketplace: creators keep 80% of subscription revenue on their strategies; platform takes 20% (0% for Elite creators).

## What gets built

1. **Billing integration** — Stripe Checkout via the built-in payments integration; three products (Pro monthly, Elite monthly, plus marketplace one-off strategy purchases). Webhook keeps subscription state in the database.
2. **Database** — `plan_tier` enum (free/pro/elite), `subscriptions` table (user, tier, status, current_period_end, provider ids), `usage_counters` table (user, month, backtests_run, ai_calls), `creator_payouts` table (creator, gross, fee, net, status). RLS on all; webhook writes with service role.
3. **Entitlements layer** — one server-side source of truth mapping tier to limits, used by:
   - backtest server fn (monthly backtest cap)
   - strategy create/clone (strategy count cap)
   - AI assistant + builder AI (call cap)
   - data sources page (live providers gated to Pro+)
   - brokers page (Elite only)
   - marketplace publish (Pro+)
   Each gated action returns a clear "upgrade required" error the UI renders as an upgrade prompt.
4. **UI**
   - Landing page: replace the 2-card pricing block with 3 tiers, HK$ pricing, annual toggle (2 months free).
   - New `/dashboard/billing`: current plan, usage meters (backtests, strategies, AI calls), upgrade/downgrade buttons, manage-billing portal link, invoice history.
   - Upgrade dialog component reused wherever a limit is hit.
   - Sidebar: plan badge + "Upgrade" entry.
   - Marketplace: price display with platform fee note; creator earnings panel showing gross/fee/net and payout status.
5. **Onboarding**: after signup users land on Free; a soft prompt shows the Pro trial (14-day, card required) once they hit the first limit.

## Technical notes

- Payments through the Lovable Stripe integration; checkout session + customer portal created in `createServerFn`, webhook at `src/routes/api/public/webhooks/stripe.ts` with signature verification before any write.
- Entitlements live in `src/lib/entitlements.ts` (pure config) + `src/lib/entitlements.server.ts` (reads subscription + usage, throws typed `UpgradeRequiredError`).
- Usage counters incremented inside the same server fn that performs the metered action, keyed by `user_id + YYYY-MM`.
- Payouts are recorded only (ledger + CSV export); actual transfers are manual in phase 1, Stripe Connect can follow later.

## Out of scope for this phase

Stripe Connect onboarding for creators, prop-firm/white-label tiers, per-broker revenue share.
