/** Shared, client-safe types and constants for the platform backtest validation pipeline. */

export type BacktestProtocol = {
  inSampleStart: string;
  inSampleEnd: string;
  holdoutStart: string;
  holdoutEnd: string;
  slippagePct: number;
  feeBps: number;
  spreadBps: number;
  initialCapital: number;
  positionSizingPct: number;
  maxLeverage: number;
  maxPositions: number;
  maxDrawdownLimitPct: number;
  benchmark: string;
  revalidationMonths: number;
  minSharpe: number;
  minTrades: number;
  maxAllowedDrawdownPct: number;
  divergenceThresholdPct: number;
  walkForwardTrainMonths: number;
  walkForwardTestMonths: number;
};

export const DEFAULT_PROTOCOL: BacktestProtocol = {
  inSampleStart: "2019-01-01",
  inSampleEnd: "2023-12-31",
  holdoutStart: "2024-01-01",
  holdoutEnd: "2025-12-31",
  slippagePct: 0.1,
  feeBps: 10,
  spreadBps: 2,
  initialCapital: 100_000,
  positionSizingPct: 10,
  maxLeverage: 1,
  maxPositions: 5,
  maxDrawdownLimitPct: 40,
  benchmark: "SPY",
  revalidationMonths: 3,
  minSharpe: 0.8,
  minTrades: 30,
  maxAllowedDrawdownPct: 35,
  divergenceThresholdPct: 30,
  walkForwardTrainMonths: 12,
  walkForwardTestMonths: 3,
};


export type BacktestConfig = {
  assetClass: string;
  universe: string[];
  timeframe: "1m" | "5m" | "1h" | "1d";
  signalFrequency: string;
  minimumCapital: number;
  dataInputs: string[];
  startDate?: string;
  endDate?: string;
  notes?: string;
};

export const TIMEFRAMES = ["1m", "5m", "1h", "1d"] as const;

export const SIGNAL_FREQUENCIES = [
  { value: "per_bar", label: "Every bar" },
  { value: "intraday", label: "Several times per day" },
  { value: "daily", label: "Once per day" },
  { value: "weekly", label: "Weekly rebalance" },
  { value: "event", label: "Event driven" },
] as const;

export const DATA_INPUTS = [
  { value: "ohlcv", label: "OHLCV candles" },
  { value: "volume", label: "Volume profile" },
  { value: "indicators", label: "Derived indicators (SMA/RSI/ATR…)" },
  { value: "orderbook", label: "Order book depth" },
  { value: "fundamentals", label: "Fundamentals" },
  { value: "news", label: "News / sentiment" },
] as const;

export const JOB_STAGES = [
  { key: "interface_validation", label: "Interface validation", pct: 15 },
  { key: "data_check", label: "Data check", pct: 30 },
  { key: "running", label: "Backtest running", pct: 85 },
  { key: "results", label: "Results generated", pct: 100 },
] as const;

export type JobStage = (typeof JOB_STAGES)[number]["key"] | "queued" | "completed" | "failed";

export const FAILURE_REASONS: Record<string, string> = {
  interface_mismatch: "Model output format mismatch — signals must be {timestamp, symbol, side, size}.",
  insufficient_data: "Insufficient data history for the requested universe and timeframe.",
  runtime_timeout: "Runtime timeout — the model exceeded the 20 minute execution budget.",
  below_thresholds: "Performance below the platform minimum thresholds.",
  excessive_drawdown: "Max drawdown exceeded the platform limit.",
  too_few_trades: "Too few trades to produce a statistically meaningful result.",
};

export type BacktestMetrics = {
  totalReturn: number;
  cagr: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  trades: number;
  avgHoldingHours: number;
  exposurePct: number;
  benchmarkReturn: number;
  volatility: number;
  bestMonth: number;
  worstMonth: number;
};

export type WalkForwardWindow = {
  index: number;
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
  ret: number;
  sharpe: number;
  maxDrawdown: number;
  winRate: number;
  trades: number;
};

export type WalkForwardAnalysis = {
  windows: WalkForwardWindow[];
  trainMonths: number;
  testMonths: number;
  meanReturn: number;
  stdReturn: number;
  /** 0-100 — higher means results hold up consistently across windows. */
  consistencyScore: number;
  positiveWindows: number;
  /** Test-window return / train-window return, averaged. <0.5 is a red flag. */
  efficiency: number;
  overfittingRisk: boolean;
};

export type BacktestReport = {
  metrics: BacktestMetrics;
  holdoutMetrics: Pick<BacktestMetrics, "totalReturn" | "cagr" | "sharpe" | "maxDrawdown" | "winRate">;
  equity: { t: string; v: number; b: number }[];
  drawdown: { t: string; v: number }[];
  monthly: { year: number; month: number; ret: number }[];
  tradeDistribution: { bucket: string; count: number }[];
  regimes: { regime: string; ret: number; sharpe: number; trades: number }[];
  years: { year: number; ret: number; benchmark: number }[];
  walkForward?: WalkForwardAnalysis;
  passed: boolean;
  failureCode?: string | undefined;
  protocol: BacktestProtocol;
  config: BacktestConfig;
  generatedAt: string;
};

export const OVERFITTING_CONSISTENCY_THRESHOLD = 55;


export function stageLabel(stage: string) {
  return (
    JOB_STAGES.find((s) => s.key === stage)?.label ??
    (stage === "queued" ? "Queued" : stage === "failed" ? "Failed" : "Completed")
  );
}
