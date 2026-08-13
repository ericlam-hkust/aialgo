# Reorganize the left navigation

Today the sidebar is one flat list of 25 links where rule-based strategy tools, AI model marketplace tools, contributor tools and account settings are mixed together. The fix is to group them into collapsible sections with clear headers, so "Algo Strategies" and "AI Models" are visibly separate.

## New structure

```text
Overview

ALGO STRATEGIES              (your own rule-based strategies)
  My strategies
  Builder
  Templates
  Backtest
  Strategy marketplace

AI MODELS                    (marketplace models built by others)
  Browse AI models
  My applied models
  Compare models
  Data library
  Developer docs

TRADING                      (running things live/paper)
  Paper trading
  Execution monitor
  Risk center
  Connected accounts
  Brokers
  Data sources

CONTRIBUTOR                  (only for people publishing models)
  My model repos
  Validation queue
  Playground
  Payouts
  Teams

ACCOUNT
  Wallet
  Billing
  Settings
  Admin        (only shown to admins)
```

## Behaviour

- Each section is a collapsible group with a small uppercase header; the group containing the current route stays open on load.
- Section state persists in local storage so it survives navigation and reloads.
- Collapsed sidebar (icon-only) keeps the icons and hides the headers, with tooltips on hover.
- "Admin" only renders when the signed-in user has the admin role, same check as today.

## Technical notes

- Change is contained to `src/components/app-shell.tsx`: replace the flat `NAV` array with a `NAV_GROUPS` array of `{ key, items[] }` and render nested groups.
- Add new i18n keys for the group headers (`nav.group.strategies`, `nav.group.aiModels`, `nav.group.trading`, `nav.group.contributor`, `nav.group.account`) plus a couple of renamed item labels in all three locales in `src/lib/i18n.tsx`.
- Routes themselves are unchanged; only labels, order and grouping change. `/models/compare` gets a sidebar entry it currently lacks.
