/**
 * Read-only broker linking metadata.
 *
 * aiAlgo never collects a broker password or a trade-permission API key. Each
 * provider is linked either through an official read-only OAuth program, a
 * read-only aggregator (SnapTrade), or not at all — in which case the local
 * agent running on the user's own machine is the only path.
 */

export type AccountProvider = "paper" | "binance" | "coinbase" | "alpaca" | "ibkr" | "futu" | "tiger";

/** How aiAlgo may observe this account. Never includes credential entry. */
export type LinkingMode = "oauth" | "aggregator" | "agent_only";

export type AccountProviderMeta = {
  value: AccountProvider;
  label: string;
  kind: "crypto" | "stocks";
  region: string;
  currency: string;
  /** how the read-only link is established */
  linking: LinkingMode;
  /** short description of the linking path */
  docs: string;
  setup: string;
  docsUrl?: string;
  /** gateway or desktop software the user runs themselves */
  downloadUrl?: string;
  /** steps the user completes on their own machine or with the broker */
  steps: string[];
  /** whether the local agent can source historical bars from this broker for backtests */
  dataCapable: boolean;
  dataNote?: string;
  /** set until the partner / aggregator program terms are verified for this provider */
  unverifiedProgram?: boolean;
};

export const LINKING_MODES: Record<LinkingMode, { label: string; hint: string; tone: string }> = {
  oauth: {
    label: "Read-only OAuth",
    hint: "You authorise aiAlgo at the broker. aiAlgo receives a revocable read token — never your password.",
    tone: "border-primary/60 text-primary",
  },
  aggregator: {
    label: "Read-only via SnapTrade",
    hint: "Linked through the SnapTrade aggregator with a read-only scope. Revoke at any time from your broker or from here.",
    tone: "border-primary/60 text-primary",
  },
  agent_only: {
    label: "Local agent only",
    hint: "No read-only program is available for this broker, so the package you run on your own machine is the only connection. Credentials stay in your local .env.",
    tone: "border-muted-foreground/40 text-muted-foreground",
  },
};

export const ACCOUNT_PROVIDERS: AccountProviderMeta[] = [
  {
    value: "futu",
    label: "Futu / moomoo",
    kind: "stocks",
    region: "Hong Kong",
    currency: "HKD",
    linking: "aggregator",
    unverifiedProgram: true,
    docs: "SnapTrade read-only (supported regions) or local agent",
    setup:
      "In supported regions moomoo can be linked read-only through SnapTrade. Everywhere else, the OpenD daemon runs beside the aiAlgo package on your own machine and aiAlgo only sees what the agent reports.",
    docsUrl: "https://openapi.moomoo.com/moomoo-api-doc/en/",
    downloadUrl: "https://openapi.moomoo.com/moomoo-api-doc/en/opend/opend-cmd.html",
    steps: [
      "Enable OpenAPI access from the Futu / moomoo trading app.",
      "Run OpenD on the same machine or VPS as the aiAlgo package — it only accepts local connections.",
      "Put your Futu ID and trade unlock password in the package's local .env file. They never leave your machine.",
      "Turn on the sync toggle if you also want read-only positions and fills mirrored to this dashboard.",
    ],
    dataCapable: true,
    dataNote: "The agent can pull HK and US candles from your Futu subscription for local backtests.",
  },
  {
    value: "ibkr",
    label: "Interactive Brokers",
    kind: "stocks",
    region: "Global",
    currency: "USD",
    linking: "aggregator",
    unverifiedProgram: true,
    docs: "SnapTrade read-only or local Client Portal Gateway",
    setup:
      "IBKR can be linked read-only through SnapTrade in supported regions. Otherwise the Client Portal Gateway runs next to the aiAlgo package on your own host.",
    docsUrl: "https://www.interactivebrokers.com/campus/ibkr-api-page/web-api-trading/",
    downloadUrl: "https://www.interactivebrokers.com/en/trading/ib-api.php#client-portal-api",
    steps: [
      "Download the Client Portal Gateway and start it on the machine that will run the aiAlgo package.",
      "Open https://localhost:5000 once and log in — the session lives on your machine only.",
      "Point the package at http://localhost:5000/v1/api in its local .env.",
      "IBKR expires the session daily; keep the gateway logged in for uninterrupted execution.",
    ],
    dataCapable: true,
    dataNote: "The agent can source historical bars locally from the Client Portal endpoints.",
  },
  {
    value: "tiger",
    label: "Tiger Brokers",
    kind: "stocks",
    region: "Asia",
    currency: "USD",
    linking: "agent_only",
    docs: "Local agent only",
    setup:
      "Tiger has no read-only partner program aiAlgo can use, so the package on your own machine holds the Open API app key and signs its own requests.",
    docsUrl: "https://quant.itigerup.com/openapi/en/python/quickStart/prepare.html",
    steps: [
      "Apply for Open API access on the Tiger Open Platform and create an application.",
      "Generate a 2048-bit PKCS8 RSA key pair on the machine that will run the package.",
      "Upload the public key to Tiger and keep the private key in the package's local .env.",
      "Never paste the private key into aiAlgo — there is no field for it and there never will be.",
    ],
    dataCapable: true,
    dataNote: "The agent can pull HK, US and A-share klines locally.",
  },
  {
    value: "alpaca",
    label: "Alpaca",
    kind: "stocks",
    region: "US",
    linking: "agent_only",
    currency: "USD",
    docs: "Local agent only",
    setup:
      "Alpaca trading keys carry order permission, so they stay in the package's local .env on your machine and are never transmitted to aiAlgo.",
    docsUrl: "https://docs.alpaca.markets/us/docs/credential-management",
    steps: [
      "Create the key pair in the Alpaca dashboard for the environment you want (paper or live).",
      "Paste the key and secret into the package's local .env on your own host.",
      "Start with the paper endpoint until you are happy with the strategy.",
    ],
    dataCapable: true,
    dataNote: "US equity bars from Alpaca's market data API, fetched by the agent.",
  },
  {
    value: "binance",
    label: "Binance",
    kind: "crypto",
    region: "Global",
    currency: "USDT",
    linking: "agent_only",
    docs: "Local agent only",
    setup: "Create a spot-trading key with withdrawals disabled and keep it in the package's local .env.",
    docsUrl: "https://developers.binance.com/docs/binance-spot-api-docs",
    steps: [
      "Create a system-generated API key under Account → API Management.",
      "Enable spot trading only; leave withdrawals disabled.",
      "Add an IP restriction for the host running the package, then store the key locally.",
    ],
    dataCapable: false,
  },
  {
    value: "coinbase",
    label: "Coinbase Advanced",
    kind: "crypto",
    region: "Global",
    currency: "USD",
    linking: "agent_only",
    docs: "Local agent only",
    setup: "Create an Advanced Trade key with trade permission only and keep the key file on your own machine.",
    docsUrl: "https://docs.cdp.coinbase.com/coinbase-app/docs/auth/api-key-authentication",
    steps: [
      "Create an Advanced Trade API key in the Coinbase Developer Platform portal.",
      "Grant trade permission only — no transfer or withdraw scope.",
      "Keep the downloaded key file on the host running the package.",
    ],
    dataCapable: false,
  },
];

export function providerMeta(value: string): AccountProviderMeta | undefined {
  return ACCOUNT_PROVIDERS.find((p) => p.value === value);
}

export function providerLabel(value: string): string {
  if (value === "paper") return "aiAlgo Paper Account";
  return providerMeta(value)?.label ?? value;
}

export const PAPER_STARTING_BALANCE = 100_000;

export const CREDENTIAL_FREE_NOTICE =
  "aiAlgo no longer stores broker credentials of any kind. Previously stored secrets have been permanently purged. Live orders are generated and sent only by the package running on infrastructure you own.";

export const READ_ONLY_SCOPES = [
  "Account balances and buying power",
  "Open positions",
  "Order and fill history",
];

export type AccountStatusTone = "connected" | "simulated" | "error" | "idle";

export function accountStatus(a: {
  status: string | null;
  mode?: string | null;
  auth_status?: string | null;
  linking_mode?: string | null;
  last_error?: string | null;
  last_synced_at?: string | null;
}): { tone: AccountStatusTone; label: string; detail: string } {
  if (a.status === "error" || a.last_error)
    return { tone: "error", label: "Needs attention", detail: a.last_error ?? "The last read-only sync failed." };
  if (a.mode === "simulation" || a.status === "simulated")
    return { tone: "simulated", label: "Simulated", detail: "Paper account — nothing is routed to a broker." };
  if (a.linking_mode === "agent_only" && !a.last_synced_at)
    return {
      tone: "idle",
      label: "Awaiting agent",
      detail: "No telemetry received yet. Start the package on your machine with sync enabled.",
    };
  if (!a.last_synced_at)
    return { tone: "idle", label: "Not yet synced", detail: "Authorise the read-only link to start receiving data." };
  return { tone: "connected", label: "Linked (read-only)", detail: "Receiving read-only account data." };
}
