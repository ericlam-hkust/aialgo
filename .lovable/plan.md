# Marketplace commission + builder vs platform pricing

This restores marketplace commission on strategy sales (it sits alongside the subscription plans — the platform still never takes a per-trade or performance fee on the user's own trading) and adds two pricing modes plus community signals that feed the platform's pricing model.

## Revenue model (updated)

- Subscriptions (Starter / Pro / Elite) stay as-is for using the builder and runner.
- Marketplace sales of strategies and AI models: builder keeps 80%, platform commission 20%. Elite builders keep 85%.
- Still no commission, per-trade fee, or performance fee on a user's own trading — commission applies only to a marketplace transaction between a buyer and a builder.

## Two pricing modes

When listing a strategy, the builder picks one:

1. **Builder-set price** — the builder types the price and pricing model (one-time / monthly / per-signal). The suggested band is shown as guidance only; going far above it triggers a warning.
2. **Platform-set price (Smart Pricing)** — the builder opts in and the platform's model sets and maintains the price. It can move over time as evidence and community feedback change; the builder sets an optional floor and ceiling and can switch back to manual at any time.

Every listing carries a visible label so buyers know who set the number:

- `Priced by builder` — neutral badge.
- `Priced by aiAlgo` — accent badge with a tooltip explaining the model uses verified backtest quality plus community reception, and a "how this price was set" link showing the factor breakdown.

The label appears on the marketplace card, the listing detail page, and the builder's own listing manager.

## Community signals: likes and comments

On each listing detail page:

- **Like** button (one per user, toggleable, sign-in required) with a live count.
- **Comments** — threaded one level deep, authored by signed-in users, editable/deletable by the author. Buyers who actually run the strategy get a "Verified user" badge on their comment.
- Comments carry an optional sentiment rating (thumbs up / neutral / thumbs down) so the pricing model has a clean signal rather than parsing free text.
- Basic moderation: report a comment, hidden after enough reports, builder cannot delete criticism (only report).

## How community feedback affects the platform price

The existing transparent scoring function is extended with a **community reception** block, so price = performance evidence + reception:

| Group | Weight | Inputs |
| --- | --- | --- |
| Performance evidence | 70% | Sharpe, max drawdown, win rate + profit factor, walk-forward consistency, sample size (existing factors, rescaled) |
| Community reception | 30% | Like ratio vs views, positive comment share, verified-user share of feedback, active subscriber retention |

Rules that keep it honest:

- Reception can move the price within a bounded range (e.g. ±35%) — it can never rescue a listing that fails backtest validation.
- Low-volume listings (few likes/comments) get their reception weight damped toward neutral, so a single like cannot spike the price.
- Suspicious patterns (bursts from new accounts, self-likes) are excluded.
- Repricing runs on a schedule and is capped per period so prices move smoothly; every change is written to a price history the builder and buyers can see.
- Buyers who already bought are never charged more than the price at purchase; subscribers get notice before any increase applies.

The "how this price was set" panel lists each factor, its score, and one line of plain-English explanation — for both modes.

## What gets built

1. **Database** — `pricing_mode` (`builder` | `platform`), `price_floor`, `price_ceiling`, `like_count`, `comment_score` on listings; new `listing_likes`, `listing_comments`, `listing_price_history` tables; commission fields restored on the purchase/earnings path. RLS + GRANTs on every new table (likes/comments readable by anyone, writable by the author only).
2. **Pricing engine** — extend `src/lib/pricing-suggestion.ts` with the reception block and a `computePlatformPrice()` that respects floor/ceiling and step caps; unit-tested pure module.
3. **Server functions** — like/unlike, add/edit/delete/report comment, set pricing mode, and a repricing job for platform-priced listings.
4. **UI** — pricing-mode step in the listing wizard (`dashboard.strategies.list.$id.tsx`), price-source badge + "how this price was set" panel on `marketplace.$slug.tsx` and the model card, likes/comments section on the detail page, price history chart for the builder, and commission/earnings back in the billing & earnings dashboard.
5. **Copy** — pricing and creators pages state the 80/20 marketplace split clearly and repeat that trading itself carries no commission.

## Open point

Automated payouts to builders (Stripe Connect) were removed in the self-hosted pivot. This plan records commission and builder earnings as a ledger with manual payout; wiring automated payouts back in is a separate step.
