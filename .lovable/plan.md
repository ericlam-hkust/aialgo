# One unified Marketplace under Discover

Today Discover has two entries that both look like a marketplace: "AI Models" (`/models`, the real catalog with listings from contributors) and "Marketplace" (`/dashboard/marketplace`, an older page that only lists shared strategies and clones them into your library for free). That split is confusing and hides algo strategies from buyers.

The fix: make `/models` the single Marketplace for both algo strategies and AI models, with a prominent type filter.

## What changes

### 1. Discover section navigation
- "AI Models" and "Marketplace" collapse into one item: **Marketplace** → `/models`.
- Keep Compare and My subscriptions as-is.
- Labels updated in English, 繁體 and 简体.

### 2. Marketplace page
- New segmented control at the top of the catalog: **All · Algo strategies · AI models**, with a live count on each segment. This is the primary, always-visible filter (the current "Type" dropdown buried among eight other selects is removed).
- The type choice also applies to the Leaderboard tab, so a buyer filtering to Algo sees the algo leaderboard.
- Page heading and copy change from "AI trading models" to "Marketplace — algo strategies and AI models from contributors".
- Each card keeps its Algo / AI badge so the type is obvious in mixed "All" results.
- Search placeholder and empty-state copy updated to cover both types.
- The chosen type is kept in the URL (`?type=algo`) so it can be shared and survives a refresh.

### 3. Old marketplace page
`/dashboard/marketplace` redirects to `/models`, so existing links and bookmarks land on the unified catalog instead of a dead end.

## Technical notes
- `listing_kind` (`algo` | `ai_model`) already exists on listings and is already returned by `listPublicModels`, so no database or server-function change is needed.
- Work is confined to `src/routes/models.index.tsx` (segmented filter, search param, leaderboard filtering, copy), `src/lib/nav.ts` (merge the two Discover items), `src/lib/i18n.tsx` (label updates in three languages), and `src/routes/_authenticated/dashboard.marketplace.tsx` (replaced with a redirect).
- SEO metadata for `/models` updated to describe both listing types.
