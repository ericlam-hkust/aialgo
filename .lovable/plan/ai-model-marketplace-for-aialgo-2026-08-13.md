# AI Model Marketplace for aiAlgo

A new Models section that sits alongside the existing strategy marketplace: a public, SEO-friendly catalog of AI trading models, a contributor upload and earnings flow, a consumer "apply model" flow, real Stripe checkout with Connect Express payouts, and an admin review/revenue panel.

## Scope by area

### 1. Public catalog — `/models`
- Grid/list toggle, search, and filters: asset class (stocks, crypto, forex, futures), strategy type (momentum, mean-reversion, ML-signal, arbitrage), timeframe, risk level, pricing model.
- Model card: name, contributor avatar + handle, short description, verified metrics (Sharpe, max drawdown, win rate, CAGR), pricing badge, star rating, active users.
- Leaderboard tab: sortable table by live performance (30d return, Sharpe, drawdown, subscribers), with sparkline per row.
- Public, server-rendered, own `head()` metadata; sign-in only required to buy or apply.

### 2. Model detail — `/models/$slug`
- Header with name, contributor, rating, active users, and a sticky "Use this model" button.
- Tabs: Overview (markdown description + risk disclosure), Verified Backtest (equity curve, drawdown chart, metric grid, trade stats), Live Since Listing (equity vs benchmark, monthly returns heat strip), Versions (changelog timeline), Reviews (rating breakdown + list, signed-in users can post one review per purchased model).
- Pricing panel: one-time unlock / monthly subscription / per-signal fee options.

### 3. Contributor upload wizard — `/dashboard/models/new`
Five steps with progress bar and draft autosave:
1. Metadata: name, slug, description (markdown), tags, asset class, strategy type, timeframe, risk level, risk disclosure.
2. Package: file upload to storage bucket, or register an HTTPS API endpoint + auth header (stored encrypted with the existing crypto helper).
3. Interface: parameter schema builder (name, type, default, min/max, description) and signal output contract.
4. Pricing: pick model + price, live preview of the 20% platform commission and contributor net.
5. Review and submit.
Then a status tracker: Pending Review → Backtest Validation → Paper Trading → Live, with reviewer notes shown on rejection.

### 4. Contributor dashboard — `/dashboard/models`
- Earnings cards: this month, all-time, pending payout, next payout date.
- Revenue chart by month and per-model analytics table (subscribers, executions, gross, commission, net).
- Model management: edit, publish new version, pause, delist.
- Payout settings: Stripe Connect Express onboarding link, account status, payout history.

### 5. Consumer apply flow
"Use this model" opens a stepper: payment/subscription (embedded Stripe checkout) → configuration (connected broker account, paper vs live, capital allocation, max position size %, daily loss limit, stop-loss %) → activation confirmation. The activated model then appears in My Strategies with a live performance panel and pause/stop controls.

### 6. Payments
- Buyer side: embedded Stripe checkout for one-time unlock, monthly subscription, and per-signal metered billing. Products/prices are created per listing in Stripe test mode.
- Contributor side: Stripe Connect Express onboarding, account-status polling, 80/20 split recorded per transaction, monthly payout batches.
- Wallet/credits page with balance and top-ups, buyer transaction history, seller earnings ledger, and an admin commission view.

### 7. Admin panel — `/dashboard/admin`
Gated by the existing `admin` role. Review queue (approve/reject with notes, moves submission through the status pipeline), commission-rate setting, contributor/user management, and platform revenue analytics.

## Technical notes

- **Database (one migration):** enums for asset class, strategy type, risk level, pricing model, listing status, payout status. Tables: `ai_models`, `model_versions`, `model_metrics` (verified backtest + live series as jsonb), `model_reviews`, `model_purchases`, `model_activations` (config, mode, risk limits), `model_transactions` (gross/commission/net), `contributor_accounts` (Stripe Connect account id + status), `payout_batches`, `platform_settings` (commission rate), `model_submissions` (review queue + notes). Public SELECT to `anon` only for live listings, versions, metrics and reviews; everything else scoped to `auth.uid()` or the `admin` role via `has_role`. GRANTs included per table. Seeded with ~24 realistic models, contributors, metric series, reviews and transactions so every screen is populated on first load.
- **Server functions** in `src/lib/models.functions.ts`, `src/lib/marketplace-payments.functions.ts`, `src/lib/contributor.functions.ts`, `src/lib/admin.functions.ts`; public catalog reads use a publishable-key server client so SSR works without a session.
- **Stripe:** reuse `src/lib/stripe.server.ts` gateway client. New `createModelCheckoutSession` (embedded, `ui_mode: "embedded_page"`, return URL back to the model page), Connect Express account create + onboarding link, transfers on payout. Webhook handling extends `src/routes/api/public/payments/webhook.ts` with `checkout.session.completed`, subscription lifecycle, and `account.updated` for Connect. Tax handling: Stripe handles calculation, collection, filing and remittance for buyers in ~80 countries (+3.5% per transaction) since this is a digital service and the account is Hong Kong based.
- **UI:** reuses existing dark fintech tokens, Recharts, shadcn primitives, `metric-card`, `data-table`, and `empty-state`. Nav gains a "Models" group; roles switch via a contributor/consumer toggle in the app shell.
- Also fixing an existing hydration mismatch on the auth layout spotted in the preview logs.

## Delivery order
1. Migration + seed data.
2. Public catalog and detail pages.
3. Consumer apply flow + Stripe checkout.
4. Contributor wizard, dashboard, Connect onboarding, payouts.
5. Wallet/transactions + admin panel.
