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
  /** official API documentation */
  docsUrl?: string;
  /** page where the user creates keys / apps */
  keysUrl?: string;
  /** gateway or desktop software download, when the broker needs one */
  downloadUrl?: string;
  /** numbered steps to complete on the broker side before filling the form */
  steps: string[];
  /** shown when the venue cannot restrict withdrawals on the key */
  permissionNote?: string;
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
    docsUrl: "https://openapi.moomoo.com/moomoo-api-doc/en/",
    keysUrl: "https://openapi.moomoo.com/moomoo-api-doc/en/qa/order.html",
    downloadUrl: "https://openapi.moomoo.com/moomoo-api-doc/en/opend/opend-cmd.html",
    steps: [
      "Open a Futu or moomoo account and enable OpenAPI access from the trading app.",
      "Download OpenD and run it on a machine or VPS that stays online — Futu's API only accepts local connections.",
      "Log in to OpenD with your Futu ID and trade password so the session is authenticated.",
      "Expose the OpenD HTTP bridge (default port 11111) over a URL aiAlgo can reach, ideally HTTPS behind your own firewall.",
      "Paste the bridge URL and your Futu account number below; add the trade unlock password only if you want aiAlgo to place orders.",
    ],
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
        help: "The address of the OpenD daemon you run — not a Futu-hosted URL.",
      },
      {
        id: "accountId",
        label: "Account number",
        secret: false,
        kind: "text",
        placeholder: "e.g. 283xxxxx",
        help: "Shown under Accounts in the Futu / moomoo app.",
      },
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
    docsUrl: "https://www.interactivebrokers.com/campus/ibkr-api-page/web-api-trading/",
    keysUrl: "https://www.interactivebrokers.com/en/trading/ib-api.php",
    downloadUrl: "https://www.interactivebrokers.com/en/trading/ib-api.php#client-portal-api",
    steps: [
      "Make sure your IBKR account has the market-data subscriptions you plan to trade and backtest.",
      "Download the Client Portal Gateway from IBKR and start it on a machine that stays online.",
      "Open https://localhost:5000 in a browser and log in once — the gateway holds the authenticated session.",
      "Keep the session alive (IBKR times out daily) and expose the gateway over HTTPS on a URL aiAlgo can reach.",
      "Paste the base URL ending in /v1/api plus your U-number account ID below.",
    ],
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
        help: "Must end with /v1/api and point at your own running gateway.",
      },
      {
        id: "accountId",
        label: "Account ID",
        secret: false,
        kind: "text",
        placeholder: "U1234567",
        help: "Your IBKR account number, starting with U or DU for paper.",
      },
      {
        id: "apiKey",
        label: "Session token (optional)",
        secret: true,
        kind: "password",
        help: "Only if you put your own auth proxy in front of the gateway.",
      },
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
    docsUrl: "https://quant.itigerup.com/openapi/en/python/quickStart/prepare.html",
    keysUrl: "https://www.itigerup.com/openapi",
    steps: [
      "Log in to the Tiger Open Platform with your Tiger brokerage account and apply for Open API access.",
      "Create an application in the developer console — this gives you your Tiger ID.",
      "Generate an RSA key pair in PKCS8 format (2048-bit) on your own machine.",
      "Upload the public key to your Tiger app and keep the private key private.",
      "Copy your Tiger ID and account number from the console and paste them with the private key below.",
    ],
    tradable: true,
    dataCapable: true,
    dataNote: "Daily and intraday klines for HK, US and A-shares.",
    fields: [
      {
        id: "tigerId",
        label: "Tiger ID",
        secret: false,
        kind: "text",
        required: true,
        help: "Shown on your app page in the Tiger Open Platform console.",
      },
      {
        id: "accountId",
        label: "Account number",
        secret: false,
        kind: "text",
        required: true,
        help: "Your standard or paper trading account number from Tiger.",
      },
      {
        id: "privateKey",
        label: "RSA private key (PKCS8)",
        secret: true,
        kind: "textarea",
        required: true,
        help: "The private half of the key pair whose public key you uploaded to Tiger. Encrypted before it is stored and only decrypted inside a signed request.",
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
    docsUrl: "https://docs.alpaca.markets/us/docs/credential-management",
    keysUrl: "https://app.alpaca.markets/",
    steps: [
      "Create an Alpaca account and sign in to the dashboard.",
      "Choose the environment first — paper or live — because keys are issued per environment.",
      "Generate an API key pair under API Keys and copy the secret immediately; it is shown only once.",
      "Paste the key and secret below, and set the base URL to https://paper-api.alpaca.markets while testing.",
    ],
    tradable: true,
    dataCapable: true,
    dataNote: "US equity bars from the Alpaca market data API.",
    fields: [
      { ...API_KEY, help: "Starts with PK for paper keys and AK for live keys." },
      { ...API_SECRET, required: true, help: "Shown only once when the key is generated." },
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
    docsUrl: "https://developers.binance.com/docs/binance-spot-api-docs",
    keysUrl: "https://www.binance.com/en/support/faq/detail/360002502072",
    steps: [
      "Complete identity verification on Binance — API keys require a verified account.",
      "Go to Account → API Management and create a system-generated API key.",
      "Enable spot trading only and leave withdrawals disabled.",
      "Add an IP restriction if you can, then copy the key and secret before closing the page.",
    ],
    tradable: false,
    dataCapable: false,
    fields: [
      { ...API_KEY, help: "From Binance API Management." },
      { ...API_SECRET, required: true, help: "Displayed once at creation — regenerate the key if you lose it." },
    ],
  },
  {
    value: "coinbase",
    label: "Coinbase Advanced",
    kind: "crypto",
    region: "Global",
    currency: "USD",
    docs: "Advanced Trade API keys",
    setup: "Create an Advanced Trade API key with trade permission only.",
    docsUrl: "https://docs.cdp.coinbase.com/coinbase-app/docs/auth/api-key-authentication",
    keysUrl: "https://portal.cdp.coinbase.com/access/api",
    steps: [
      "Sign in to the Coinbase Developer Platform portal with the account that holds your funds.",
      "Create an API key for Advanced Trade and grant trade permission only — no transfer or withdraw scope.",
      "Download the generated key file; the private key cannot be retrieved later.",
      "Paste the key name and the private key from that file below.",
    ],
    tradable: false,
    dataCapable: false,
    fields: [
      { ...API_KEY, label: "API key name", help: "The organizations/.../apiKeys/... value from the key file." },
      { ...API_SECRET, required: true, help: "The private key from the downloaded key file." },
    ],
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
