import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PLAN_LIMITS,
  currentPeriodKey,
  tierFromPriceId,
  upgradeMessage,
  type PlanLimits,
  type PlanTier,
} from "./entitlements";

type Client = SupabaseClient<any, any, any>;

export type Entitlements = {
  tier: PlanTier;
  limits: PlanLimits;
  usage: { backtestsRun: number; aiCalls: number; strategies: number };
  period: string;
};

export function stripeEnvFromServer(): "sandbox" | "live" {
  return process.env["STRIPE_LIVE_API_KEY"] ? "live" : "sandbox";
}

export async function getPlanTier(supabase: Client, userId: string): Promise<PlanTier> {
  const env = stripeEnvFromServer();
  const { data } = await supabase
    .from("subscriptions")
    .select("price_id,status,current_period_end")
    .eq("user_id", userId)
    .eq("environment", env)
    .order("created_at", { ascending: false })
    .limit(5);

  let tier: PlanTier = "free";
  for (const row of data ?? []) {
    const active =
      (["active", "trialing", "past_due"].includes(row.status) &&
        (!row.current_period_end || new Date(row.current_period_end) > new Date())) ||
      (row.status === "canceled" && row.current_period_end && new Date(row.current_period_end) > new Date());
    if (!active) continue;
    const rowTier = tierFromPriceId(row.price_id);
    if (rowTier === "elite") return "elite";
    if (rowTier === "pro") tier = "pro";
  }
  return tier;
}

export async function getEntitlements(supabase: Client, userId: string): Promise<Entitlements> {
  const period = currentPeriodKey();
  const [tier, usageRes, strategiesRes] = await Promise.all([
    getPlanTier(supabase, userId),
    supabase
      .from("usage_counters")
      .select("backtests_run,ai_calls")
      .eq("user_id", userId)
      .eq("period", period)
      .maybeSingle(),
    supabase.from("strategies").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  return {
    tier,
    limits: PLAN_LIMITS[tier],
    period,
    usage: {
      backtestsRun: Number(usageRes.data?.backtests_run ?? 0),
      aiCalls: Number(usageRes.data?.ai_calls ?? 0),
      strategies: strategiesRes.count ?? 0,
    },
  };
}

export function requireFeature(
  tier: PlanTier,
  feature: keyof Pick<
    PlanLimits,
    "liveDataSources" | "paperDeployments" | "brokerConnections" | "intradaySync" | "marketplacePublish"
  >,
  label: string,
) {
  if (PLAN_LIMITS[tier][feature]) return;
  const required: Exclude<PlanTier, "free"> = feature === "brokerConnections" || feature === "intradaySync" ? "elite" : "pro";
  throw new Error(upgradeMessage(label, required));
}

/** Increments a monthly counter using the service role (RLS blocks user writes). */
export async function incrementUsage(userId: string, field: "backtests_run" | "ai_calls") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const period = currentPeriodKey();
  const { data } = await supabaseAdmin
    .from("usage_counters")
    .select("backtests_run,ai_calls")
    .eq("user_id", userId)
    .eq("period", period)
    .maybeSingle();

  const next = {
    user_id: userId,
    period,
    backtests_run: Number(data?.backtests_run ?? 0) + (field === "backtests_run" ? 1 : 0),
    ai_calls: Number(data?.ai_calls ?? 0) + (field === "ai_calls" ? 1 : 0),
    updated_at: new Date().toISOString(),
  };
  await supabaseAdmin.from("usage_counters").upsert(next, { onConflict: "user_id,period" });
}

export async function assertQuota(
  supabase: Client,
  userId: string,
  kind: "backtest" | "ai" | "strategy",
) {
  const ent = await getEntitlements(supabase, userId);
  if (kind === "backtest" && ent.usage.backtestsRun >= ent.limits.maxBacktestsPerMonth) {
    throw new Error(
      upgradeMessage(
        `You have used all ${ent.limits.maxBacktestsPerMonth} backtests included this month — more backtests`,
        ent.tier === "free" ? "pro" : "elite",
      ),
    );
  }
  if (kind === "ai" && ent.usage.aiCalls >= ent.limits.maxAiCallsPerMonth) {
    throw new Error(
      upgradeMessage(
        `You have used all ${ent.limits.maxAiCallsPerMonth} AI requests included this month — more AI assistance`,
        ent.tier === "free" ? "pro" : "elite",
      ),
    );
  }
  if (kind === "strategy" && ent.usage.strategies >= ent.limits.maxStrategies) {
    throw new Error(
      upgradeMessage(
        `Your plan includes ${ent.limits.maxStrategies} strategies — more strategies`,
        ent.tier === "free" ? "pro" : "elite",
      ),
    );
  }
  return ent;
}
