# Split Resource Library into two distinct sections

Today the page has one shared search box, one All/Algo/AI tab row, and a single mixed card grid. It becomes two clearly separated sections, each self-contained.

## Layout

Page header + intro stay as-is, but the "Fine-tuning guide" button moves out of the header.

### Section 1 — Algo Templates
- Section heading + one-line description ("Clone a proven algo structure into the builder.") and a count of templates.
- Its own search box (matches name, description, category).
- Its own category filter row (All + each template category).
- Card grid of template cards, unchanged card content and "Use this template" clone behaviour.
- Empty state scoped to this section.

### Section 2 — AI Base Models
- Visual divider between sections.
- Section heading + description, plus the "Fine-tuning guide" link button sitting in this section's header.
- Keeps the note that base models aren't directly subscribable.
- Its own search box (matches name, tagline, architecture, instruments).
- Its own filter row by architecture (All + each distinct architecture value from the loaded base models).
- Card grid of base model cards, unchanged content and "Use this base" action.
- Empty state scoped to this section.

## Removed

- The global All / Algo templates / AI base models tab row and the single shared search input, since each section now filters itself.

## Technical notes

- Single file change: `src/routes/_authenticated/dashboard.resource-library.tsx`.
- Replace the `kind` state with two independent search states and two filter states; keep both existing queries, the clone mutation, and the `Metric` helper unchanged.
- Extract the two card bodies into local `TemplateCard` / `BaseModelCard` components in the same file to keep the route readable.
- No data, routing, nav, or i18n changes.
