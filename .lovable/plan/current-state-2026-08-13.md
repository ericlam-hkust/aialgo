Clean up Wallet and API status for the new commission model

## Current state

- **Wallet** (`/dashboard/wallet`) shows a credit balance, model purchases and transaction history. It was built for the old marketplace model where users bought individual AI models or subscriptions with credits.
- **API status** (`/marketplace/api-status`) is a public uptime/changelog page for the `/v1` API (models, signals, execution, team tokens). It is currently linked under the **Earn** sidebar group.

## New model fit

Under the new "Free platform + commission marketplace" model:

- Traders do **not** buy individual models or maintain a credit wallet. They pay the $12/mo Basic subscription plus a performance fee only on profitable closed trades.
- The Wallet page — with its credit balance, "total spent on models", and "active unlocks" — is now conceptually wrong and confusing.
- The API status page is still useful as a public trust surface for teams, power users and API consumers, but it is not a primary app feature for retail traders. It does not belong in the main sidebar under **Earn**.

## Proposed changes

1. Remove the Wallet page
   - Delete `src/routes/_authenticated/dashboard.wallet.tsx`.
   - Remove the Wallet nav item from `src/lib/nav.ts` under the Account group.
   - Remove the `nav.wallet` translation keys from `src/lib/i18n.tsx` (EN, Traditional Chinese, Simplified Chinese).

2. Move API status out of the main navigation
   - Remove the API status nav item from `src/lib/nav.ts` under the Earn group.
   - Remove the `nav.apiStatus` translation keys from `src/lib/i18n.tsx`.
   - Keep the `/marketplace/api-status` route file and public page.
   - Add an "API status" link to the public marketplace footer (`src/routes/marketplace.tsx`) so it remains discoverable for developers and API users.

3. Let the route tree regenerate
   - TanStack Router will regenerate `src/routeTree.gen.ts` automatically after the route file is removed; do not edit it by hand.

## Out of scope

This plan is UI/navigation cleanup only. The underlying `model_purchases` and `user_wallets` tables, plus the checkout flow in `apply-model-dialog.tsx`, are still referenced by the access-control layer. Replacing that with the new Basic-plan + performance-fee access model is a separate, larger migration and is not included here.