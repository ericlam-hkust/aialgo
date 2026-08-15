# Live Order Book & Manual Trading on the Execution page

Rebuild `/dashboard/execution` (Trade section) into a real trading desk: a live order book tied to your connected broker accounts, a manual order ticket that places real broker orders, and a unified blotter where every trade shows whether a human placed it or which strategy (Algo or AI) produced it.

## What you get

**1. Account bar**
- Pick which connected account the desk is trading (default account preselected).
- Shows balance, buying power, currency, connection status, and last sync, with a Sync now button.
- If the selected account is in simulation mode, the desk clearly says orders are simulated, not routed.

**2. Live order book**
- Live working/open orders for the selected account, refreshed on a poll and after every action, with status, filled vs total quantity, limit and average fill price, and time.
- Cancel button per working order (routed to the broker).
- Live positions table for the same account with market price, market value and unrealised P&L, marked against the live quote feed.

**3. Manual order ticket**
- Symbol, side (buy/sell), quantity, order type (market/limit), limit price, optional stop-loss / take-profit.
- Live last price and estimated notional; buying-power check before submit.
- Optional "Link to strategy" selector: none (pure manual), one of your Algo strategies, or one of your active AI model activations. Linking only tags the order for attribution and reporting — it does not hand control to the strategy.
- Confirmation step showing broker, account, symbol, side, quantity, estimated cost and attribution before the order is sent.

**4. Attribution everywhere**
- Every order and fill carries a clear source badge:
  - `Manual` — human executed (shows the account it was placed from)
  - `Algo — <strategy name>`
  - `AI — <model name>`
  - `Broker` — pre-existing orders synced from the broker that aiAlgo did not place
- The blotter merges strategy-generated orders and manually placed orders into one chronological list with filters by source, account and symbol, plus a CSV export.

**5. Strategy monitoring stays**
- The existing signals / activations / risk-engine views stay on the page as their own section, so nothing you rely on today is lost.

## Real broker routing

Orders are sent to the broker over its API using the credentials already stored on the connected account:
- **Interactive Brokers** — Client Portal Gateway REST (place, cancel, order status).
- **Tiger** — signed OpenAPI gateway calls (place order, cancel order, order list).
- **Futu** — OpenD REST endpoints (place, cancel, order list).
- **Alpaca** — trading REST API.
- Accounts in simulation mode, and the aiAlgo paper account, are filled locally against the live quote feed instead — clearly labelled.

Safety rails before anything is sent: account must be `connected`, credentials must decrypt, plan entitlement `brokerConnections` must be present, existing risk limits (max position size, daily loss limit) are checked, and every submission requires explicit confirmation. Broker rejections are surfaced verbatim in the UI and stored on the order.

## Technical notes

Database migration:
- `broker_orders`: add `source` (`manual` | `algo` | `ai_model` | `broker`), `strategy_id`, `model_id`, `activation_id`, `placed_by_user_id`, `client_order_id`, `time_in_force`, `reject_reason`. Existing rows default to `broker`.
- `execution_orders`: add nullable `broker_order_id` link so strategy-generated orders that route to a real broker reconcile with the order book.
- Grants + RLS follow the existing owner-scoped pattern on these tables.

Server layer:
- `src/lib/brokers.server.ts` gains `placeBrokerOrder`, `cancelBrokerOrder`, and `fetchOpenOrders` per broker adapter, alongside the existing snapshot readers.
- New `src/lib/trading-desk.functions.ts` with `getDeskState`, `placeManualOrder` (Zod-validated, `requireSupabaseAuth`, entitlement + risk checks, writes the attributed `broker_orders` row), `cancelOrder`, and `refreshOrderBook`.
- `src/lib/execution.server.ts` tags strategy-generated orders with their `source`, `activation_id` and `model_id` so the blotter attribution is consistent.

UI:
- `src/routes/_authenticated/dashboard.execution.tsx` rebuilt with an account bar, order ticket, order book, positions, blotter and the retained strategy monitor.
- New components under `src/components/trade/`: `order-ticket.tsx`, `order-book.tsx`, `trade-blotter.tsx`, `source-badge.tsx`.
- Nav label for `/dashboard/execution` becomes "Trading Desk" (EN / 繁中 / 简中), route path unchanged.
