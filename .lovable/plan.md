# Combine Base Models + Templates into one "Foundations" page

Today builders have two separate starting-point libraries:

- Strategy templates (`/dashboard/strategies/templates`) — clonable algo structures
- Base models (`/marketplace/base-models`) — pretrained AI foundations to fine-tune

Both answer the same question: "what can I start from?" They become one page.

## Name

**Foundations** — subtitle: "Start from a proven algo template or a pretrained AI base model."

Alternatives if you prefer: "Starting Points", "Blueprints", "Build From".

## New page

Route: `/dashboard/foundations` (in the BUILD nav group, replacing both current entries).

Layout:
- One header + intro line, one search box, and a filter row with `All / Algo templates / AI base models`, plus the existing category filter for templates.
- A single responsive card grid mixing both kinds, each card carrying a kind badge:
  - Template card: name, description, category, risk level, market condition, primary action "Use this template" (clones into the builder, unchanged logic).
  - Base model card: name + version, tagline, architecture, instruments/timeframes, baseline metrics, primary action "Fine-tune this model", secondary "Details".
- Keep the "base models aren't directly subscribable" note and the "Fine-tuning guide" link in the base-model context.

## Routing and navigation

- `/dashboard/strategies/templates` → redirect to `/dashboard/foundations`.
- `/marketplace/base-models` (index) → redirect to `/dashboard/foundations`; the detail page `/marketplace/base-models/$id` stays as-is so existing links and the fine-tune wizard keep working.
- Nav: remove the `Templates` item and the `Base models` child under My work; add one `Foundations` item in BUILD. Update the search terms to cover both (templates, presets, pretrained, fine-tune, foundation).

## Technical notes

- New file `src/routes/_authenticated/dashboard.foundations.tsx` reusing the existing data calls: the `strategies` query with `is_template = true` and `listBaseModels()` from `src/lib/base-models.functions`.
- Cloning and fine-tune navigation logic is lifted from the current pages without behavioural change.
- i18n: replace `nav.templates` / `nav.baseModels` with `nav.foundations` in all three dictionaries (EN, zh-Hant, zh-Hans).
- Add a `head()` with a unique title/description for the new route.
