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

```text
Overview

BUILD                        (your own work — both kinds)
  My work            (algo strategies + AI models you own)
  Algo builder       (visual canvas + AI assist)
  Upload AI model    (submission wizard)
  Templates
  Backtest
  Playground
  Validation queue


DISCOVER                     (things others published)
  Marketplace          (algo strategies + AI models, filterable by kind)
  Compare
  My subscriptions     (applied models and subscribed strategies)
  Data library
  Developer docs

TRADE
  Paper trading
  Execution monitor
  Risk center
  Connected accounts
  Brokers
  Data sources

EARN                         (contributor)
  My listings
  Payouts
  Teams
  API status

ACCOUNT
  Wallet
  Billing
  Settings
  Admin          (admins only)
```

Groups are collapsible with uppercase headers; the group containing the current route stays open, state persists across reloads, and the icon-only collapsed sidebar keeps icons plus tooltips.

## 6. What is on the BUILD pages

**My work** (`/dashboard/strategies` today, retitled) is the single home for everything you create. A "New" button offers two choices:

- Build an algo strategy → opens the visual builder
- Upload an AI model → opens the model submission wizard

Below it, one table with a kind column and tabs `All / Algo / AI models`. Each row shows name, kind, status (Draft, Validating, Verified, Listed, Rejected, Paused), visibility (Private / Unlisted / Public), price if listed, and lifetime earnings if listed. Row actions by kind:

- Algo: Edit in builder, Backtest, Duplicate, Playground run, Publish/Manage listing, Share access, Delete
- AI model: Edit listing, New version, Playground run, Validation status, Manage listing, Share access, Delete

**Algo builder** (`/dashboard/strategies/builder`) stays the drag-and-drop canvas with AI assist and stays algo-only — no model upload here. Two additions: a Backtest button that reuses the shared protocol form, and a Publish button that opens the shared wizard pre-filled from the strategy (only enabled once the strategy has passed validation, otherwise it starts validation first).

**Upload AI model** (`/dashboard/models/new`) stays the six-step wizard, unchanged except that it is now reachable from the same New menu and shares the Interface/Pricing/Backtest steps with algo publishing.

So: yes, both paths live under BUILD, they are separate entry points because the authoring surfaces genuinely differ, but they converge into one list, one validation queue, one playground, and one listing/earnings flow.


## Technical notes

- Migration: add `listing_kind` (enum `algo` | `ai_model`, default `ai_model`) and `strategy_id` (nullable FK to `strategies`) to `ai_models`; add a partial unique index so one strategy maps to one listing. Add grants/policies consistent with the existing model policies. `strategies.is_public` stops driving the marketplace and is kept only for template sharing; the old `/dashboard/marketplace` becomes a filtered view of the unified catalog.
- `src/lib/contributor.functions.ts` gains a `publishStrategyListing` server function that creates the listing row from a strategy, derives the interface manifest from the strategy graph, and reuses `submitForValidation` unchanged.
- `src/lib/backtest-sim.server.ts` and the execution engine branch on `listing_kind`: algo signals come from the existing bar-by-bar engine in `src/lib/backtest-engine.ts`; model signals stay as today.
- Wizard (`dashboard.models.new.tsx`) and playground get a `kind` parameter; catalog, cards and detail pages get a kind badge and filter.
- `src/components/app-shell.tsx`: replace flat `NAV` with `NAV_GROUPS`; add group-header keys to all three locales in `src/lib/i18n.tsx`.
