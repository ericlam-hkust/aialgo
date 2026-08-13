/**
 * Two-way bridge between the visual strategy graph and readable Python.
 *
 * The generated code is a restricted, round-trippable subset: data/indicator
 * expressions, boolean combinators and a risk dictionary. Anything outside the
 * subset is preserved as "custom" code and executed as-is by the engine.
 */
import {
  ENTRY_ACTION_KINDS,
  EXIT_ACTION_KINDS,
  laneOf,
  newNodeId,
  type StrategyEdge,
  type StrategyLane,
  type StrategyGraph,
  type StrategyNode,
} from "./strategy-graph";

const INDICATOR_FN: Record<string, string> = {
  SMA: "sma",
  EMA: "ema",
  RSI: "rsi",
  MACD: "macd",
  "Bollinger Bands": "bbands",
  ATR: "atr",
};
const FN_INDICATOR: Record<string, string> = Object.fromEntries(
  Object.entries(INDICATOR_FN).map(([label, fn]) => [fn, label]),
);

const RISK_KEYS: Record<string, { kind: string; label: string; param: string; category: "action" | "risk" }> = {
  stop_loss_pct: { kind: "set_stop_loss", label: "Set Stop Loss", param: "percent", category: "action" },
  take_profit_pct: { kind: "set_take_profit", label: "Set Take Profit", param: "percent", category: "action" },
  trailing_stop_pct: { kind: "trailing_stop", label: "Trailing Stop", param: "percent", category: "action" },
  max_position_pct: { kind: "max_position_size", label: "Max Position Size", param: "percent", category: "risk" },
  max_daily_loss_pct: { kind: "max_daily_loss", label: "Max Daily Loss", param: "percent", category: "risk" },
  max_drawdown_pct: { kind: "max_drawdown", label: "Max Drawdown Percent", param: "percent", category: "risk" },
};

export class PythonParseError extends Error {
  line: number;
  constructor(message: string, line = 0) {
    super(message);
    this.name = "PythonParseError";
    this.line = line;
  }
}

/* -------------------------------------------------------------------------- */
/*                                graph -> python                              */
/* -------------------------------------------------------------------------- */

const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || fallback);

function valueExpr(node: StrategyNode): string {
  const { kind, label, params } = node.data;
  switch (kind) {
    case "price":
      return "bar.close";
    case "ohlc": {
      const field = String(params["field"] ?? "close").toLowerCase();
      return `bar.${["open", "high", "low", "close"].includes(field) ? field : "close"}`;
    }
    case "volume":
      return "bar.volume";
    case "time":
      return "bar.index";
    case "indicator": {
      const fn = INDICATOR_FN[label] ?? "sma";
      const args = Object.entries(params)
        .map(([k, v]) => `${k}=${typeof v === "number" ? v : JSON.stringify(v)}`)
        .join(", ");
      return `ta.${fn}(${args})`;
    }
    default:
      return "bar.close";
  }
}

function boolExpr(
  node: StrategyNode,
  graph: StrategyGraph,
  depth = 0,
): string {
  if (depth > 8) return "False";
  const inputs = graph.edges
    .filter((e) => e.target === node.id)
    .map((e) => graph.nodes.find((n) => n.id === e.source))
    .filter((n): n is StrategyNode => !!n);

  const values = inputs.filter((n) => n.type === "data").map(valueExpr);
  const bools = inputs.filter((n) => n.type === "condition").map((n) => boolExpr(n, graph, depth + 1));
  const p = node.data.params;

  switch (node.data.kind) {
    case "cross_above":
    case "cross_below": {
      const fn = node.data.kind === "cross_above" ? "crossed_above" : "crossed_below";
      const [a, b] = [values[0] ?? "bar.close", values[1] ?? String(num(p["value"], 0))];
      return `${fn}(${a}, ${b})`;
    }
    case "greater_than":
    case "less_than": {
      const op = node.data.kind === "greater_than" ? ">" : "<";
      const a = values[0] ?? "bar.close";
      const b = values[1] ?? String(num(p["value"], 0));
      return `${a} ${op} ${b}`;
    }
    case "equals": {
      const a = values[0] ?? "bar.close";
      const b = values[1] ?? String(num(p["value"], 0));
      return `abs(${a} - ${b}) <= ${num(p["tolerance"], 0.01)}`;
    }
    case "and":
      return bools.length ? bools.map(wrap).join(" and ") : "True";
    case "or":
      return bools.length ? bools.map(wrap).join(" or ") : "False";
    case "not":
      return `not ${wrap(bools[0] ?? "False")}`;
    default:
      return "False";
  }
}

const isAtomic = (s: string) => /^[a-z_]+\([^()]*(\([^()]*\))?[^()]*\)$/i.test(s) || !/\s(and|or)\s/.test(s);
const wrap = (s: string) => (isAtomic(s) ? s : `(${s})`);

function actionExpression(graph: StrategyGraph, kinds: string[]): string {
  const actions = graph.nodes.filter((n) => n.type === "action" && kinds.includes(n.data.kind));
  const exprs: string[] = [];
  for (const action of actions) {
    for (const edge of graph.edges.filter((e) => e.target === action.id)) {
      const src = graph.nodes.find((n) => n.id === edge.source);
      if (src?.type === "condition") exprs.push(boolExpr(src, graph));
    }
  }
  const unique = [...new Set(exprs)];
  if (!unique.length) return "False";
  return unique.length === 1 ? (unique[0] as string) : unique.map(wrap).join(" or ");
}

function riskDict(graph: StrategyGraph): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, meta] of Object.entries(RISK_KEYS)) {
    const node = graph.nodes.find((n) => n.data.kind === meta.kind);
    if (node) out[key] = num(node.data.params[meta.param], 0);
  }
  return out;
}

function sizeOf(graph: StrategyGraph, kinds: string[], fallback: number): number {
  const node = graph.nodes.find((n) => kinds.includes(n.data.kind));
  return node ? num(node.data.params["size"], fallback) : fallback;
}

export function graphToPython(graph: StrategyGraph, meta: { name: string; description?: string }): string {
  const entry = actionExpression(graph, ENTRY_ACTION_KINDS);
  const exit = actionExpression(graph, ["sell_market", "sell_limit", "close_position"]);
  const risk = riskDict(graph);
  const buySize = sizeOf(graph, ENTRY_ACTION_KINDS, 100);
  const sellSize = sizeOf(graph, ["sell_market", "sell_limit"], 100);

  const riskLines = Object.entries(risk).map(([k, v]) => `        "${k}": ${v},`);
  const doc = (meta.description ?? "").trim();

  return `"""${meta.name || "Untitled strategy"}${doc ? `\n\n${doc}` : ""}

Generated by the aiAlgo visual builder.
Edit this file directly — the builder parses it back into the canvas.
"""
from aialgo import Strategy, crossed_above, crossed_below
from aialgo import indicators as ta


class GeneratedStrategy(Strategy):
    name = ${JSON.stringify(meta.name || "Untitled strategy")}

    risk = {
${riskLines.length ? riskLines.join("\n") : "        # no risk guards configured"}
    }

    def should_enter(self, bar):
        return ${entry}

    def should_exit(self, bar):
        return ${exit}

    def on_bar(self, bar):
        if not self.position and self.should_enter(bar):
            self.buy(size=${buySize})
        elif self.position and self.should_exit(bar):
            self.sell(size=${sellSize})
`;
}

/* -------------------------------------------------------------------------- */
/*                                python -> graph                              */
/* -------------------------------------------------------------------------- */

type Token = { t: string; line: number };

function tokenize(src: string, startLine: number): Token[] {
  const tokens: Token[] = [];
  let line = startLine;
  let i = 0;
  while (i < src.length) {
    const ch = src[i] as string;
    if (ch === "\n") {
      line++;
      i++;
      continue;
    }
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "#") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (["<=", ">=", "==", "!="].includes(two)) {
      tokens.push({ t: two, line });
      i += 2;
      continue;
    }
    if ("()<>,=.-+*/".includes(ch)) {
      tokens.push({ t: ch, line });
      i++;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9._]/.test(src[j] as string)) j++;
      tokens.push({ t: src.slice(i, j), line });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j] as string)) j++;
      tokens.push({ t: src.slice(i, j), line });
      i = j;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== ch) j++;
      tokens.push({ t: src.slice(i, j + 1), line });
      i = j + 1;
      continue;
    }
    throw new PythonParseError(`Unexpected character "${ch}" in expression`, line);
  }
  return tokens;
}

type Builder = {
  nodes: StrategyNode[];
  edges: StrategyEdge[];
  cache: Map<string, string>;
};

function addNode(
  b: Builder,
  type: StrategyNode["type"],
  lane: StrategyLane,
  data: StrategyNode["data"],
): string {
  const id = newNodeId();
  b.nodes.push({ id, type, lane, position: { x: 0, y: 0 }, data });
  return id;
}

function connect(b: Builder, source: string, target: string) {
  b.edges.push({ id: `e${source}-${target}`, source, target });
}

class ExprParser {
  private pos = 0;
  constructor(
    private tokens: Token[],
    private b: Builder,
    private lane: "entry" | "exit",
  ) {}

  private peek(offset = 0) {
    return this.tokens[this.pos + offset];
  }
  private next() {
    const t = this.tokens[this.pos++];
    if (!t) throw new PythonParseError("Unexpected end of expression");
    return t;
  }
  private eat(t: string) {
    const tok = this.next();
    if (tok.t !== t) throw new PythonParseError(`Expected "${t}" but found "${tok.t}"`, tok.line);
  }
  get done() {
    return this.pos >= this.tokens.length;
  }

  parse(): string | null {
    if (this.done) return null;
    const first = this.peek();
    if (first && (first.t === "False" || first.t === "True") && this.tokens.length === 1) return null;
    const id = this.parseOr();
    if (!this.done) {
      const tok = this.peek();
      throw new PythonParseError(`Unsupported token "${tok?.t}"`, tok?.line ?? 0);
    }
    return id;
  }

  private parseOr(): string {
    let left = this.parseAnd();
    const parts = [left];
    while (this.peek()?.t === "or") {
      this.next();
      parts.push(this.parseAnd());
    }
    if (parts.length === 1) return left;
    const id = addNode(this.b, "condition", this.lane, { kind: "or", label: "Or", params: {} });
    parts.forEach((p) => connect(this.b, p, id));
    left = id;
    return left;
  }

  private parseAnd(): string {
    const parts = [this.parseNot()];
    while (this.peek()?.t === "and") {
      this.next();
      parts.push(this.parseNot());
    }
    if (parts.length === 1) return parts[0] as string;
    const id = addNode(this.b, "condition", this.lane, { kind: "and", label: "And", params: {} });
    parts.forEach((p) => connect(this.b, p, id));
    return id;
  }

  private parseNot(): string {
    if (this.peek()?.t === "not") {
      this.next();
      const inner = this.parseNot();
      const id = addNode(this.b, "condition", this.lane, { kind: "not", label: "Not", params: {} });
      connect(this.b, inner, id);
      return id;
    }
    return this.parseComparison();
  }

  private parseComparison(): string {
    // Parenthesised boolean group
    if (this.peek()?.t === "(" && this.isBoolGroup()) {
      this.eat("(");
      const id = this.parseOr();
      this.eat(")");
      return id;
    }

    const tok = this.peek();
    if (tok && (tok.t === "crossed_above" || tok.t === "crossed_below")) {
      this.next();
      this.eat("(");
      const a = this.parseValue();
      this.eat(",");
      const bId = this.parseValue();
      this.eat(")");
      const kind = tok.t === "crossed_above" ? "cross_above" : "cross_below";
      const id = addNode(this.b, "condition", this.lane, {
        kind,
        label: kind === "cross_above" ? "Cross Above" : "Cross Below",
        params: {},
      });
      connect(this.b, a, id);
      connect(this.b, bId, id);
      return id;
    }

    const left = this.parseValue();
    const op = this.peek();
    if (!op || ![">", "<", ">=", "<=", "==", "!="].includes(op.t))
      throw new PythonParseError(
        "Each rule must be a comparison (e.g. ta.rsi(period=14) < 30) or crossed_above(...)",
        op?.line ?? tok?.line ?? 0,
      );
    this.next();
    const rightTok = this.peek();
    const rightIsNumber = !!rightTok && /^[0-9.]/.test(rightTok.t);
    const kind = op.t.startsWith(">") ? "greater_than" : op.t.startsWith("<") ? "less_than" : "equals";
    const label = kind === "greater_than" ? "Greater Than" : kind === "less_than" ? "Less Than" : "Equals";

    if (rightIsNumber) {
      const value = Number(this.next().t);
      const params: Record<string, number> = kind === "equals" ? { value, tolerance: 0.01 } : { value };
      const id = addNode(this.b, "condition", this.lane, { kind, label, params });
      connect(this.b, left, id);
      return id;
    }
    const right = this.parseValue();
    const id = addNode(this.b, "condition", this.lane, {
      kind,
      label,
      params: kind === "equals" ? { value: 0, tolerance: 0.01 } : { value: 0 },
    });
    connect(this.b, left, id);
    connect(this.b, right, id);
    return id;
  }

  /** Looks ahead to decide whether "(" starts a boolean group or a value group. */
  private isBoolGroup(): boolean {
    let depth = 0;
    for (let i = this.pos; i < this.tokens.length; i++) {
      const t = this.tokens[i] as Token;
      if (t.t === "(") depth++;
      else if (t.t === ")") {
        depth--;
        if (depth === 0) return false;
      } else if (depth === 1 && ["and", "or", "not", ">", "<", ">=", "<=", "==", "!="].includes(t.t)) return true;
      else if (depth === 1 && (t.t === "crossed_above" || t.t === "crossed_below")) return true;
    }
    return false;
  }

  /** Parses a value expression and returns the id of a (deduplicated) data node. */
  private parseValue(): string {
    const tok = this.next();

    if (tok.t === "bar") {
      this.eat(".");
      const field = this.next().t;
      if (field === "close") return this.dataNode("bar.close", { kind: "price", label: "Price (Close)", params: {} });
      if (field === "volume") return this.dataNode("bar.volume", { kind: "volume", label: "Volume", params: {} });
      if (field === "index")
        return this.dataNode("bar.index", { kind: "time", label: "Time / Date", params: { skip_first: 0 } });
      if (["open", "high", "low"].includes(field))
        return this.dataNode(`bar.${field}`, { kind: "ohlc", label: "Price (OHLC)", params: { field } });
      throw new PythonParseError(`Unknown bar field "${field}"`, tok.line);
    }

    if (tok.t === "ta") {
      this.eat(".");
      const fn = this.next().t;
      const label = FN_INDICATOR[fn];
      if (!label) throw new PythonParseError(`Unknown indicator "ta.${fn}"`, tok.line);
      this.eat("(");
      const params: Record<string, number | string> = {};
      while (this.peek() && this.peek()?.t !== ")") {
        const key = this.next().t;
        this.eat("=");
        const raw = this.next().t;
        params[key] = /^[0-9.]/.test(raw) ? Number(raw) : raw.replace(/['"]/g, "");
        if (this.peek()?.t === ",") this.next();
      }
      this.eat(")");
      const key = `ta.${fn}(${JSON.stringify(params)})`;
      return this.dataNode(key, { kind: "indicator", label, params });
    }

    if (/^[0-9.]/.test(tok.t)) {
      // A bare number on the left side is not representable as a node.
      throw new PythonParseError("A rule cannot start with a number — put the indicator first", tok.line);
    }

    throw new PythonParseError(`Unsupported expression "${tok.t}"`, tok.line);
  }

  private dataNode(key: string, data: StrategyNode["data"]): string {
    const cached = this.b.cache.get(key);
    if (cached) return cached;
    const id = addNode(this.b, "data", this.lane, data);
    this.b.cache.set(key, id);
    return id;
  }
}

function lineOf(src: string, index: number) {
  return src.slice(0, index).split("\n").length;
}

function extractReturn(src: string, method: string): { expr: string; line: number } | null {
  const defIdx = src.indexOf(`def ${method}(`);
  if (defIdx === -1) return null;
  const nextDef = src.indexOf("\n    def ", defIdx + 1);
  const body = src.slice(defIdx, nextDef === -1 ? undefined : nextDef);
  const retIdx = body.indexOf("return ");
  if (retIdx === -1) return null;
  // Consume until parentheses are balanced and the line ends.
  let depth = 0;
  let i = retIdx + "return ".length;
  const start = i;
  for (; i < body.length; i++) {
    const ch = body[i] as string;
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "\n" && depth <= 0) break;
  }
  return { expr: body.slice(start, i), line: lineOf(src, defIdx + retIdx) };
}

export type ParseResult = { graph: StrategyGraph; warnings: string[] };

export function pythonToGraph(code: string): ParseResult {
  const warnings: string[] = [];
  const b: Builder = { nodes: [], edges: [], cache: new Map() };

  if (!/class\s+\w+\s*\(\s*Strategy\s*\)/.test(code))
    throw new PythonParseError("Expected a class that extends Strategy (e.g. class GeneratedStrategy(Strategy):)", 1);

  const buySize = Number(/self\.buy\(\s*size\s*=\s*([0-9.]+)/.exec(code)?.[1] ?? 100);
  const sellSize = Number(/self\.sell\(\s*size\s*=\s*([0-9.]+)/.exec(code)?.[1] ?? 100);

  const lanes: { method: string; lane: "entry" | "exit"; action: StrategyNode["data"] }[] = [
    {
      method: "should_enter",
      lane: "entry",
      action: { kind: "buy_market", label: "Buy Market", params: { size: buySize } },
    },
    {
      method: "should_exit",
      lane: "exit",
      action: { kind: "sell_market", label: "Sell Market", params: { size: sellSize } },
    },
  ];

  for (const { method, lane, action } of lanes) {
    const found = extractReturn(code, method);
    if (!found) {
      warnings.push(`No ${method}() found — that lane will be empty.`);
      continue;
    }
    b.cache = new Map();
    const tokens = tokenize(found.expr, found.line);
    const parser = new ExprParser(tokens, b, lane);
    const rootId = parser.parse();
    if (!rootId) {
      warnings.push(`${method}() always returns a constant — no ${lane} rules generated.`);
      continue;
    }
    const actionId = addNode(b, "action", lane, action);
    connect(b, rootId, actionId);
  }

  const riskBlock = /risk\s*=\s*\{([\s\S]*?)\}/.exec(code)?.[1] ?? "";
  for (const m of riskBlock.matchAll(/["'](\w+)["']\s*:\s*([0-9.]+)/g)) {
    const meta = RISK_KEYS[m[1] as string];
    if (!meta) {
      warnings.push(`Unknown risk key "${m[1]}" was ignored.`);
      continue;
    }
    addNode(b, meta.category, meta.category === "risk" ? "risk" : "exit", {
      kind: meta.kind,
      label: meta.label,
      params: { [meta.param]: Number(m[2]) },
    });
  }

  if (!b.nodes.length) throw new PythonParseError("No rules found — define should_enter() and should_exit().", 1);

  return { graph: { nodes: b.nodes, edges: b.edges }, warnings };
}

/** True when the code still matches what the graph would generate. */
export function codeMatchesGraph(code: string, graph: StrategyGraph, meta: { name: string; description?: string }) {
  const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
  return normalize(code) === normalize(graphToPython(graph, meta));
}
