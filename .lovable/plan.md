# Unified contributor platform + navigation reorg

Two things are tangled today, and fixing them together is what makes the product make sense:

- Visual **Algo strategies** live in one world (`strategies` table, a simple marketplace with a subscribe button, no validation, no earnings) while **AI models** live in a much richer world (validation backtests, playground, versions, reviews, visibility rules, Stripe payouts, activations, execution, usage metering).
- The sidebar is a flat list of 25 links that mixes both worlds plus account settings.

The plan is to make Algo strategies first-class contributions that use the exact same pipeline as AI models, then reorganize the navigation around the resulting structure.

## 1. One listing, two kinds

Instead of building a parallel monetization stack for strategies, an Algo strategy gets **published as a listing in the same catalog** the AI models use. A listing is either:

- `algo` — backed by a visual strategy graph the user built in the Builder
- `ai_model` — backed by an external API endpoint or uploaded package

Everything downstream — validation backtests, playground, verified badges, versions, reviews, pricing, Stripe payouts, private/unlisted/public visibility, team namespaces, activations, execution, kill switches, usage metering — is shared with no duplication.

Private vs. public is just the existing visibility control: a strategy stays private (yours only) until you choose to list it, at which point you pick pricing and it earns money exactly like a model does.

## 2. Contributor flow for Algo strategies

From the strategy library, each strategy gets a **Publish** action that opens the same submission wizard the models use, pre-filled from the strategy:

```text
Metadata  →  Source        →  Interface   →  Pricing  →  Backtest  →  Review
             (algo: the      (algo: params
              strategy graph,  auto-read from
              read-only)       the graph)
```

For `algo` listings the Source step shows the linked strategy and version instead of API/package fields, and the Interface step pre-populates tunable parameters from the strategy graph — the contributor only confirms them.

After submit it goes to the same validation queue, gets the same verified badge, appears in the same catalog, and pays out through the same Stripe Connect contributor account and payout screens.

## 3. Same validation and playground for both

- The validation job queue and the standardized protocol are unchanged; the runner branches only on how signals are produced (replay the strategy graph vs. call the model endpoint).
- The Playground accepts both kinds: pick an algo strategy or a model, choose a config, run a sandbox backtest. Same free-run quota, same report (equity, drawdown, monthly heatmap, walk-forward consistency, overfitting warning).
- Model comparison can put an algo listing and an AI model side by side.

## 4. Same data sources for both

Algo backtests, validation runs and live execution all read through the existing per-user data-source resolver (user keys first, then platform fallback), so a contributor's configured providers apply to both kinds. The Data Library page gains a note about which feeds are usable for algo replays, and the strategy backtest page shows which provider served the data — matching what the model side already shows.

## 5. Navigation reorganization

Two levels of nesting, plus a search box pinned at the top of the sidebar.

```text
[ Search menu…  ⌘K ]

Overview

BUILD
  My work                        (list of everything you own)
    › Algo builder               (visual canvas + AI assist)
    › AI model upload            (submission wizard)
  Templates
  Backtest
  Playground
  Validation queue
  Data
    › Market data sources        (your provider API keys)
    › Data library               (catalog of historical feeds)
    › Developer docs             (model interface contract)

DISCOVER
  Marketplace                    (algo + AI, filterable by kind)
  Compare
  My subscriptions

TRADE
  Paper trading
  Execution monitor
  Risk center
  Trading accounts               (merged: paper + broker connections)

EARN
  My listings
  Payouts
  Teams
  API status

ACCOUNT
  Wallet
  Billing
  Settings
  Admin                          (admins only)
```

**On nesting the two builders under My work:** yes, that reads better. "My work" is the destination you go back to; "Algo builder" and "AI model upload" are the two ways to create something new. Nesting them makes the parent/child relationship obvious instead of showing three sibling links that look unrelated. They stay clickable links (not just a dropdown) so they remain deep-linkable, and the child group auto-expands when you are on either page.

**Data sources / library / docs under BUILD:** agreed — all three are inputs to building and validating, not trading. They go into a "Data" subgroup so BUILD does not get long.

## 6. Untangling Connected accounts vs Brokers vs Data sources

They are three different things today and the names do not say so:

- **Connected accounts** — where your money and orders live: the built-in $100k paper account plus linked execution accounts (Alpaca, Binance, etc.). Used when you apply a model or deploy a strategy.
- **Brokers** — the IBKR / Futu / Tiger sync integrations that pull balances, positions and orders. Functionally the same idea as above, just a different set of providers.
- **Data sources** — market data provider API keys (prices/candles). Nothing to do with placing orders.

Refinement:

1. Merge **Connected accounts** and **Brokers** into one page, **Trading accounts**, under TRADE, with two tabs: *Accounts* (paper + execution accounts, default account marker) and *Sync* (balance/position/order sync status, last sync, errors). No data is lost — both existing tables keep working, they are just presented in one place.
2. Rename **Data sources** → **Market data sources** and move it under BUILD → Data, since it configures the feeds used by builder, backtests, validation and the playground.
3. Old routes redirect to the new ones so bookmarks keep working.

## 7. Menu search

A search input sits at the top of the sidebar (and a `⌘K` / `Ctrl+K` command palette opens the same list from anywhere). Typing filters across all nav items by label, group name and a few synonyms (e.g. "API key" finds Market data sources, "broker" finds Trading accounts, "publish" finds My listings). Results show the group path, arrow keys navigate, Enter opens. When the sidebar is collapsed to icons, the search icon opens the palette instead.

## 8. What is on the BUILD pages

**My work** (`/dashboard/strategies`, retitled) is the single home for everything you create. A "New" button offers two choices: build an algo strategy, or upload an AI model. Below it, one table with tabs `All / Algo / AI models`, and columns: name, kind, status (Draft, Validating, Verified, Listed, Rejected, Paused), visibility (Private / Unlisted / Public), price if listed, lifetime earnings if listed. Row actions:

- Algo: Edit in builder, Backtest, Duplicate, Playground run, Publish/Manage listing, Share access, Delete
- AI model: Edit listing, New version, Playground run, Validation status, Manage listing, Share access, Delete

**Algo builder** (`/dashboard/strategies/builder`) stays the drag-and-drop canvas with AI assist, algo-only. Adds a Backtest button using the shared protocol form and a Publish button that opens the shared wizard pre-filled from the strategy (validation runs first if it has not passed).

**AI model upload** (`/dashboard/models/new`) stays the six-step wizard, sharing the Interface / Pricing / Backtest steps with algo publishing.



## Technical notes

- Migration: add `listing_kind` (enum `algo` | `ai_model`, default `ai_model`) and `strategy_id` (nullable FK to `strategies`) to `ai_models`; add a partial unique index so one strategy maps to one listing. Add grants/policies consistent with the existing model policies. `strategies.is_public` stops driving the marketplace and is kept only for template sharing; the old `/dashboard/marketplace` becomes a filtered view of the unified catalog.
- `src/lib/contributor.functions.ts` gains a `publishStrategyListing` server function that creates the listing row from a strategy, derives the interface manifest from the strategy graph, and reuses `submitForValidation` unchanged.
- `src/lib/backtest-sim.server.ts` and the execution engine branch on `listing_kind`: algo signals come from the existing bar-by-bar engine in `src/lib/backtest-engine.ts`; model signals stay as today.
- Wizard (`dashboard.models.new.tsx`) and playground get a `kind` parameter; catalog, cards and detail pages get a kind badge and filter.
- `src/components/app-shell.tsx`: replace flat `NAV` with a nested `NAV_GROUPS` tree (group → item → optional children), add the sidebar search input plus a `cmdk` command palette bound to ⌘K/Ctrl+K, and persist group open state in local storage. New group/child labels and search synonyms added to all three locales in `src/lib/i18n.tsx`.
- Merge `dashboard.accounts.tsx` and `dashboard.brokers.tsx` into one tabbed `dashboard.accounts.tsx`; keep `/dashboard/brokers` as a redirect. `/dashboard/data-sources` keeps its route, only the label and placement change.
