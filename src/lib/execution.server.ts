import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeManifest } from "@/lib/model-interface";

type AnyClient = SupabaseClient<any, any, any>;

const FALLBACK_SYMBOLS = ["BTC/USDT", "AAPL", "0700.HK", "SPY", "ETH/USDT"];

export type TickEvent = {
  activationId: string;
  modelName: string;
  symbol: string;
  action: string;
  confidence: number;
  status: "passed" | "blocked" | "killed";
  reason?: string;
  pnlDelta?: number;
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

/**
 * One simulated execution loop for the signed-in user: every active model emits a
 * signal, the risk engine accepts or blocks it, accepted signals become mock orders
 * on the linked account and move P&L.
 */
export async function runExecutionTick(supabase: AnyClient, userId: string): Promise<TickEvent[]> {
  const { data: activations } = await supabase
    .from("model_activations")
    .select(
      "id,model_id,status,mode,capital_allocation,max_position_size_pct,daily_loss_limit_pct,max_open_positions,kill_switch_drawdown_pct,peak_equity,pnl,pnl_pct,signals_consumed,executions_count,broker_connection_id, model:ai_models(name,slug,interface_manifest)",
    )
    .eq("user_id", userId)
    .eq("status", "active");

  const events: TickEvent[] = [];

  for (const a of activations ?? []) {
    const model = a.model as { name: string; slug: string; interface_manifest: unknown } | null;
    const manifest = normalizeManifest(model?.interface_manifest);
    const symbols = manifest.instruments.length ? manifest.instruments : FALLBACK_SYMBOLS;
    const symbol = pick(symbols);
    const action = pick(["BUY", "SELL", "CLOSE", "HOLD"]);
    const confidence = Math.round((0.45 + Math.random() * 0.54) * 100) / 100;
    const requestedSizePct = Math.round((2 + Math.random() * 18) * 10) / 10;
    const capital = Number(a.capital_allocation) || 0;
    const pnl = Number(a.pnl) || 0;
    const equity = capital + pnl;
    const peak = Math.max(Number(a.peak_equity) || 0, equity, capital);
    const drawdownPct = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
    const dayPnlPct = capital > 0 ? (pnl / capital) * 100 : 0;

    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count: openCount } = await supabase
      .from("execution_orders")
      .select("id", { count: "exact", head: true })
      .eq("activation_id", a.id)
      .gte("created_at", since);

    let status: "passed" | "blocked" = "passed";
    let reason: string | null = null;

    if (drawdownPct > Number(a.kill_switch_drawdown_pct ?? 100)) {
      status = "blocked";
      reason = `Kill switch: drawdown ${drawdownPct.toFixed(1)}% exceeds your ${Number(a.kill_switch_drawdown_pct).toFixed(1)}% limit.`;
    } else if (requestedSizePct > Number(a.max_position_size_pct ?? 100)) {
      status = "blocked";
      reason = `Blocked: exceeds max position size (${requestedSizePct}% > ${Number(a.max_position_size_pct)}%).`;
    } else if ((openCount ?? 0) >= Number(a.max_open_positions ?? 5)) {
      status = "blocked";
      reason = `Blocked: max open positions reached (${openCount}/${Number(a.max_open_positions)}).`;
    } else if (dayPnlPct < -Number(a.daily_loss_limit_pct ?? 100)) {
      status = "blocked";
      reason = `Blocked: daily loss limit hit (${dayPnlPct.toFixed(2)}%).`;
    } else if (action === "HOLD") {
      status = "blocked";
      reason = "No order: model returned HOLD.";
    }

    const price = Math.round((20 + Math.random() * 480) * 100) / 100;
    const { data: signal } = await supabase
      .from("execution_signals")
      .insert({
        user_id: userId,
        activation_id: a.id,
        model_id: a.model_id,
        symbol,
        action,
        confidence,
        position_size_pct: requestedSizePct,
        stop_loss: Math.round(price * 0.96 * 100) / 100,
        take_profit: Math.round(price * 1.07 * 100) / 100,
        status,
        block_reason: reason,
      })
      .select("id")
      .single();

    let pnlDelta = 0;
    if (status === "passed") {
      const notional = (capital * requestedSizePct) / 100;
      const quantity = price > 0 ? Math.round((notional / price) * 100) / 100 : 0;
      pnlDelta = Math.round((notional * (Math.random() * 0.03 - 0.012)) * 100) / 100;
      await supabase.from("execution_orders").insert({
        user_id: userId,
        activation_id: a.id,
        signal_id: signal?.id ?? null,
        broker_connection_id: a.broker_connection_id,
        symbol,
        side: action,
        quantity,
        price,
        notional,
        realized_pnl: pnlDelta,
        status: "filled",
      });
    }

    const nextPnl = pnl + pnlDelta;
    const nextEquity = capital + nextPnl;
    const killed = peak > 0 && ((peak - nextEquity) / peak) * 100 > Number(a.kill_switch_drawdown_pct ?? 100);

    await supabase
      .from("model_activations")
      .update({
        pnl: nextPnl,
        pnl_pct: capital > 0 ? (nextPnl / capital) * 100 : 0,
        peak_equity: Math.max(peak, nextEquity),
        signals_consumed: Number(a.signals_consumed ?? 0) + 1,
        executions_count: Number(a.executions_count ?? 0) + (status === "passed" ? 1 : 0),
        last_signal_at: new Date().toISOString(),
        ...(killed
          ? {
              status: "paused",
              paused_reason: "Kill switch triggered — drawdown exceeded your limit.",
              paused_at: new Date().toISOString(),
            }
          : {}),
      })
      .eq("id", a.id)
      .eq("user_id", userId);

    events.push({
      activationId: a.id,
      modelName: model?.name ?? "Model",
      symbol,
      action,
      confidence,
      status: killed ? "killed" : status,
      ...(reason ? { reason } : {}),
      pnlDelta,
    });
  }

  return events;
}
