export type NodeCategory = "data" | "condition" | "action" | "risk";

export type StrategyNodeData = {
  kind: string;
  label: string;
  params: Record<string, number | string>;
};

export type StrategyNode = {
  id: string;
  type: NodeCategory;
  position: { x: number; y: number };
  data: StrategyNodeData;
};

export type StrategyEdge = { id: string; source: string; target: string };

export type StrategyGraph = { nodes: StrategyNode[]; edges: StrategyEdge[] };

export type NodeSpec = {
  kind: string;
  label: string;
  category: NodeCategory;
  description: string;
  params: Record<string, number | string>;
};

export const NODE_CATALOG: NodeSpec[] = [
  // DATA
  { kind: "price", label: "Price (Close)", category: "data", description: "Closing price of each bar.", params: {} },
  { kind: "ohlc", label: "Price (OHLC)", category: "data", description: "Open/High/Low/Close of each bar.", params: { field: "close" } },
  { kind: "volume", label: "Volume", category: "data", description: "Traded volume per bar.", params: {} },
  { kind: "indicator", label: "SMA", category: "data", description: "Simple moving average.", params: { period: 20 } },
  { kind: "indicator", label: "EMA", category: "data", description: "Exponential moving average.", params: { period: 20 } },
  { kind: "indicator", label: "RSI", category: "data", description: "Relative strength index (0-100).", params: { period: 14 } },
  { kind: "indicator", label: "MACD", category: "data", description: "MACD line vs signal line.", params: { fast: 12, slow: 26, signal: 9 } },
  { kind: "indicator", label: "Bollinger Bands", category: "data", description: "Volatility bands around a moving average.", params: { period: 20, stddev: 2 } },
  { kind: "indicator", label: "ATR", category: "data", description: "Average true range volatility measure.", params: { period: 14 } },
  { kind: "time", label: "Time / Date", category: "data", description: "Bar index or calendar filter.", params: { skip_first: 0 } },
  // CONDITION
  { kind: "cross_above", label: "Cross Above", category: "condition", description: "First input crosses above the second.", params: {} },
  { kind: "cross_below", label: "Cross Below", category: "condition", description: "First input crosses below the second.", params: {} },
  { kind: "greater_than", label: "Greater Than", category: "condition", description: "Input is greater than a value or a second input.", params: { value: 70 } },
  { kind: "less_than", label: "Less Than", category: "condition", description: "Input is less than a value or a second input.", params: { value: 30 } },
  { kind: "equals", label: "Equals", category: "condition", description: "Input equals a value within tolerance.", params: { value: 0, tolerance: 0.01 } },
  { kind: "and", label: "And", category: "condition", description: "All incoming conditions must be true.", params: {} },
  { kind: "or", label: "Or", category: "condition", description: "Any incoming condition must be true.", params: {} },
  { kind: "not", label: "Not", category: "condition", description: "Inverts the incoming condition.", params: {} },
  // ACTION
  { kind: "buy_market", label: "Buy Market", category: "action", description: "Enter long at the next open.", params: { size: 100 } },
  { kind: "sell_market", label: "Sell Market", category: "action", description: "Exit long at the next open.", params: { size: 100 } },
  { kind: "buy_limit", label: "Buy Limit", category: "action", description: "Enter long with a limit offset.", params: { size: 50, offset_pct: 0.5 } },
  { kind: "sell_limit", label: "Sell Limit", category: "action", description: "Exit long with a limit offset.", params: { size: 50, offset_pct: 0.5 } },
  { kind: "set_stop_loss", label: "Set Stop Loss", category: "action", description: "Protective stop as % below entry.", params: { percent: 5 } },
  { kind: "set_take_profit", label: "Set Take Profit", category: "action", description: "Target exit as % above entry.", params: { percent: 12 } },
  { kind: "trailing_stop", label: "Trailing Stop", category: "action", description: "Stop that follows the highest close.", params: { percent: 8 } },
  { kind: "close_position", label: "Close Position", category: "action", description: "Flatten the position immediately.", params: {} },
  // RISK
  { kind: "max_position_size", label: "Max Position Size", category: "risk", description: "Cap capital allocated per position.", params: { percent: 20 } },
  { kind: "max_daily_loss", label: "Max Daily Loss", category: "risk", description: "Halt trading after this daily loss.", params: { percent: 3 } },
  { kind: "max_drawdown", label: "Max Drawdown Percent", category: "risk", description: "Halt strategy at this drawdown.", params: { percent: 10 } },
];

export const CATEGORY_LABEL: Record<NodeCategory, string> = {
  data: "Data",
  condition: "Conditions",
  action: "Actions",
  risk: "Risk",
};

export const emptyGraph = (): StrategyGraph => ({ nodes: [], edges: [] });

export function isStrategyGraph(value: unknown): value is StrategyGraph {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as StrategyGraph).nodes) &&
    Array.isArray((value as StrategyGraph).edges)
  );
}
