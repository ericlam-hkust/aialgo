# Landing page realignment — free platform, pay only on winning trades

The landing page still sells the old model: three HK$ subscription tiers (Free / HK$299 Pro / HK$799 Elite), the "AlgoForge" name, and no mention of the marketplace or creators. The live pricing page already reflects the current model ($0 browse + paper, $12/mo live execution, performance fee only on profitable closed trades, free forever for creators, 80/20 split). This plan rewrites the landing page to match.

## New page structure

1. **Header** — brand mark, language switcher, links to Marketplace, Pricing, Creators, Sign in, Get started.
2. **Hero** — headline "Free to build. $12 to go live. Fees only when you win." with a sub-line covering both audiences (traders and creators of AI models *and* algo strategies). Primary CTA: Get started free. Secondary: Browse marketplace.
3. **Trust strip** — replace the current stat row with model-relevant proof points: verified backtests, watermark protection, no fee on losing trades, free for creators.
4. **How it works (traders)** — three steps: pick a verified strategy → paper trade free → go live for $12/mo and pay a performance fee only on winning exits.
5. **How it works (creators)** — three steps: build an AI model or algo → pass platform validation → earn 80% of performance fees, never pay a cent.
6. **Pricing block** — replaces the three HK$ tiers with the two real plans (Free $0, Basic $12/mo) plus a short performance-fee explainer card (5–25% of profit above $1, per-strategy cumulative watermark, batched at $10 or weekly). Values pulled from `src/lib/monetization.ts` so copy can never drift from code. Link to `/pricing` for the full calculator.
7. **Trust & transparency** — "Pay only on winning trades" badge, watermark example, link to `/how-we-make-money` and `/models/verification`.
8. **Features grid** — kept, retitled and trimmed to what matters now (builder, AI assist, validated backtests, paper trading, risk controls, marketplace).
9. **FAQ** — rewritten to the new model: what a performance fee is, when it is charged, what happens on losses, whether creators pay, how the watermark works.
10. **Footer** — add the risk/compliance disclaimer already exported from `monetization.ts`.

## Technical notes

- Single file rewrite: `src/routes/index.tsx`. No backend or business-logic change.
- Import `CONSUMER_PLANS`, `BASE_COMMISSION`, `MICRO_PROFIT_THRESHOLD`, `BATCH_RULE_COPY`, `WATERMARK_EXAMPLE`, `CONTRIBUTOR_PROMISE`, `RISK_DISCLOSURE`, `usd` from `@/lib/monetization` instead of hardcoding numbers.
- i18n: the current page uses `t("landing.*")` keys. New/changed keys will be added to `src/lib/i18n.tsx` for EN, 繁體, and 简体; obsolete `landing.plan.pro/elite.*` keys removed.
- Update the route `head()` title/description to the new positioning (currently still "AlgoForge — No-Code Algorithmic Trading").
- Keep existing dark fintech tokens; no new colors.
- Brand naming will follow the rest of the app ("aiAlgo") — say so if you want to keep "AlgoForge".
