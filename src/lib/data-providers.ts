export type ProviderId =
  | "finnhub"
  | "twelvedata"
  | "polygon"
  | "alphavantage"
  | "tiingo"
  | "marketstack"
  | "eodhd"
  | "fmp";

export type MarketCoverage = "US" | "HK" | "Global";

export type ProviderMeta = {
  id: ProviderId;
  name: string;
  markets: MarketCoverage[];
  realtime: string;
  websocket: boolean;
  history: string;
  keyUrl: string;
  docsUrl: string;
  note: string;
};

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "finnhub",
    name: "Finnhub",
    markets: ["US", "Global"],
    realtime: "Real-time US quotes",
    websocket: true,
    history: "Daily candles (paid tier)",
    keyUrl: "https://finnhub.io/register",
    docsUrl: "https://finnhub.io/docs/api",
    note: "Generous free tier for US equities. HK tickers require a paid plan.",
  },
  {
    id: "twelvedata",
    name: "Twelve Data",
    markets: ["US", "HK", "Global"],
    realtime: "Real-time / 15-min delayed by plan",
    websocket: true,
    history: "Daily + intraday bars",
    keyUrl: "https://twelvedata.com/pricing",
    docsUrl: "https://twelvedata.com/docs",
    note: "Best all-round free coverage — handles HKEX tickers such as 0700 out of the box.",
  },
  {
    id: "polygon",
    name: "Polygon.io",
    markets: ["US"],
    realtime: "Real-time US trades and snapshots",
    websocket: true,
    history: "Full-depth US aggregates",
    keyUrl: "https://polygon.io/dashboard/signup",
    docsUrl: "https://polygon.io/docs",
    note: "Highest quality US data. No Hong Kong coverage.",
  },
  {
    id: "alphavantage",
    name: "Alpha Vantage",
    markets: ["US", "HK", "Global"],
    realtime: "Delayed global quotes",
    websocket: false,
    history: "Daily + intraday",
    keyUrl: "https://www.alphavantage.co/support/#api-key",
    docsUrl: "https://www.alphavantage.co/documentation/",
    note: "Free key in one click, but limited to 25 requests per day on the free tier.",
  },
  {
    id: "tiingo",
    name: "Tiingo",
    markets: ["US"],
    realtime: "IEX real-time US quotes",
    websocket: true,
    history: "Long US daily history",
    keyUrl: "https://www.tiingo.com/account/api/token",
    docsUrl: "https://www.tiingo.com/documentation/general/overview",
    note: "Clean adjusted US history, free for personal use.",
  },
  {
    id: "marketstack",
    name: "Marketstack",
    markets: ["US", "HK", "Global"],
    realtime: "End-of-day and intraday",
    websocket: false,
    history: "Global EOD across 70+ exchanges",
    keyUrl: "https://marketstack.com/signup",
    docsUrl: "https://marketstack.com/documentation",
    note: "Wide exchange coverage including XHKG. End-of-day on the free tier.",
  },
  {
    id: "eodhd",
    name: "EODHD",
    markets: ["US", "HK", "Global"],
    realtime: "Real-time / delayed by exchange",
    websocket: true,
    history: "30+ years of global EOD",
    keyUrl: "https://eodhd.com/register",
    docsUrl: "https://eodhd.com/financial-apis/",
    note: "Strongest Hong Kong coverage of the paid options.",
  },
  {
    id: "fmp",
    name: "Financial Modeling Prep",
    markets: ["US", "HK", "Global"],
    realtime: "Real-time / delayed quotes",
    websocket: false,
    history: "Global daily history",
    keyUrl: "https://site.financialmodelingprep.com/developer/docs",
    docsUrl: "https://site.financialmodelingprep.com/developer/docs",
    note: "Simple REST quotes with global ticker support.",
  },
];

export const providerMeta = (id: string): ProviderMeta | undefined =>
  PROVIDERS.find((p) => p.id === id);

export function providerCoversSymbol(id: ProviderId, symbol: string): boolean {
  const meta = providerMeta(id);
  if (!meta) return false;
  const isHK = symbol.toUpperCase().endsWith(".HK");
  if (!isHK) return true;
  return meta.markets.includes("HK");
}

export type DataSourceRow = {
  id: string;
  provider: ProviderId;
  label: string | null;
  key_suffix: string | null;
  use_platform_key: boolean;
  priority: number;
  enabled: boolean;
  status: string;
  status_message: string | null;
  last_checked_at: string | null;
};
