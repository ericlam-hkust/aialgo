# Live Data Pipelines & Broker Sync

Replace the simulated price generator with a real market data layer, let each user pick and connect their own data providers, and sync real account data from brokers.

## 1. Data Sources page (new)

A new "Data Sources" page in the dashboard where the user picks providers from a catalog and connects each one with their own API key:

| Provider | Coverage | Live capability |
|---|---|---|
| Finnhub | US real-time, global fundamentals; HK on paid tier | REST quote + websocket trades |
| Twelve Data | US + HK + global (0700.HK etc.) | REST quote/time-series + websocket |
| Polygon.io | US equities, full depth history | REST + websocket |
| Alpha Vantage | US + global daily/intraday | REST only |
| Tiingo | US equities + IEX real-time | REST + websocket |
| Marketstack | Global EOD + intraday | REST only |
| EODHD | HK + global real-time and EOD | REST + websocket |
| Financial Modeling Prep | US + global quotes | REST |

For each connected provider the user sees: status (validated / invalid key / rate-limited), which markets it can serve, and a priority order. A per-symbol routing rule picks the highest-priority provider that covers that symbol's market, with automatic fallback to the next one on failure.

A platform-level key (stored as a project secret) acts as the default so the app has a working live feed out of the box; a user's own key overrides it and raises their rate limits.

## 2. Live market feed (replaces the simulator)

- `src/store/market-store.ts` stops generating random walks. It subscribes to a real quote stream instead.
- A server function fetches quotes for the watched symbols from the routed provider and returns normalized ticks (price, prev close, change %, volume, timestamp, staleness flag).
- The client polls that function on a short interval (respecting provider rate limits) and, where the provider supports websockets and the user's key allows it, upgrades to a streaming connection through a server-side relay so the key never reaches the browser.
- Market-hours awareness: HKEX and US session calendars drive the poll rate and show "closed / last close" instead of pretending to be live.
- Every tick is written to a new `market_quotes` table (latest quote per symbol) so dashboard, paper trading, and risk all read one consistent price, and so P&L marks are auditable.

## 3. Historical data pipeline

- `market_data_daily` stops being static seed data. A sync job pulls real OHLCV bars from the routed provider, backfilling two years on first sync and appending daily bars after each close.
- Adds intraday bars (`market_data_intraday`, 1m/5m/1h) so backtests and charts can run below daily resolution.
- Sync runs are recorded in a `data_sync_runs` table (provider, symbol, range, rows written, duration, error) and surfaced on the Data Sources page as a run history with manual "sync now" and "backfill" buttons.
- A scheduled trigger runs the daily close sync automatically; the endpoint lives under `/api/public/` and is protected by a signed secret.

## 4. Broker sync (real APIs)

Each broker gets a real adapter plus a credentials form, and the existing simulation mode stays available as a fallback:

- **Interactive Brokers** — Client Portal Web API. The user supplies their gateway URL (self-hosted Client Portal Gateway) or OAuth credentials; we pull accounts, balances, positions, orders and trades.
- **Tiger Brokers** — Open API (tiger ID + RSA private key + account). Fully cloud-callable; pulls assets, positions, and order history.
- **Futu / moomoo** — OpenD gateway. Futu's API only accepts connections from a locally running OpenD instance, so the app connects to a user-supplied OpenD host/port over its HTTP bridge. If the user has no reachable OpenD, the page tells them exactly that instead of silently failing.

Shared pipeline for all three: credentials encrypted at rest, a `syncBroker` server function that normalizes each broker's response into common account / position / order shapes, writes them into `broker_connections`, live `broker_positions` and `broker_orders` tables, timestamps `last_synced_at`, and records failures as sync runs. The brokers page gets per-connection "sync now", auto-sync interval, and a connection health indicator.

## 5. Wiring the rest of the app

- Dashboard, paper trading, risk centre and the market status bar read live quotes and real broker balances instead of the simulator.
- Paper trading marks positions against live prices and evaluates stops/targets on each tick.
- Risk events fire from real marks.
- Backtests use the real historical bars pulled by the pipeline.

## Technical notes

- Provider keys and broker credentials live in a `data_source_connections` table, encrypted with a server-side key (never returned to the browser; only a masked suffix and status).
- All provider and broker calls happen in `createServerFn` handlers; no key or credential ever reaches client code.
- New tables: `data_source_connections`, `market_quotes`, `market_data_intraday`, `data_sync_runs`, `broker_positions`, `broker_orders` — each with RLS scoped to the owning user and explicit grants.
- Provider adapters live behind one `QuoteProvider` interface (`getQuote`, `getBars`, `supportsSymbol`, `streamQuotes?`) so adding a provider is one file.

## What I need from you

The live feed needs at least one real key to actually stream. After you approve, I'll ask for a key for whichever providers you want enabled at the platform level (Finnhub and Twelve Data are the fastest to get and together cover US + HK), and for broker credentials only when you connect a broker.
