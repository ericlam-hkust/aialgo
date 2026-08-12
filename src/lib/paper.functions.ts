import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Marks every open paper position against the latest live quote, and raises a
 * risk event when a stop-loss or take-profit level is breached.
 */
export const markPaperPositions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: positions, error } = await context.supabase
      .from("paper_positions")
      .select("id, symbol, quantity, avg_entry_price, stop_loss, take_profit, strategy_id, strategy_name");
    if (error) throw new Error(error.message);
    if (!positions || positions.length === 0) return { marked: 0, breaches: 0 };

    const symbols = [...new Set(positions.map((p) => p.symbol))];
    const { data: quotes } = await context.supabase
      .from("market_quotes")
      .select("symbol, price")
      .in("symbol", symbols);
    const priceOf = new Map((quotes ?? []).map((q) => [q.symbol, Number(q.price)]));

    let marked = 0;
    let breaches = 0;

    for (const p of positions) {
      const price = priceOf.get(p.symbol);
      if (!price) continue;
      const qty = Number(p.quantity);
      const entry = Number(p.avg_entry_price);
      const pnl = (price - entry) * qty;
      const pnlPct = entry > 0 ? ((price - entry) / entry) * 100 * (qty < 0 ? -1 : 1) : 0;

      await context.supabase
        .from("paper_positions")
        .update({
          current_price: price,
          unrealized_pnl: pnl,
          unrealized_pnl_percent: pnlPct,
        })
        .eq("id", p.id);
      marked += 1;

      const stop = p.stop_loss === null ? null : Number(p.stop_loss);
      const target = p.take_profit === null ? null : Number(p.take_profit);
      const hitStop = stop !== null && (qty > 0 ? price <= stop : price >= stop);
      const hitTarget = target !== null && (qty > 0 ? price >= target : price <= target);

      if (hitStop || hitTarget) {
        breaches += 1;
        await context.supabase.from("risk_events").insert({
          user_id: context.userId,
          strategy_id: p.strategy_id,
          strategy_name: p.strategy_name,
          event_type: hitStop ? "stop_loss_hit" : "take_profit_hit",
          severity: hitStop ? "critical" : "info",
          message: `${p.symbol} traded at ${price.toFixed(2)}, ${
            hitStop ? `through the stop at ${stop}` : `through the target at ${target}`
          }.`,
        });
      }
    }

    return { marked, breaches };
  });
