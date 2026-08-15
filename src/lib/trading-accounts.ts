export type AccountProvider = "paper" | "binance" | "coinbase" | "alpaca" | "ibkr" | "futu" | "tiger";

export type AccountFieldId =
  | "apiKey"
  | "apiSecret"
  | "accountId"
  | "gatewayUrl"
  | "opendUrl"
  | "tigerId"
  | "privateKey"
  | "unlockPassword";

export type AccountField = {
  id: AccountFieldId;
  label: string;
  /** secret fields are encrypted and never returned to the browser */
  secret: boolean;
  kind: "text" | "password" | "textarea";
  placeholder?: string;
  required?: boolean;
  help?: string;
};

export type AccountProviderMeta = {
  value: AccountProvider;
  label: string;
  kind: "crypto" | "stocks";
  region: string;
  currency: string;
  docs: string;
  setup: string;
  /** can route real orders through brokers.server */
  tradable: boolean;
  /** can serve historical bars for backtesting */
  dataCapable: boolean;
  dataNote?: string;
  fields: AccountField[];
};

const API_KEY: AccountField = {
  id: "apiKey",
  label: "API key",
  secret: true,
  kind: "password",
  required: true,
};
const API_SECRET: AccountField = { id: "apiSecret", label: "API secret", secret: true, kind: "password" };

export const ACCOUNT_PROVIDERS: AccountProviderMeta[] = [
  {
    value: "futu",
    label: "Futu / moomoo",
    kind: "stocks",
    region: "Hong Kong",
    currency: "HKD",
    docs: "OpenD gateway",
    setup:
      "Futu's API only accepts local connections, so run the OpenD daemon on your own machine or server and expose its HTTP bridge. Paste that address below.",
    tradable: true,
    dataCapable: true,
    dataNote: "HK and US candles straight from your Futu subscription.",
    fields: [
      {
        id: "opendUrl",
        label: "OpenD bridge URL",
        secret: false,
        kind: "text",
        required: true,
        placeholder: "https://your-host:11111",
      },
      { id: "accountId", label: "Account number", secret: false, kind: "text", placeholder: "e.g. 283xxxxx" },
      {
        id: "unlockPassword",
        label: "Trade unlock password",
        secret: true,
        kind: "password",
        help: "Needed only if you want aiAlgo to place orders. Stored encrypted.",
      },
    ],
  },
  {
    value: "ibkr",
    label: "Interactive Brokers",
    kind: "stocks",
    region: "Global",
    currency: "USD",
    docs: "Client Portal gateway",
    setup:
      "Run the IBKR Client Portal Gateway, log in once, and expose it over HTTPS. Paste the base URL (for example https://your-host:5000/v1/api).",
    tradable: true,
    dataCapable: true,
    dataNote: "Historical bars via the Client Portal market-data endpoints.",
    fields: [
      {
        id: "gatewayUrl",
        label: "Client Portal base URL",
        secret: false,
        kind: "text",
        required: true,
        placeholder: "https://your-host:5000/v1/api",
      },
      { id: "accountId", label: "Account ID", secret: false, kind: "text", placeholder: "U1234567" },
      { id: "apiKey", label: "Session token (optional)", secret: true, kind: "password" },
    ],
  },
  {
    value: "tiger",
    label: "Tiger Brokers",
    kind: "stocks",
    region: "Asia",
    currency: "USD",
    docs: "Open API app",
    setup:
      "Create an Open API app in Tiger's developer console, then paste your Tiger ID, account number and the RSA private key used to sign requests.",
    tradable: true,
    dataCapable: true,
    dataNote: "Daily and intraday klines for HK, US and A-shares.",
    fields: [
      { id: "tigerId", label: "Tiger ID", secret: false, kind: "text", required: true },
      { id: "accountId", label: "Account number", secret: false, kind: "text", required: true },
      {
        id: "privateKey",
        label: "RSA private key (PKCS8)",
        secret: true,
        kind: "textarea",
        required: true,
        help: "Encrypted before it is stored and only decrypted inside a signed request.",
      },
    ],
  },
  {
    value: "alpaca",
    label: "Alpaca",
    kind: "stocks",
    region: "US",
    currency: "USD",
    docs: "Live or paper trading keys",
    setup: "Generate trading API keys in the Alpaca dashboard. Use the paper endpoint while testing.",
    tradable: true,
    dataCapable: true,
    dataNote: "US equity bars from the Alpaca market data API.",
    fields: [
      API_KEY,
      { ...API_SECRET, required: true },
      {
        id: "gatewayUrl",
        label: "API base URL",
        secret: false,
        kind: "text",
        placeholder: "https://paper-api.alpaca.markets",
        help: "Leave blank for live trading.",
      },
    ],
  },
  {
    value: "binance",
    label: "Binance",
    kind: "crypto",
    region: "Global",
    currency: "USDT",
    docs: "Spot & margin trading keys",
    setup: "Create an API key with spot trading enabled and withdrawals disabled.",
    tradable: false,
    dataCapable: false,
    fields: [API_KEY, { ...API_SECRET, required: true }],
  },
  {
    value: "coinbase",
    label: "Coinbase Advanced",
    kind: "crypto",
    region: "Global",
    currency: "USD",
    docs: "Advanced Trade API keys",
    setup: "Create an Advanced Trade API key with trade permission only.",
    tradable: false,
    dataCapable: false,
    fields: [API_KEY, { ...API_SECRET, required: true }],
  },
];

export function providerMeta(value: string): AccountProviderMeta | undefined {
  return ACCOUNT_PROVIDERS.find((p) => p.value === value);
}

export const PERMISSION_CHECKLIST = [
  "Enable spot / equities trading",
  "Enable read-only account and balance access",
  "Never enable withdrawals or transfers",
  "Restrict the key to aiAlgo IPs where your venue supports it",
];

export const PAPER_STARTING_BALANCE = 100_000;

export function providerLabel(value: string): string {
  if (value === "paper") return "aiAlgo Paper Account";
  return providerMeta(value)?.label ?? value;
}

export type AccountStatusTone = "connected" | "simulated" | "error" | "idle";

export function accountStatus(a: {
  status: string | null;
  mode: string | null;
  last_error?: string | null;
  last_synced_at?: string | null;
}): { tone: AccountStatusTone; label: string; detail: string } {
  if (a.status === "error" || a.last_error)
    return { tone: "error", label: "Needs attention", detail: a.last_error ?? "Last connection attempt failed." };
  if (a.mode === "simulation" || a.status === "simulated")
    return { tone: "simulated", label: "Simulated", detail: "Paper account — no real orders are routed." };
  if (!a.last_synced_at)
    return { tone: "idle", label: "Never synced", detail: "Run a connection test to verify the credentials." };
  return { tone: "connected", label: "Connected", detail: "Actively linked to the broker." };
}
