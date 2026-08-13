# One unified Marketplace under Discover

Today Discover has two entries that both look like a marketplace: "AI Models" (`/models`, the real catalog with listings from contributors) and "Marketplace" (`/dashboard/marketplace`, an older page that only lists shared strategies and clones them into your library for free). That split is confusing and hides algo strategies from buyers.

The fix: one Marketplace at `/marketplace` covering both algo strategies and AI models, with a prominent type filter. No redirect shims — the old pages are renamed and removed properly.

## What changes

### 1. Discover section navigation
- "AI Models" and "Marketplace" collapse into one item: **Marketplace** → `/marketplace`.
- Keep Compare and My subscriptions, now pointing at the renamed paths.
- Labels updated in English, 繁體 and 简体.

### 2. Marketplace page
- New segmented control at the top of the catalog: **All · Algo strategies · AI models**, with a live count on each segment. This is the primary, always-visible filter (the current "Type" dropdown buried among eight other selects is removed).
- The type choice also applies to the Leaderboard tab, so a buyer filtering to Algo sees the algo leaderboard.
- Page heading and copy change from "AI trading models" to "Marketplace — algo strategies and AI models from contributors".
- Each card keeps its Algo / AI badge so the type is obvious in mixed "All" results.
- Search placeholder and empty-state copy updated to cover both types.
- The chosen type is kept in the URL (`?type=algo`) so it can be shared and survives a refresh.

### 3. Clean rename, old page removed
- The public catalog section moves from `/models/*` to `/marketplace/*`: catalog, listing detail, compare, verification, data library, developer docs, API status.
- The legacy `/dashboard/marketplace` page (free strategy cloning) is deleted outright — its purpose is fully covered by the unified marketplace.
- Every internal link, nav entry, breadcrumb and copy reference is updated to the new paths; no orphan links remain.

## Technical notes
- `listing_kind` (`algo` | `ai_model`) already exists on listings and is already returned by `listPublicModels`, so no database or server-function change is needed.
- Route files rename `src/routes/models.*.tsx` → `src/routes/marketplace.*.tsx` with matching `createFileRoute("/marketplace/...")` strings; `src/routeTree.gen.ts` regenerates automatically.
- `src/routes/_authenticated/dashboard.marketplace.tsx` is deleted.
- Link updates span `src/lib/nav.ts`, `src/lib/i18n.tsx`, `src/routes/index.tsx`, `src/routes/creators.tsx`, `src/components/marketplace/*`, and the dashboard model/contributor pages that link into the catalog.
- The public API route `src/routes/api/public/v1/models.ts` keeps its path (external contract) — only site pages are renamed.
- SEO metadata for the catalog and detail pages updated to describe both listing types.

