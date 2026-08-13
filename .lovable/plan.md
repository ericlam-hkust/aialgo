# One "Backtest Playground"

Today three pages overlap: a quick strategy backtest (`/dashboard/strategies/backtest`), a model sandbox (`/dashboard/models/playground`), and the validation job queue (`/dashboard/models/backtests`). All three collapse into a single page at `/dashboard/backtest` — **Backtest Playground** — with two tabs: **Run** and **Runs history**.

## Run tab

1. **What to test** — one picker listing everything the contributor owns, grouped "Algo strategies" and "AI models". The selection prefills asset class, timeframe and universe.
2. **Data source** — required before a run can start:
   - *Platform data* — verified feeds from the data library.
   - *My connected source* — only connections the contributor created under Data → Data sources whose last connection test passed. Unconfigured, untested or failing sources appear disabled with a "Connect under Data sources" link, so the connection must genuinely exist first.
   - The chosen feed (kind, id, label) is stamped on the run and later on the public listing.
3. **Universe & period** — symbols from that feed, timeframe, start/end dates, plus a coverage check reporting history and gaps per symbol before the run is allowed.
4. **Execution assumptions** — starting capital, commission, slippage, spread, position size, max positions, max leverage.
5. **Run mode**:
   - *Self-test* — free parameters, private, never used for listing.
   - *Verification run* — locked platform protocol (fixed in-sample/holdout split, walk-forward windows, thresholds); this is the run that can qualify a listing.
6. **Live progress** — the stage/progress bar that used to live in the queue is shown inline while the run executes.

## Results and verification

When a run completes, the report shows equity curve vs benchmark, drawdown, monthly/annual returns, trade distribution, regime breakdown, walk-forward windows with consistency score and overfitting flag, and a **verification checklist** listing each public-listing criterion as pass or fail:

- Verification-mode run on the locked protocol
- Data source recorded (platform feed or a passing contributor connection)
- Sufficient history and out-of-sample holdout untouched by the in-sample window
- Realistic costs applied (commission, slippage, spread all non-zero)
- Minimum trade count and calendar history
- Sharpe at or above the platform minimum
- Max drawdown within the platform limit
- Walk-forward consistency above threshold / no overfitting flag

All criteria pass → the run is stamped **Successfully verified** and the strategy or model becomes eligible to go public; the listing wizard picks up that run's metrics and data-source attribution. Any criterion fails → the report explains exactly what to improve and public listing stays blocked. Private/draft work needs no backtest at all.

## Runs history tab

Replaces the old queue: every run (self-test and verification) as a row with status, mode, data source, headline metrics and a verified badge. From here the contributor can reopen a report, compare runs, appeal a failed verification (appeals move here), and choose which verified run to attach to a listing. Re-running keeps the old rows, so there is a full audit trail.

## Navigation

BUILD keeps one entry: **Backtest Playground** → `/dashboard/backtest`. The old `/dashboard/strategies/backtest`, `/dashboard/models/playground` and `/dashboard/models/backtests` paths redirect to it.

## Technical notes

- New route `src/routes/_authenticated/dashboard.backtest.tsx` absorbing all three pages, with tabbed Run / History; old routes become redirects and nav entries collapse to one.
- `BacktestConfigForm` gains a data-source picker fed by `listDataCatalog()` (platform) and `listDataSources()` (contributor, filtered to passing status), writing the existing `dataSourceKind` / `dataSourceId` / `dataSourceLabel` fields on `BacktestConfig`.
- Runs use existing `runSandboxBacktest` (self-test) and `submitForValidation` (verification); both already persist a `backtest_jobs` row with config, protocol and full result JSON. Progress polling and appeals move from the queue page into this page.
- New client-safe `verificationChecklist(report, protocol)` helper deriving the pass/fail list from stored job results, used by both the report panel and the publish gate.
- Target picker unions `listMyModels()` with the contributor's `strategies` rows; algo strategies run the same pipeline so reports are identical.
- Publish gating in `algo-listing.functions.ts` requires a completed, passing verification job id — re-checked server-side, not just in the UI.
- Nothing mocked: jobs, metrics and data-source attribution are read back from the database.
