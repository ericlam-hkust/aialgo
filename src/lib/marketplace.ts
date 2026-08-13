export type AssetClass = "stocks" | "crypto" | "forex" | "futures";
export type ModelStrategyType = "momentum" | "mean_reversion" | "ml_signal" | "arbitrage";
export type ModelRiskLevel = "low" | "medium" | "high";
export type ModelPricingModel = "one_time" | "subscription" | "per_signal";
export type ModelListingStatus =
  | "draft"
  | "pending_review"
  | "backtest_validation"
  | "paper_trading"
  | "live"
  | "rejected"
  | "paused"
  | "delisted";

export const ASSET_CLASSES: { value: AssetClass; label: string }[] = [
  { value: "stocks", label: "Stocks" },
  { value: "crypto", label: "Crypto" },
  { value: "forex", label: "Forex" },
  { value: "futures", label: "Futures" },
];

export const STRATEGY_TYPES: { value: ModelStrategyType; label: string }[] = [
  { value: "momentum", label: "Momentum" },
  { value: "mean_reversion", label: "Mean reversion" },
  { value: "ml_signal", label: "ML signal" },
  { value: "arbitrage", label: "Arbitrage" },
];

export const RISK_LEVELS: { value: ModelRiskLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const TIMEFRAMES = ["5m", "15m", "30m", "1h", "4h", "1d"] as const;

export const PRICING_MODELS: { value: ModelPricingModel; label: string; hint: string }[] = [
  { value: "one_time", label: "One-time unlock", hint: "Buyer pays once and keeps access forever." },
  { value: "subscription", label: "Monthly subscription", hint: "Recurring monthly fee while the model is active." },
  { value: "per_signal", label: "Per-signal fee", hint: "Buyer is charged for each executed signal." },
];

export const PLATFORM_COMMISSION = 0.2;

export const SUBMISSION_PIPELINE: { status: ModelListingStatus; label: string; description: string }[] = [
  { status: "pending_review", label: "Pending review", description: "A reviewer checks metadata and disclosures." },
  { status: "backtest_validation", label: "Backtest validation", description: "We re-run your backtest out of sample." },
  { status: "paper_trading", label: "Paper trading", description: "The model runs live on paper for verification." },
  { status: "live", label: "Live", description: "Listed publicly and available to buyers." },
];

export function pricingLabel(model: ModelPricingModel, price: number, currency = "HKD") {
  const amount = new Intl.NumberFormat("en-HK", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
  if (model === "subscription") return `${amount}/mo`;
  if (model === "per_signal") return `${amount}/signal`;
  return `${amount} once`;
}

export function labelFor<T extends string>(list: { value: T; label: string }[], value: T) {
  return list.find((i) => i.value === value)?.label ?? value;
}

export function riskTone(level: ModelRiskLevel) {
  return level === "low" ? "text-profit" : level === "high" ? "text-loss" : "text-warning";
}
