# Publish an algo strategy: pricing + verified backtest evidence

Today, "Publish listing" from the strategy library creates a draft listing with price 0 and no backtest step, so a contributor cannot set a price, cannot attach backtest evidence, and buyers cannot see which data source produced the numbers. This adds a proper publish flow for algo strategies.

## What the contributor gets

A 4-step "List this strategy" flow launched from the strategy library (and from the builder):

1. **Listing details** — name, tagline, description, tags, risk level (prefilled from the strategy).
2. **Backtest** — pick the data source and universe, then run the platform validation backtest.
   - Data source choice: platform data feeds from the data library, or one of the contributor's own connected data sources.
   - Symbols, timeframe, date range, starting capital, commission and slippage.
   - Runs through the existing validation pipeline, so the result is a platform-verified run, not a self-reported number.
3. **Results & pricing** — shows the produced metrics (win %, loss %, total trades, total return, CAGR, Sharpe, max drawdown, profit factor, average holding time, walk-forward consistency) plus a **suggested price** with the reason behind it. The contributor picks a pricing model (one-time / subscription / per-signal) and can accept the suggestion or override it, with a warning when the price is far above the suggested band.
4. **Review & publish** — final summary, then submit for review with the backtest attached.

## Pricing suggestion mechanism

A transparent scoring function (no black box). Each factor gives points, the total maps to a suggested monthly price band:

| Factor | Weight | Rewarded when |
| --- | --- | --- |
| Risk-adjusted return (Sharpe) | 30% | Higher Sharpe |
| Max drawdown | 20% | Shallower drawdown |
| Win rate + profit factor | 20% | Consistently profitable trades |
| Walk-forward consistency | 20% | Stable across rolling windows |
| Sample size (trade count, history length) | 10% | More trades, longer period |

Penalties: overfitting-risk flag, drawdown above the platform limit, or too few trades pull the score (and price) down. The UI shows the score, the suggested band (e.g. "HKD 120–180 / month"), and a one-line explanation per factor, so the number never feels arbitrary. Weak results get a low band or a "not ready to list" message pointing at what to improve.

## What buyers see on the listing

A "Verified backtest" block on the marketplace detail page and card:

- Win % / loss %, trades, total return, CAGR, Sharpe, max drawdown, profit factor.
- Period tested, universe and timeframe.
- **Data source attribution**: the exact feed used ("Platform feed — HK equities EOD" or "Contributor source — IBKR historical"), with a badge distinguishing platform-verified data from contributor-supplied data.
- Date the backtest was run and the strategy version it ran against.

Contributor-supplied data sources are clearly labelled as unverified so buyers can weigh the evidence.

## Technical notes

- **Database**: add to `ai_models` the backtest attribution fields — `backtest_job_id`, `data_source_kind` (`platform` | `contributor`), `data_source_label`, `backtest_ran_at`, `win_rate`, `loss_rate`, `profit_factor`, `total_trades`, `suggested_price`, `pricing_score` (only add what is missing; several perf columns already exist). Migration includes GRANTs; RLS follows the existing `ai_models` policies. Add `data_source_kind` / `data_source_id` to `backtest_jobs` config so the run records its own feed.
- **Server**: extend `publishStrategyListing` in `src/lib/algo-listing.functions.ts` into `createStrategyListingDraft` + `finalizeStrategyListing` (pricing + backtest job id + data source), both auth-gated. Reuse `submitForValidation` from `src/lib/backtest-validation.functions.ts` for the run.
- **Pricing engine**: new client-safe `src/lib/pricing-suggestion.ts` with `scoreBacktest(metrics)` → `{ score, band, factors[] }`, unit-testable and shared by the wizard and the AI-model flow.
- **UI**: new route `src/routes/_authenticated/dashboard.strategies.list.$id.tsx` for the wizard, reusing `BacktestConfigForm` (extended with a data-source picker) and `backtest-report.tsx`. Add a `VerifiedBacktestPanel` component used on `src/routes/marketplace.$slug.tsx`.
- AI model submissions get the same pricing suggestion and data-source attribution on their pricing step, so both contributor types stay equal.
