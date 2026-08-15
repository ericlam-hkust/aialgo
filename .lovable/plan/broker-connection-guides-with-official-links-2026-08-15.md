# Broker connection guides with official links

Every broker in Trading Accounts currently shows one short setup sentence and a plain text label ("OpenD gateway", "Open API app") with no link. Users have no path from the form to the broker's own signup/API pages.

## What changes

Each provider gets a proper connection guide, shown in the connect dialog and on the account cards:

- A **step-by-step checklist** (3-6 numbered steps) of exactly what to do on the broker side before filling the form.
- **Official links**: API docs, the page where keys/apps are created, and (where relevant) the gateway download.
- **Per-field help text** so each input says where that value comes from.
- Existing safety checklist (trade-only permissions, no withdrawals) stays, plus a note when the broker cannot restrict withdrawals.
- Links open in a new tab with an external-link icon.

## Guides per broker (researched from official sources)

**Futu / moomoo** — docs `openapi.moomoo.com/moomoo-api-doc/en/`; OpenD overview and command-line pages. Steps: open a Futu/moomoo account and enable OpenAPI, download and run OpenD on your own machine/VPS, log in with your Futu ID, expose the HTTP bridge port (default 11111), unlock trading with your trade password, paste bridge URL + account number.

**Interactive Brokers** — docs `interactivebrokers.com/campus/ibkr-api-page/web-api-trading/`. Steps: IBKR account with market-data subscriptions, download the Client Portal Gateway, run it and authenticate in the browser at `localhost:5000`, keep the session alive, expose over HTTPS, paste base URL `.../v1/api` and account ID (U-number).

**Tiger Brokers** — developer portal `quant.itigerup.com/openapi/en/python/quickStart/prepare.html` and `docs-en.itigerup.com/docs/prepare`. Steps: log in to the Tiger Open Platform, create an app, generate an RSA key pair (PKCS8), upload the public key to Tiger, keep the private key, copy Tiger ID and account number, paste all three.

**Alpaca** — `docs.alpaca.markets/us/docs/credential-management`. Steps: create account, choose paper vs live, generate key/secret in the dashboard, copy the secret once, use `https://paper-api.alpaca.markets` while testing.

**Binance** — `binance.com/en/support/faq/detail/360002502072`. Steps: complete identity verification, create a system-generated API key, enable spot trading only, disable withdrawals, optionally add IP restriction, copy key and secret.

**Coinbase Advanced** — `docs.cdp.coinbase.com/coinbase-app/docs/auth/api-key-authentication`. Steps: create an API key in the Coinbase developer portal, grant trade permission only, no transfer/withdraw scope, download the key file, paste key name and private key.

**aiAlgo Paper account** — no external setup; the guide just explains the simulated balance.

## Technical notes

- Extend `AccountProviderMeta` in `src/lib/trading-accounts.ts` with `docsUrl`, `keysUrl`, optional `downloadUrl`, and `steps: string[]`; keep the existing `setup` line as the summary.
- Add per-field `help` where missing.
- New presentational component `src/components/accounts/connection-guide.tsx` rendering the numbered steps and link row.
- Render it in the connect/edit dialog in `src/routes/_authenticated/dashboard.accounts.tsx`, and add a "Setup guide" link on each account card and in the Trading Desk account selector's "Add trading account" area.
- No database, server function, or credential-handling changes.
