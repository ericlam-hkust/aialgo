export type NodeCategory = "data" | "condition" | "action" | "risk";

/** Which rule set a node belongs to. Risk guards apply to the whole strategy. */
export type StrategyLane = "entry" | "exit" | "risk";

/** Port types used to validate connections on the canvas. */
export type PortType = "value" | "bool" | "none";

export type StrategyNodeData = {
  kind: string;
  label: string;
  params: Record<string, number | string>;
};

export type StrategyNode = {
  id: string;
  type: NodeCategory;
  lane?: StrategyLane;
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
  input: PortType;
  output: PortType;
  /** Maximum number of incoming connections (Infinity for logic gates). */
  maxInputs: number;
  /** Lanes this node makes sense in. */
  lanes: StrategyLane[];
};

const d = (
  kind: string,
  label: string,
  description: string,
  params: Record<string, number | string> = {},
): NodeSpec => ({
  kind,
  label,
  description,
  params,
  category: "data",
  input: "none",
  output: "value",
  maxInputs: 0,
  lanes: ["entry", "exit"],
});

const c = (
  kind: string,
  label: string,
  description: string,
  params: Record<string, number | string> = {},
  logic = false,
): NodeSpec => ({
  kind,
  label,
  description,
  params,
  category: "condition",
  input: logic ? "bool" : "value",
  output: "bool",
  maxInputs: logic ? Number.POSITIVE_INFINITY : 2,
  lanes: ["entry", "exit"],
});

const a = (
  kind: string,
  label: string,
  description: string,
  params: Record<string, number | string>,
  lanes: StrategyLane[],
): NodeSpec => ({
  kind,
  label,
  description,
  params,
  category: "action",
  input: "bool",
  output: "none",
  maxInputs: Number.POSITIVE_INFINITY,
  lanes,
});

const r = (kind: string, label: string, description: string, params: Record<string, number | string>): NodeSpec => ({
  kind,
  label,
  description,
  params,
  category: "risk",
  input: "none",
  output: "none",
  maxInputs: 0,
  lanes: ["risk"],
});

export const NODE_CATALOG: NodeSpec[] = [
  // DATA
  d("price", "Price (Close)", "Closing price of each bar."),
  d("ohlc", "Price (OHLC)", "Open/High/Low/Close of each bar.", { field: "close" }),
  d("volume", "Volume", "Traded volume per bar."),
  d("indicator", "SMA", "Simple moving average.", { period: 20 }),
  d("indicator", "EMA", "Exponential moving average.", { period: 20 }),
  d("indicator", "RSI", "Relative strength index (0-100).", { period: 14 }),
  d("indicator", "MACD", "MACD line vs signal line.", { fast: 12, slow: 26, signal: 9 }),
  d("indicator", "Bollinger Bands", "Volatility bands around a moving average.", { period: 20, stddev: 2 }),
  d("indicator", "ATR", "Average true range volatility measure.", { period: 14 }),
  d("time", "Time / Date", "Bar index or calendar filter.", { skip_first: 0 }),
  // CONDITION
  c("cross_above", "Cross Above", "First input crosses above the second."),
  c("cross_below", "Cross Below", "First input crosses below the second."),
  c("greater_than", "Greater Than", "Input is greater than a value or a second input.", { value: 70 }),
  c("less_than", "Less Than", "Input is less than a value or a second input.", { value: 30 }),
  c("equals", "Equals", "Input equals a value within tolerance.", { value: 0, tolerance: 0.01 }),
  c("and", "And", "All incoming conditions must be true.", {}, true),
  c("or", "Or", "Any incoming condition must be true.", {}, true),
  c("not", "Not", "Inverts the incoming condition.", {}, true),
  // ACTION
  a("buy_market", "Buy Market", "Enter long at the next open.", { size: 100 }, ["entry"]),
  a("buy_limit", "Buy Limit", "Enter long with a limit offset.", { size: 50, offset_pct: 0.5 }, ["entry"]),
  a("sell_market", "Sell Market", "Exit long at the next open.", { size: 100 }, ["exit"]),
  a("sell_limit", "Sell Limit", "Exit long with a limit offset.", { size: 50, offset_pct: 0.5 }, ["exit"]),
  a("close_position", "Close Position", "Flatten the position immediately.", {}, ["exit"]),
  a("set_stop_loss", "Set Stop Loss", "Protective stop as % below entry.", { percent: 5 }, ["exit"]),
  a("set_take_profit", "Set Take Profit", "Target exit as % above entry.", { percent: 12 }, ["exit"]),
  a("trailing_stop", "Trailing Stop", "Stop that follows the highest close.", { percent: 8 }, ["exit"]),
  // RISK
  r("max_position_size", "Max Position Size", "Cap capital allocated per position.", { percent: 20 }),
  r("max_daily_loss", "Max Daily Loss", "Halt trading after this daily loss.", { percent: 3 }),
  r("max_drawdown", "Max Drawdown Percent", "Halt strategy at this drawdown.", { percent: 10 }),
];

export const CATEGORY_LABEL: Record<NodeCategory, string> = {
  data: "Data & indicators",
  condition: "Conditions",
  action: "Actions",
  risk: "Risk guards",
};

export const LANE_LABEL: Record<StrategyLane, string> = {
  entry: "Entry rules",
  exit: "Exit rules",
  risk: "Risk guards",
};

export const LANE_HINT: Record<StrategyLane, string> = {
  entry: "When these are true, the strategy opens a position.",
  exit: "When these are true, the position is closed.",
  risk: "Account-level guards applied to every trade.",
};

export const ENTRY_ACTION_KINDS = ["buy_market", "buy_limit"];
export const EXIT_ACTION_KINDS = [
  "sell_market",
  "sell_limit",
  "close_position",
  "set_stop_loss",
  "set_take_profit",
  "trailing_stop",
];

export function specFor(node: Pick<StrategyNode, "type" | "data">): NodeSpec | undefined {
  return NODE_CATALOG.find(
    (s) => s.kind === node.data.kind && (s.kind !== "indicator" || s.label === node.data.label),
  );
}

/** Lane geometry used for canvas swim-lanes and auto layout. */
export const LANE_BOUNDS: Record<StrategyLane, { y: number; height: number }> = {
  entry: { y: 0, height: 320 },
  exit: { y: 340, height: 320 },
  risk: { y: 680, height: 180 },
};

export const COLUMN_X: Record<NodeCategory, number> = {
  data: 40,
  condition: 380,
  action: 720,
  risk: 40,
};

export function laneOf(node: StrategyNode): StrategyLane {
  if (node.lane) return node.lane;
  if (node.type === "risk") return "risk";
  if (node.type === "action") return EXIT_ACTION_KINDS.includes(node.data.kind) ? "exit" : "entry";
  return "entry";
}

/** Infers lanes for graphs that predate lane support (e.g. AI output). */
export function inferLanes(graph: StrategyGraph): StrategyGraph {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const lanes = new Map<string, StrategyLane>();

  for (const n of graph.nodes) {
    if (n.lane) lanes.set(n.id, n.lane);
    else if (n.type === "risk") lanes.set(n.id, "risk");
    else if (n.type === "action") lanes.set(n.id, EXIT_ACTION_KINDS.includes(n.data.kind) ? "exit" : "entry");
  }

  // Walk backwards from actions so conditions/data inherit their lane.
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 12) {
    changed = false;
    for (const e of graph.edges) {
      const target = lanes.get(e.target);
      const src = byId.get(e.source);
      if (!target || !src || lanes.get(e.source) === target) continue;
      if (src.type === "risk") continue;
      if (!lanes.has(e.source)) {
        lanes.set(e.source, target);
        changed = true;
      }
    }
  }

  return {
    nodes: graph.nodes.map((n) => ({ ...n, lane: lanes.get(n.id) ?? (n.type === "risk" ? "risk" : "entry") })),
    edges: graph.edges,
  };
}

/** Tidy left-to-right layout inside each lane. */
export function autoLayout(graph: StrategyGraph): StrategyGraph {
  const counters = new Map<string, number>();
  const nodes = graph.nodes.map((n) => {
    const lane = laneOf(n);
    const key = `${lane}:${n.type}`;
    const index = counters.get(key) ?? 0;
    counters.set(key, index + 1);
    return {
      ...n,
      lane,
      position: {
        x: COLUMN_X[n.type] + (n.type === "risk" ? index * 240 : 0),
        y: LANE_BOUNDS[lane].y + 48 + (n.type === "risk" ? 0 : index * 104),
      },
    };
  });
  return { nodes, edges: graph.edges };
}

export type GraphIssues = {
  errors: string[];
  warnings: string[];
  byNode: Record<string, string>;
};

export function validateGraph(graph: StrategyGraph): GraphIssues {
  const errors: string[] = [];
  const warnings: string[] = [];
  const byNode: Record<string, string> = {};
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];

  if (!nodes.length) {
    errors.push("The canvas is empty. Add data, a condition and an action.");
    return { errors, warnings, byNode };
  }

  const incoming = (id: string) => edges.filter((e) => e.target === id);
  const outgoing = (id: string) => edges.filter((e) => e.source === id);

  for (const n of nodes) {
    const spec = specFor(n);
    const ins = incoming(n.id).length;
    if (spec && spec.input !== "none" && ins === 0) {
      byNode[n.id] = "Needs an incoming connection";
    } else if (spec && spec.input !== "none" && ins > spec.maxInputs) {
      byNode[n.id] = `Accepts at most ${spec.maxInputs} input${spec.maxInputs === 1 ? "" : "s"}`;
    } else if (spec && spec.output !== "none" && outgoing(n.id).length === 0) {
      byNode[n.id] = "Output is not connected to anything";
    }
  }

  const entryActions = nodes.filter((n) => n.type === "action" && ENTRY_ACTION_KINDS.includes(n.data.kind));
  const exitActions = nodes.filter((n) => n.type === "action" && EXIT_ACTION_KINDS.includes(n.data.kind));

  if (!entryActions.length) errors.push("Add an entry action (Buy Market) so the strategy can open a position.");
  if (!exitActions.length) warnings.push("No exit rule yet — add a sell, stop loss or take profit.");

  const triggered = (list: StrategyNode[]) =>
    list.some((act) => incoming(act.id).some((e) => nodes.find((n) => n.id === e.source)?.type === "condition"));

  if (entryActions.length && !triggered(entryActions))
    errors.push("Your entry action has no condition attached — connect a condition to it.");

  const gatedExits = exitActions.filter((n) => ["sell_market", "sell_limit", "close_position"].includes(n.data.kind));
  if (gatedExits.length && !triggered(gatedExits))
    warnings.push("An exit order has no condition attached — it will never fire.");

  if (!nodes.some((n) => ["set_stop_loss", "trailing_stop"].includes(n.data.kind)))
    warnings.push("No stop loss configured. Consider protecting downside before going live.");

  return { errors, warnings, byNode };
}

export const emptyGraph = (): StrategyGraph => ({ nodes: [], edges: [] });

let seed = 0;
export const newNodeId = () => `n${Date.now().toString(36)}${(seed++).toString(36)}`;

/** A valid starter strategy so the canvas is never a blank void. */
export function starterGraph(): StrategyGraph {
  const fast = newNodeId();
  const slow = newNodeId();
  const enterCond = newNodeId();
  const buy = newNodeId();
  const exitCond = newNodeId();
  const sell = newNodeId();
  const stop = newNodeId();
  const risk = newNodeId();

  const nodes: StrategyNode[] = [
    { id: fast, type: "data", lane: "entry", position: { x: 40, y: 48 }, data: { kind: "indicator", label: "SMA", params: { period: 20 } } },
    { id: slow, type: "data", lane: "entry", position: { x: 40, y: 152 }, data: { kind: "indicator", label: "SMA", params: { period: 50 } } },
    { id: enterCond, type: "condition", lane: "entry", position: { x: 380, y: 96 }, data: { kind: "cross_above", label: "Cross Above", params: {} } },
    { id: buy, type: "action", lane: "entry", position: { x: 720, y: 96 }, data: { kind: "buy_market", label: "Buy Market", params: { size: 100 } } },
    { id: exitCond, type: "condition", lane: "exit", position: { x: 380, y: 400 }, data: { kind: "cross_below", label: "Cross Below", params: {} } },
    { id: sell, type: "action", lane: "exit", position: { x: 720, y: 400 }, data: { kind: "sell_market", label: "Sell Market", params: { size: 100 } } },
    { id: stop, type: "action", lane: "exit", position: { x: 720, y: 504 }, data: { kind: "set_stop_loss", label: "Set Stop Loss", params: { percent: 5 } } },
    { id: risk, type: "risk", lane: "risk", position: { x: 40, y: 728 }, data: { kind: "max_position_size", label: "Max Position Size", params: { percent: 20 } } },
  ];

  const edges: StrategyEdge[] = [
    { id: `e${fast}-${enterCond}`, source: fast, target: enterCond },
    { id: `e${slow}-${enterCond}`, source: slow, target: enterCond },
    { id: `e${enterCond}-${buy}`, source: enterCond, target: buy },
    { id: `e${fast}-${exitCond}`, source: fast, target: exitCond },
    { id: `e${slow}-${exitCond}`, source: slow, target: exitCond },
    { id: `e${exitCond}-${sell}`, source: exitCond, target: sell },
  ];

  return { nodes, edges };
}

export function isStrategyGraph(value: unknown): value is StrategyGraph {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as StrategyGraph).nodes) &&
    Array.isArray((value as StrategyGraph).edges)
  );
}

export type GraphDiff = {
  added: string[];
  removed: string[];
  changed: string[];
};

export function diffGraphs(before: StrategyGraph, after: StrategyGraph): GraphDiff {
  const beforeMap = new Map(before.nodes.map((n) => [n.id, n]));
  const afterMap = new Map(after.nodes.map((n) => [n.id, n]));
  const added = after.nodes.filter((n) => !beforeMap.has(n.id)).map((n) => n.id);
  const removed = before.nodes.filter((n) => !afterMap.has(n.id)).map((n) => n.id);
  const changed = after.nodes
    .filter((n) => {
      const prev = beforeMap.get(n.id);
      return prev && JSON.stringify(prev.data) !== JSON.stringify(n.data);
    })
    .map((n) => n.id);
  return { added, removed, changed };
}
