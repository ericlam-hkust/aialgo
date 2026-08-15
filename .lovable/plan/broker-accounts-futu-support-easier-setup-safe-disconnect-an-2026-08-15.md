# Broker accounts: Futu support, easier setup, safe disconnect, and broker market data

Today there are two disconnected places to link a broker: **Trading accounts** (paper + exchange API keys — Binance, Coinbase, Alpaca, IBKR) and a separate **Broker sync** panel (IBKR, Tiger, Futu). Futu is missing from the account connect form, the Trading Desk has no way to add an account, and disconnecting is a plain delete with no warning.

## What changes

### 1. Futu (and Tiger) as first-class trading accounts
- Add **Futu / moomoo** and **Tiger Brokers** to the account provider list, alongside Binance, Coinbase, Alpaca and IBKR.
- The connect form becomes provider-aware: each broker asks only for the fields it actually needs.
  - Futu: OpenD bridge URL, account number, unlock password.
  - Tiger: Tiger ID, account number, RSA private key.
  - IBKR: Client Portal gateway URL, account number.
  - Alpaca / Binance / Coinbase: API key + secret (Alpaca adds a live/paper toggle).
- Short inline setup help per broker (what to install, where to get the key), plus the existing trade-only permission checklist.

### 2. Add-account link on the Trading Desk
- The desk account selector gets an **"Add trading account"** entry and, when no account exists, an empty state with a direct link to Trading accounts.
- Selector rows show a live status dot so it's clear which account is actually reachable.

### 3. One clear list of linked accounts, with live status
- Trading accounts shows every linked account (paper, exchange, broker) in one list with a status badge: **Connected**, **Simulated**, **Needs attention** (last error shown), **Never synced**.
- Each row shows last sync time, balance, default flag, plus **Test connection**, **Sync now**, **Set default**, **Disconnect**.
- The separate Broker sync tab stops duplicating the connect form; brokers are set up in the same place as everything else.

### 4. Safe disconnect with an active-strategy warning
- Disconnect opens a confirmation dialog instead of deleting immediately.
- Before showing it, the app checks that account for **running strategy activations and working orders**. If any exist, the dialog lists them by name (Algo / AI) and warns in plain language that disconnecting stops order routing, leaves open positions unmanaged, and pauses those strategies.
- Requires typing the account nickname to confirm when active strategies are attached. On confirm, attached activations are paused and the credentials are deleted.

### 5. Broker accounts as a backtest/market data source
- The Data sources page gains a **From your brokers** section listing linked brokers that can serve history (IBKR, Futu, Tiger, Alpaca).
- Enabling one adds it to the same priority/fallback chain used by API-key providers, so backtests and history sync can pull bars from your broker feed — no extra key needed, it reuses the already-encrypted broker credentials.
- Each entry shows coverage (markets, intraday availability) and a Test button that fetches a sample bar.

### 6. Credential security
- All secrets stay AES-GCM encrypted before they reach the database (existing `crypto.server` path), decrypted only inside server functions at call time.
- Secrets are never returned to the browser — the UI only ever sees a masked suffix and a status.
- Inputs use password fields, are cleared after save, and the connect form warns against keys with withdrawal permission.
- Row-level security continues to scope every account to its owner.

## Technical notes

- `src/lib/trading-accounts.ts`: extend `ACCOUNT_PROVIDERS` with `futu`/`tiger` plus a per-provider field schema driving the form.
- `src/lib/trading-accounts.functions.ts`: `connectTradingAccount` accepts a `config` object (gatewayUrl / opendUrl / tigerId / accountId) and encrypts the credential blob per provider; `testTradingAccount` calls the real adapter in `brokers.server.ts` for tradable brokers instead of only checking that a credential exists.
- New `getAccountDependencies` + `disconnectTradingAccount` server fns: return active `model_activations` and working `broker_orders` for the account; disconnect pauses activations then deletes the connection.
- `src/routes/_authenticated/dashboard.accounts.tsx`: provider-aware form, unified status list, disconnect dialog.
- `src/routes/_authenticated/dashboard.execution.tsx`: add-account link/empty state in the account picker.
- Broker data source: add a `broker:<id>` link type to `ChainLink` in `data-routing.server.ts`, with bar/quote fetchers in `brokers.server.ts` (`fetchBrokerBars`), surfaced on the Data sources page. Stored as a `data_source_connections` row referencing the broker connection — needs a small migration to allow the broker provider values.
