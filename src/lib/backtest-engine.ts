import { atr, bollinger, ema, macd, rsi, sma, type Bar } from "./indicators";
import type { StrategyGraph, StrategyNode } from "./strategy-graph";

export type TradeRecord = {
  entry_date: string;
  exit_date: string;
  entry_price: number;
  exit_price: number;
  quantity: number;
  pnl: number;
  return_pct: number;
  signal: string;
};

export type EquityPoint = { date: string; equity: number; benchmark: number; drawdown: number };

export type BacktestResult = {
  total_return: number;
  annualized_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  win_rate: number;
  profit_factor: number;
  total_trades: number;
  avg_trade_return: number;
  benchmark_return: number;
  equity_curve: EquityPoint[];
  trades_log: TradeRecord[];
  monthly_returns: { month: string; return_pct: number }[];
  overfitting_score: number;
};

type Series = number[];

function seriesFor(node: StrategyNode, bars: Bar[]): Series {
  const closes = bars.map((b) => b.close);
  const p = node.data.params ?? {};
  const num = (k: string, d: number) => Number(p[k] ?? d);
  switch (node.data.kind) {
    case "volume":
      return bars.map((b) => b.volume);
    case "time":
      return bars.map((_, i) => i);
    case "ohlc": {
      const field = String(p["field"] ?? "close") as keyof Bar;
      return bars.map((b) => Number(b[field] ?? b.close));
    }
    case "indicator": {
      switch (node.data.label) {
        case "SMA":
          return sma(closes, num("period", 20));
        case "EMA":
          return ema(closes, num("period", 20));
        case "RSI":
          return rsi(closes, num("period", 14));
        case "MACD":
          return macd(closes, num("fast", 12), num("slow", 26), num("signal", 9)).line;
        case "Bollinger Bands":
          return bollinger(closes, num("period", 20), num("stddev", 2)).upper;
        case "ATR":
          return atr(bars, num("period", 14));
        default:
          return closes;
      }
    }
    default:
      return closes;
  }
}

/** Evaluates a strategy graph bar-by-bar against historical OHLCV data. */
export function runBacktest(
  graph: StrategyGraph,
  bars: Bar[],
  opts: { initialCapital: number; commission: number; slippage: number },
): BacktestResult {
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const inputsOf = (id: string) => edges.filter((e) => e.target === id).map((e) => byId.get(e.source)).filter(Boolean) as StrategyNode[];

  const cache = new Map<string, Series>();
  const dataSeries = (n: StrategyNode): Series => {
    const hit = cache.get(n.id);
    if (hit) return hit;
    const s = seriesFor(n, bars);
    cache.set(n.id, s);
    return s;
  };

  const conditionNodes = nodes.filter((n) => n.type === "condition");
  const boolCache = new Map<string, boolean[]>();

  const evalCondition = (node: StrategyNode): boolean[] => {
    const hit = boolCache.get(node.id);
    if (hit) return hit;
    const inputs = inputsOf(node.id);
    const kind = node.data.kind;
    const out = new Array<boolean>(bars.length).fill(false);

    if (kind === "and" || kind === "or" || kind === "not") {
      const sub = inputs.filter((n) => n.type === "condition").map(evalCondition);
      for (let i = 0; i < bars.length; i++) {
        if (kind === "and") out[i] = sub.length > 0 && sub.every((s) => s[i]);
        else if (kind === "or") out[i] = sub.some((s) => s[i]);
        else out[i] = sub.length > 0 && !sub[0]![i];
      }
      boolCache.set(node.id, out);
      return out;
    }

    const dataInputs = inputs.filter((n) => n.type === "data");
    const a = dataInputs[0] ? dataSeries(dataInputs[0]) : bars.map((b) => b.close);
    const threshold = Number(node.data.params?.["value"] ?? 0);
    const b = dataInputs[1] ? dataSeries(dataInputs[1]) : bars.map(() => threshold);

    for (let i = 1; i < bars.length; i++) {
      const a0 = a[i - 1]!;
      const a1 = a[i]!;
      const b0 = b[i - 1]!;
      const b1 = b[i]!;
      if ([a0, a1, b0, b1].some((v) => Number.isNaN(v))) continue;
      switch (kind) {
        case "cross_above":
          out[i] = a0 <= b0 && a1 > b1;
          break;
        case "cross_below":
          out[i] = a0 >= b0 && a1 < b1;
          break;
        case "greater_than":
          out[i] = a1 > b1;
          break;
        case "less_than":
          out[i] = a1 < b1;
          break;
        case "equals":
          out[i] = Math.abs(a1 - b1) <= Number(node.data.params?.["tolerance"] ?? 0.01);
          break;
        default:
          out[i] = false;
      }
    }
    boolCache.set(node.id, out);
    return out;
  };

  // Map conditions to the actions they trigger.
  const entrySignals: { series: boolean[]; label: string; size: number }[] = [];
  const exitSignals: { series: boolean[]; label: string }[] = [];
  let stopLossPct = 0;
  let takeProfitPct = 0;
  let trailingPct = 0;
  let maxPositionPct = 100;

  for (const node of nodes) {
    if (node.type !== "action" && node.type !== "risk") continue;
    const params = node.data.params ?? {};
    if (node.data.kind === "set_stop_loss") stopLossPct = Number(params["percent"] ?? 0);
    if (node.data.kind === "set_take_profit") takeProfitPct = Number(params["percent"] ?? 0);
    if (node.data.kind === "trailing_stop") trailingPct = Number(params["percent"] ?? 0);
    if (node.data.kind === "max_position_size") maxPositionPct = Number(params["percent"] ?? 100);
  }

  for (const cond of conditionNodes) {
    const series = evalCondition(cond);
    const targets = edges.filter((e) => e.source === cond.id).map((e) => byId.get(e.target)).filter(Boolean) as StrategyNode[];
    for (const t of targets) {
      if (t.type !== "action") continue;
      if (t.data.kind === "buy_market" || t.data.kind === "buy_limit") {
        entrySignals.push({
          series,
          label: `${cond.data.label} → ${t.data.label}`,
          size: Number(t.data.params?.["size"] ?? 100),
        });
      }
      if (["sell_market", "sell_limit", "close_position"].includes(t.data.kind)) {
        exitSignals.push({ series, label: `${cond.data.label} → ${t.data.label}` });
      }
    }
  }

  // Fallback so an incomplete graph still produces an honest benchmark-only run.
  const capital = opts.initialCapital;
  let cash = capital;
  let qty = 0;
  let entryPrice = 0;
  let entryDate = "";
  let entrySignal = "";
  let peakClose = 0;
  const trades: TradeRecord[] = [];
  const equity: EquityPoint[] = [];
  const firstClose = bars[0]?.close ?? 1;
  let peakEquity = capital;
  let maxDd = 0;

  const fee = (value: number) => value * (opts.commission + opts.slippage);

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]!;
    const price = bar.close;

    if (qty > 0) {
      peakClose = Math.max(peakClose, price);
      const stopHit = stopLossPct > 0 && price <= entryPrice * (1 - stopLossPct / 100);
      const tpHit = takeProfitPct > 0 && price >= entryPrice * (1 + takeProfitPct / 100);
      const trailHit = trailingPct > 0 && price <= peakClose * (1 - trailingPct / 100);
      const signalExit = exitSignals.find((s) => s.series[i]);
      if (stopHit || tpHit || trailHit || signalExit) {
        const gross = qty * price;
        cash += gross - fee(gross);
        const pnl = (price - entryPrice) * qty - fee(gross);
        trades.push({
          entry_date: entryDate,
          exit_date: bar.date,
          entry_price: Number(entryPrice.toFixed(3)),
          exit_price: Number(price.toFixed(3)),
          quantity: Number(qty.toFixed(2)),
          pnl: Number(pnl.toFixed(2)),
          return_pct: Number((((price - entryPrice) / entryPrice) * 100).toFixed(2)),
          signal: stopHit
            ? "Stop loss"
            : tpHit
              ? "Take profit"
              : trailHit
                ? "Trailing stop"
                : (signalExit?.label ?? "Exit"),
        });
        qty = 0;
        entryPrice = 0;
      }
    }

    if (qty === 0) {
      const entry = entrySignals.find((s) => s.series[i]);
      if (entry) {
        const alloc = Math.min(entry.size, maxPositionPct) / 100;
        const budget = cash * alloc;
        const size = budget / price;
        if (size > 0) {
          qty = size;
          entryPrice = price * (1 + opts.slippage);
          entryDate = bar.date;
          entrySignal = entry.label;
          peakClose = price;
          cash -= budget + fee(budget);
        }
      }
    }

    const value = cash + qty * price;
    peakEquity = Math.max(peakEquity, value);
    const dd = peakEquity > 0 ? ((value - peakEquity) / peakEquity) * 100 : 0;
    maxDd = Math.min(maxDd, dd);
    equity.push({
      date: bar.date,
      equity: Number(value.toFixed(2)),
      benchmark: Number(((price / firstClose) * capital).toFixed(2)),
      drawdown: Number(dd.toFixed(2)),
    });
  }

  if (qty > 0 && bars.length) {
    const last = bars[bars.length - 1]!;
    const gross = qty * last.close;
    cash += gross - fee(gross);
    trades.push({
      entry_date: entryDate,
      exit_date: last.date,
      entry_price: Number(entryPrice.toFixed(3)),
      exit_price: Number(last.close.toFixed(3)),
      quantity: Number(qty.toFixed(2)),
      pnl: Number(((last.close - entryPrice) * qty - fee(gross)).toFixed(2)),
      return_pct: Number((((last.close - entryPrice) / entryPrice) * 100).toFixed(2)),
      signal: `${entrySignal} (end of test)`,
    });
    qty = 0;
  }

  const finalEquity = equity.length ? equity[equity.length - 1]!.equity : capital;
  const totalReturn = ((finalEquity - capital) / capital) * 100;
  const years = Math.max(bars.length / 252, 0.08);
  const annualized = (Math.pow(finalEquity / capital, 1 / years) - 1) * 100;

  const dailyReturns: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    const prev = equity[i - 1]!.equity;
    if (prev > 0) dailyReturns.push((equity[i]!.equity - prev) / prev);
  }
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / (dailyReturns.length || 1);
  const variance = dailyReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / (dailyReturns.length || 1);
  const sd = Math.sqrt(variance);
  const sharpe = sd > 0 ? (mean / sd) * Math.sqrt(252) : 0;

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const grossProfit = wins.reduce((a, t) => a + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));

  // Monthly returns from the equity curve.
  const monthly: { month: string; return_pct: number }[] = [];
  let monthStartEquity = capital;
  let currentMonth = equity[0]?.date.slice(0, 7) ?? "";
  for (let i = 0; i < equity.length; i++) {
    const m = equity[i]!.date.slice(0, 7);
    if (m !== currentMonth) {
      const endEquity = equity[i - 1]!.equity;
      monthly.push({
        month: currentMonth,
        return_pct: Number((((endEquity - monthStartEquity) / monthStartEquity) * 100).toFixed(2)),
      });
      monthStartEquity = endEquity;
      currentMonth = m;
    }
    if (i === equity.length - 1) {
      monthly.push({
        month: m,
        return_pct: Number((((equity[i]!.equity - monthStartEquity) / monthStartEquity) * 100).toFixed(2)),
      });
    }
  }

  const paramCount = nodes.reduce((a, n) => a + Object.keys(n.data.params ?? {}).length, 0);
  let overfit = Math.min(100, paramCount * 6);
  if (trades.length > 0 && wins.length / trades.length > 0.85) overfit += 25;
  if (annualized > 80) overfit += 20;
  if (trades.length > 0 && trades.length < 8) overfit += 15;
  overfit = Math.max(0, Math.min(100, Math.round(overfit)));

  const benchmarkReturn = equity.length
    ? ((equity[equity.length - 1]!.benchmark - capital) / capital) * 100
    : 0;

  return {
    total_return: Number(totalReturn.toFixed(2)),
    annualized_return: Number(annualized.toFixed(2)),
    sharpe_ratio: Number(sharpe.toFixed(2)),
    max_drawdown: Number(maxDd.toFixed(2)),
    win_rate: Number(((wins.length / (trades.length || 1)) * 100).toFixed(2)),
    profit_factor: Number((grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0).toFixed(2)),
    total_trades: trades.length,
    avg_trade_return: Number(
      (trades.reduce((a, t) => a + t.return_pct, 0) / (trades.length || 1)).toFixed(2),
    ),
    benchmark_return: Number(benchmarkReturn.toFixed(2)),
    equity_curve: equity,
    trades_log: trades,
    monthly_returns: monthly,
    overfitting_score: overfit,
  };
}
