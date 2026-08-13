import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "algo-strategy"
  );
}

/**
 * Turns a visual algo strategy into a marketplace listing that uses the exact same
 * pipeline as AI models: validation backtest, versions, visibility and payouts.
 */
export const publishStrategyListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { strategyId: string }) => {
    if (!data?.strategyId) throw new Error("strategyId is required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: strategy, error: strategyError } = await supabase
      .from("strategies")
      .select("id,name,description,category,risk_level,parameters")
      .eq("id", data.strategyId)
      .maybeSingle();
    if (strategyError) throw new Error(strategyError.message);
    if (!strategy) throw new Error("Strategy not found.");

    const { data: existing } = await supabase
      .from("ai_models")
      .select("id,slug")
      .eq("strategy_id", strategy.id)
      .maybeSingle();
    if (existing) return { id: existing.id, slug: existing.slug, created: false };

    const { data: contributor } = await supabase
      .from("contributor_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!contributor) throw new Error("Create your contributor profile first (Earn → My listings).");

    const params = Array.isArray(strategy.parameters) ? strategy.parameters : [];
    const risk = (["low", "medium", "high"] as const).includes(strategy.risk_level as never)
      ? (strategy.risk_level as "low" | "medium" | "high")
      : "medium";

    let slug = slugify(strategy.name);
    const { data: clash } = await supabase.from("ai_models").select("id").eq("slug", slug).maybeSingle();
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: model, error } = await supabase
      .from("ai_models")
      .insert({
        contributor_id: contributor.id,
        user_id: userId,
        slug,
        name: strategy.name,
        tagline: strategy.description?.slice(0, 140) ?? null,
        description: strategy.description ?? "",
        listing_kind: "algo",
        strategy_id: strategy.id,
        status: "draft",
        visibility: "private",
        package_kind: "algo_graph",
        price: 0,
        parameters: params as never,
      })
      .select("id,slug")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("model_versions").insert({
      model_id: model.id,
      version: "1.0.0",
      changelog: "Published from the algo builder.",
      is_current: true,
    });

    return { id: model.id, slug: model.slug, created: true };
  });
