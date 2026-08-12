export type SymbolInfo = {
  symbol: string;
  name: string;
  market: "HK" | "US";
  sector: string;
  currency: "HKD" | "USD";
};

export const SYMBOLS: SymbolInfo[] = [
  { symbol: "0700.HK", name: "Tencent Holdings", market: "HK", sector: "Technology", currency: "HKD" },
  { symbol: "9988.HK", name: "Alibaba Group", market: "HK", sector: "Consumer", currency: "HKD" },
  { symbol: "3690.HK", name: "Meituan", market: "HK", sector: "Consumer", currency: "HKD" },
  { symbol: "2318.HK", name: "Ping An Insurance", market: "HK", sector: "Financials", currency: "HKD" },
  { symbol: "0005.HK", name: "HSBC Holdings", market: "HK", sector: "Financials", currency: "HKD" },
  { symbol: "AAPL", name: "Apple Inc.", market: "US", sector: "Technology", currency: "USD" },
  { symbol: "TSLA", name: "Tesla Inc.", market: "US", sector: "Consumer", currency: "USD" },
  { symbol: "SPY", name: "S&P 500 ETF", market: "US", sector: "Index", currency: "USD" },
  { symbol: "QQQ", name: "Nasdaq 100 ETF", market: "US", sector: "Index", currency: "USD" },
];

export const symbolInfo = (symbol: string): SymbolInfo | undefined =>
  SYMBOLS.find((s) => s.symbol === symbol);

export const GLOSSARY: Record<string, string> = {
  "Sharpe Ratio":
    "Risk-adjusted return: average excess return divided by volatility. Above 1 is decent, above 2 is strong.",
  "Max Drawdown": "The largest peak-to-trough fall in portfolio value during the test period.",
  Slippage: "The difference between the expected fill price and the price you actually get.",
  Commission: "Broker fee charged per trade, expressed as a percentage of the trade value.",
  "Profit Factor": "Gross profit divided by gross loss. Above 1.5 is generally considered healthy.",
  "Win Rate": "Share of closed trades that ended profitable.",
  "Annualized Return": "The compounded yearly growth rate implied by the test period result.",
  "Overfitting Score":
    "Heuristic 0-100 estimate of how likely the result is curve-fitted to this exact history.",
  "Buying Power": "Total value of positions you could open right now, including any margin.",
  "Unrealized P&L": "Profit or loss on positions you still hold, marked to the latest price.",
};
