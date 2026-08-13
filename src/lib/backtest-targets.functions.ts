import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Everything a contributor can point the Backtest Playground at: their AI model
 * and algo listings, plus builder strategies that do not have a listing row yet.
 */
export const listBacktestTargets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: models }, { data: strategies }] = await Promise.all([
      supabase
        .from("ai_models")
        .select("id,name,listing_kind,status,visibility,strategy_id,asset_class,timeframe,sandbox_runs_used,validation_job_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("strategies")
        .select("id,name,updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
    ]);

    const linked = new Set((models ?? []).map((m) => m.strategy_id).filter(Boolean) as string[]);

    return {
      models: models ?? [],
      strategies: (strategies ?? []).filter((s) => !linked.has(s.id)),
    };
  });

export type BacktestTargets = Awaited<ReturnType<typeof listBacktestTargets>>;
