# Unify into one "Backtest Playground"

Today there are three overlapping pages: a quick strategy backtest (`/dashboard/strategies/backtest`), a model sandbox (`/dashboard/models/playground`), and the validation job queue (`/dashboard/models/backtests`). The first two do the same job for different asset types and get merged into a single **Backtest Playground**; the queue stays as the read-only history/validation list.

## The unified page

One route, `/dashboard/backtest`, with a single run form that works for both contributor asset types:

1. **What to test** — one picker listing everything the contributor owns, grouped into "Algo strategies" and "AI models". Selecting either drives the rest of the form (asset class, timeframe and universe prefill from the item).
2. **Data source** — required choice before a run can start:
   - *Platform data* — feeds from the data library, already verified.
   - *My connected source* — only connections the contributor has created under Data → Data sources, and only those whose last connection test passed. Sources that are unconfigured, untested or failing are shown greyed out with a "Connect under Data sources" link, so the connection genuinely has to exist first.
   - The chosen source is stamped onto the run (kind, id, label) and later onto the listing, so buyers always see which feed produced the numbers.
3. **Universe & period** — symbols from the selected feed, timeframe, start/end date, plus a data-availability check that reports coverage and gaps per symbol before the run is allowed.
4. **Execution assumptions** — starting capital, commission, slippage, spread, position size, max positions, max leverage.
5. **Run mode**:
   - *Self-test (sandbox)* — free-form, unlimited parameters, results private, never shown on a listing.
   - *Validation run* — uses the locked platform protocol (fixed in-sample/holdout split, walk-forward windows, thresholds) and produces the verified report a public listing requires.
6. **Results** — the existing report view: equity curve vs benchmark, drawdown, monthly/annual returns, trade distribution, regime breakdown, walk-forward window table with consistency score and overfitting flag, plus pass/fail against the platform thresholds.
7. **Run history** — every run is a saved job row; the contributor can reopen, compare and pick which run to attach to a listing.

## Requirements for a "thoughtful" backtest

These are enforced by the page, with clear inline reasons when a run is blocked:

- A selected strategy or model that produces signals in the expected format.
- A data source that is connected and passing (platform feed or contributor connection).
- Enough history: minimum coverage for the universe/timeframe, no unexplained gaps.
- An out-of-sample holdout period untouched by the in-sample window.
- Realistic costs: commission, slippage and spread must be non-zero for a validation run.
- Risk bounds declared: capital, position sizing, max positions, leverage, drawdown limit.
- A benchmark for comparison.
- Minimum sample size: enough trades and enough calendar history to be meaningful.
- Walk-forward stability across rolling windows, with an overfitting warning when variance is high.

## Private vs public

- **Private / draft**: any run is optional. Contributors can iterate freely in self-test mode.
- **Public listing**: blocked until a *validation* run on the locked protocol has completed and passed, with its data source recorded. The listing wizard reads that run; without one it shows "no verified backtest yet" instead of numbers.

## Navigation

BUILD section becomes:

```text
Backtest Playground   /dashboard/backtest      (run tests — algo + AI model)
Validation jobs       /dashboard/backtest/jobs (queue, history, appeals)
```

The old `/dashboard/strategies/backtest` and `/dashboard/models/playground` paths redirect to the new one.

## Technical notes

- New route `src/routes/_authenticated/dashboard.backtest.tsx` absorbing both existing pages; `dashboard.models.backtests.tsx` moves to `dashboard.backtest.jobs.tsx`. Old routes become redirects.
- `BacktestConfigForm` gains a data-source picker fed by `listDataCatalog()` (platform) and `listDataSources()` (contributor, filtered on passing status), writing `dataSourceKind` / `dataSourceId` / `dataSourceLabel` already present in `BacktestConfig`.
- Runs go through the existing `runSandboxBacktest` (self-test) and `submitForValidation` (verified) server functions; both already persist a `backtest_jobs` row with config, protocol and full result JSON.
- Target picker unions `listMyModels()` with the contributor's `strategies` rows; algo strategies run through the same job pipeline so the report format is identical.
- Publish gating reuses `algo-listing.functions.ts`: public visibility requires a completed passing validation job id.
- No mock metrics anywhere — jobs, results and data-source attribution are all read back from the database.
