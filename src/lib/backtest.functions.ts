import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runBacktest } from "./backtest-engine";
import type { Bar } from "./indicators";
import { isStrategyGraph, type StrategyGraph } from "./strategy-graph";

export type BacktestInput = {
  strategyId: string | null;
  strategyName: string;
  graph: StrategyGraph;
  symbol: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  commissionPct: number;
  slippagePct: number;
};

export const runBacktestFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: BacktestInput) => {
    if (!input?.symbol) throw new Error("A symbol is required");
    if (!isStrategyGraph(input.graph)) throw new Error("Invalid strategy graph");
    if (!(input.initialCapital > 0)) throw new Error("Initial capital must be positive");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Plan quota: monthly backtest allowance per subscription tier.
    await assertQuota(supabase, userId, "backtest");

    const { data: rows, error } = await supabase
      .from("market_data_daily")
      .select("date, open, high, low, close, volume")
      .eq("symbol", data.symbol)
      .gte("date", data.startDate)
      .lte("date", data.endDate)
      .order("date", { ascending: true });
    if (error) throw new Error(error.message);
    if (!rows || rows.length < 30) throw new Error("Not enough market data for this symbol and date range.");

    const bars: Bar[] = rows.map((r) => ({
      date: String(r.date),
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: Number(r.volume),
    }));

    const result = runBacktest(data.graph, bars, {
      initialCapital: data.initialCapital,
      commission: data.commissionPct / 100,
      slippage: data.slippagePct / 100,
    });

    const { data: saved, error: insertError } = await supabase
      .from("backtests")
      .insert({
        user_id: userId,
        strategy_id: data.strategyId,
        strategy_name: data.strategyName,
        symbol: data.symbol,
        start_date: data.startDate,
        end_date: data.endDate,
        initial_capital: data.initialCapital,
        commission: data.commissionPct / 100,
        slippage: data.slippagePct / 100,
        total_return: result.total_return,
        annualized_return: result.annualized_return,
        sharpe_ratio: result.sharpe_ratio,
        max_drawdown: result.max_drawdown,
        win_rate: result.win_rate,
        profit_factor: result.profit_factor,
        total_trades: result.total_trades,
        avg_trade_return: result.avg_trade_return,
        benchmark_return: result.benchmark_return,
        equity_curve: result.equity_curve,
        trades_log: result.trades_log,
        monthly_returns: result.monthly_returns,
        overfitting_score: result.overfitting_score,
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);

    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "backtest.run",
      entity_type: "backtest",
      entity_id: saved.id,
      metadata: { symbol: data.symbol, strategy: data.strategyName },
    });

    return { id: saved.id as string, ...result };
  });
