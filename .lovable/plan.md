# Marketplace commission + community-driven pricing

Addendum to the self-hosted, subscription pivot. Subscriptions stay for platform features; on top of that, **builders can sell their strategies and aiAlgo takes a commission on each sale**. Section 8 of the previous plan (removing the commission split) is reversed: marketplace monetization is back, and the earlier `contributor_allocations` / revenue-pool machinery becomes secondary to direct sales.

## How a strategy gets a price

When a builder lists a strategy (algo or AI model), they choose one of two pricing modes:

1. **Builder-set price** — the builder types their own price and pricing model (one-time, monthly, per-signal). The suggestion engine still shows a recommended band as guidance, but the builder's number wins.
2. **Platform-set price (Auto)** — the builder delegates pricing to aiAlgo's pricing model. The price is recomputed automatically as new evidence arrives (fresh backtests, live track record, and community signals) and the builder can switch back to manual at any time.

Every listing shows a clear, non-hideable label:

- `Price set by builder` — with the date last changed.
- `Price set by aiAlgo` — with a tooltip/panel showing the factors and weights that produced it, and the date of the last repricing.

The same badge appears on the marketplace card, the detail page, the compare tool, and the builder's own listing dashboard, so buyers always know who set the number.

## Community signals feed the pricing model

Buyers and other users can **like** a listing and **comment** on it. Both feed the automatic pricing model:

- Likes: net likes, weighted by whether the liker actually owns/ran the strategy (verified users count more, and much more against vote-brigading).
- Comments: each comment gets a sentiment score (positive / neutral / negative) from the AI gateway; the model uses the rolling sentiment average and volume, not raw comment counts.
- Existing verified star reviews continue to count.

More positive engagement raises the demand component of the score, and therefore the auto price; sustained negative sentiment lowers it. Movement is bounded — auto prices move at most ±15% per repricing cycle and never more than 2x/0.5x the performance-only baseline, so a like campaign can't distort a weak strategy into a premium price.

### Pricing model factors

| Group | Weight | Inputs |
| --- | --- | --- |
| Verified performance | 55% | Sharpe, max drawdown, win rate, profit factor, walk-forward consistency, sample size (existing engine) |
| Community demand | 25% | Weighted likes, comment sentiment, verified review rating, follower/subscriber growth |
| Traction | 15% | Active users, retention, executions |
| Freshness & risk | 5% | Recency of verified backtest, live-since duration; penalties for overfitting risk or stale evidence |

The panel lists each factor with its score and a one-line explanation — the same transparency rule as today's suggestion engine. A model trained on realized sales (price vs. conversion) refines the group weights over time; until enough sales exist, it runs on the transparent weighted formula above so it works from day one.

## Commission

- Platform commission on every marketplace sale, default **20%**, configurable in platform settings; contributor take-home is shown gross → commission → net before publishing and on every sale.
- Commission rate and net payout are displayed on the listing wizard's pricing step so builders see exactly what they earn per sale.
- Sales, commission and net are recorded per transaction and rolled up in the builder's Earnings view; payouts via the existing Stripe Connect contributor account.

## What gets built

1. **Listing wizard pricing step**: a mode toggle (Builder-set / Let aiAlgo price it), the price input or the auto preview, the factor breakdown, and the commission/net line.
2. **Auto-repricing**: a server function that recomputes prices for auto-mode listings from performance + community + traction, writes the new price and a reprice history row, and notifies the builder when the price changes.
3. **Likes & comments**: like button (one per user per listing, toggleable) and a comment thread on the listing detail page, with owner moderation (report/hide abuse) and verified-owner badges on both.
4. **Pricing-source labels** across marketplace card, detail page, compare tool and the builder dashboard.
5. **Earnings**: sales list with gross / commission / net, payout status, and a per-listing revenue chart.

## Technical notes

- **Schema**: `ai_models` gains `pricing_mode` (`builder` | `platform`), `price_set_at`, `price_source_note`; new `model_likes` (model_id, user_id unique, verified_owner), `model_comments` (model_id, user_id, body, sentiment, sentiment_score, hidden), `model_price_history` (model_id, price, mode, factors jsonb, created_at), and `model_transactions` reused for gross/commission/net. All with RLS + explicit GRANTs; likes/comments readable by anyone who can view the model, writable by authenticated users only.
- **Pricing engine**: extend `src/lib/pricing-suggestion.ts` with a `demand` input group (likes, sentiment, reviews, traction) and export `computeAutoPrice()` used by both the wizard preview and the repricing job. Keep it pure and unit-testable.
- **Sentiment**: scored in a server function via the Lovable AI gateway on comment insert, stored on the row so pricing never calls the model at read time.
- **Repricing cadence**: server function invoked on a schedule via `src/routes/api/public/...` cron endpoint plus on significant events (new verified backtest, like/comment thresholds), with the ±15% cycle cap enforced server-side.
- **Abuse controls**: one like per user per model, likes from non-owners weighted lower, rate limits on comments, and self-likes/self-comments excluded from pricing input.
