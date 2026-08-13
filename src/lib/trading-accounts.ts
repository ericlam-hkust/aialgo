export type AccountProvider = "paper" | "binance" | "coinbase" | "alpaca" | "ibkr";

export const ACCOUNT_PROVIDERS: {
  value: AccountProvider;
  label: string;
  kind: "crypto" | "stocks";
  currency: string;
  docs: string;
}[] = [
  { value: "binance", label: "Binance", kind: "crypto", currency: "USDT", docs: "Spot & margin trading keys" },
  { value: "coinbase", label: "Coinbase Advanced", kind: "crypto", currency: "USD", docs: "Advanced Trade API keys" },
  { value: "alpaca", label: "Alpaca", kind: "stocks", currency: "USD", docs: "Live or paper trading keys" },
  { value: "ibkr", label: "Interactive Brokers", kind: "stocks", currency: "USD", docs: "Client Portal gateway" },
];

export const PERMISSION_CHECKLIST = [
  "Enable spot / equities trading",
  "Enable read-only account and balance access",
  "Never enable withdrawals or transfers",
  "Restrict the key to aiAlgo IPs where your venue supports it",
];

export const PAPER_STARTING_BALANCE = 100_000;

export function providerLabel(value: string): string {
  if (value === "paper") return "aiAlgo Paper Account";
  return ACCOUNT_PROVIDERS.find((p) => p.value === value)?.label ?? value;
}
