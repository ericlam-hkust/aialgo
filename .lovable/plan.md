# Managed broker bridge (beta): aiAlgo hosts OpenD, IBKR gateway and Tiger setup

Today users must run Futu's OpenD daemon or IBKR's Client Portal Gateway themselves and paste a URL into Trading accounts. This plan makes aiAlgo offer a **hosted bridge** instead: the user picks "Let aiAlgo host it", we provision a private per-user bridge, and the account connects with no local software.

## Important constraint to accept up front

The app backend runs in a serverless edge runtime — it cannot itself run OpenD or the IBKR gateway (native binaries, long-lived sessions). A managed bridge needs a **separate container host** (a VPS or container platform you control) running one small container per user. This plan covers the aiAlgo side end to end and defines the exact contract that host must implement; the container host itself is infrastructure you provision, not something the app can create.

Also flag for your decision (business, not code): hosting OpenD means aiAlgo holds each user's Futu login and trade-unlock password, and IBKR requires an interactive daily login. Futu's OpenAPI terms should be reviewed before opening the beta beyond invited users.

## What the user sees

### 1. Hosting choice in the connect form
For Futu, IBKR and Tiger the form gains a two-option selector at the top:
- **aiAlgo hosted (beta)** — no downloads. Fields reduce to what the broker login needs (Futu ID + trade password; IBKR account + a login step; Tiger keys, which need no daemon).
- **Self-hosted** — the current flow with the bridge URL and the numbered guide.

Hosted is default where available; the existing connection guide stays for self-host.

### 2. Provisioning flow
On save with hosted selected, the account row is created in a `provisioning` state and the page shows a live status card: Provisioning → Awaiting broker login → Running → Error, with elapsed time and a retry.

- **Futu**: after the container starts, aiAlgo logs OpenD in with the stored Futu credentials; if Futu sends an SMS/app 2FA challenge, the card prompts for the code and forwards it once.
- **IBKR**: the card shows a **Log in to IBKR** button opening the hosted gateway's login page in a new tab (IBKR requires the user to type their own credentials). A daily re-auth reminder appears when the session ages out, with a notification.
- **Tiger**: no daemon needed — "hosted" just means aiAlgo signs requests server-side; the account goes straight to Running once the RSA key validates.

### 3. Managing a hosted bridge
Each hosted account card gains: region, uptime, last heartbeat, **Restart bridge**, **View logs** (last 100 lines, secrets redacted), and **Switch to self-hosted**. Disconnect keeps the existing active-strategy warning and additionally destroys the container and wipes its credentials.

### 4. Beta gating and cost
Hosted bridges are limited: one per broker per user, invite/entitlement gated (`managed_bridge` entitlement), with a clear beta notice that sessions may restart and that self-hosting remains the most private option.

## Technical notes

- **Migration**: add to `broker_connections` — `hosting_mode` (`self` | `managed`), `bridge_id`, `bridge_status`, `bridge_region`, `bridge_last_heartbeat`, `bridge_last_error`. New `managed_bridges` table (id, user_id, broker, container_ref, internal_url, status, created_at, expires_at) with owner-scoped RLS and the standard GRANT block; internal URL and control token never leave the server.
- **Bridge host contract**: the container host exposes an admin API that aiAlgo calls server-side with a control token —
  `POST /bridges` (broker, region) → `{ bridgeId, url, token }`, `POST /bridges/:id/login`, `POST /bridges/:id/restart`, `GET /bridges/:id/status`, `GET /bridges/:id/logs`, `DELETE /bridges/:id`. Base URL + control token stored as secrets (`BRIDGE_HOST_URL`, `BRIDGE_HOST_TOKEN`).
- **New `src/lib/managed-bridge.server.ts`**: typed client for that contract, plus status normalisation and log redaction. Called only from server functions.
- **New `src/lib/managed-bridge.functions.ts`**: `provisionBridge`, `submitBridgeChallenge`, `bridgeStatus`, `restartBridge`, `bridgeLogs`, `destroyBridge` — all `requireSupabaseAuth`, all verifying the bridge belongs to the caller.
- **`src/lib/trading-accounts.ts`**: add `managedHosting: boolean` + hosted-mode field subset per provider so the form can switch schemas.
- **`src/lib/trading-accounts.functions.ts`**: `connectTradingAccount` branches on `hostingMode`; for managed it encrypts broker login secrets, provisions a bridge, and stores the returned internal URL server-side instead of a user-supplied `opendUrl`/`gatewayUrl`. `removeTradingAccount` destroys the bridge first.
- **`src/lib/brokers.server.ts`**: resolve the effective base URL from the managed bridge when `hosting_mode = 'managed'`, so snapshots, orders and `fetchBrokerBars` work unchanged for both modes.
- **`src/routes/_authenticated/dashboard.accounts.tsx`**: hosting selector, provisioning status card with polling, 2FA/IBKR-login prompts, restart/logs controls.
- **`src/routes/_authenticated/dashboard.execution.tsx`**: status dot reflects bridge health; a stale IBKR session shows "Re-login required" with a link.
- **Health**: a `/api/public/bridge-heartbeat` route the host posts to (HMAC-signed), updating `bridge_last_heartbeat`; a stale bridge flips the account to "Needs attention" and notifies the user.
- **Security**: broker credentials stay AES-GCM encrypted via `crypto.server`, decrypted only at provisioning/login time and never returned to the browser; bridge URLs and control tokens are server-only; logs redacted before display.

## Suggested sequencing

1. Schema + `managed_bridges` + hosting-mode plumbing, with Tiger (no container) as the first hosted broker.
2. Bridge host contract client + provisioning UI + Futu OpenD.
3. IBKR with interactive login and daily re-auth reminders.
