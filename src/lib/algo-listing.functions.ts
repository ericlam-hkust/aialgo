import { createServerFn } from "@tanstack/react-start";
import { verificationChecklist } from "@/lib/backtest-verification";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { slugifyName } from "@/lib/listing-utils";
import type { ModelPricingModel, ModelRiskLevel } from "@/lib/marketplace";

/**
 * Turns a visual algo strategy into a marketplace listing that uses the exact same
 * pipeline as AI models: validation backtest, versions, visibility and payouts.
 * Everything is persisted — the listing is a real row that the wizard reads back.
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
      ? (strategy.risk_level as ModelRiskLevel)
      : "medium";

    let slug = slugifyName(strategy.name);
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
        risk_level: risk,
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

const LISTING_COLUMNS =
  "id,slug,name,tagline,description,risk_disclosure,tags,asset_class,strategy_type,timeframe,risk_level,status,visibility,pricing_model,price,currency,listing_kind,strategy_id,validation_job_id,backtest_config,sharpe,max_drawdown,win_rate,loss_rate,profit_factor,total_trades,total_return,cagr,consistency_score,overfitting_risk,suggested_price,pricing_score,data_source_kind,data_source_label,data_source_id,backtest_ran_at,listed_at,last_validated_at,pricing_mode,price_set_at,price_source_note,likes_count,comments_count,sentiment_avg,demand_score";

/** Loads the persisted listing draft (and its latest backtest job) for the wizard. */
export const getStrategyListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { strategyId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: strategy } = await supabase
      .from("strategies")
      .select("id,name,description,risk_level")
      .eq("id", data.strategyId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!strategy) throw new Error("Strategy not found.");

    const { data: listing } = await supabase
      .from("ai_models")
      .select(LISTING_COLUMNS)
      .eq("strategy_id", data.strategyId)
      .eq("user_id", userId)
      .maybeSingle();

    const jobs = listing
      ? (
          await supabase
            .from("backtest_jobs")
            .select("id,status,stage,progress,stage_message,failure_reason,config,results,completed_at,created_at,model_version,kind")
            .eq("model_id", listing.id)
            .order("created_at", { ascending: false })
            .limit(10)
        ).data ?? []
      : [];

    return { strategy, listing: listing ?? null, jobs };
  });

export type StrategyListingState = Awaited<ReturnType<typeof getStrategyListing>>;

/** Persists the editable listing metadata from step 1 of the wizard. */
export const saveListingDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      listingId: string;
      name: string;
      tagline: string;
      description: string;
      riskDisclosure: string;
      tags: string[];
      assetClass: string;
      strategyType: string;
      timeframe: string;
      riskLevel: ModelRiskLevel;
    }) => {
      if (!data.listingId) throw new Error("listingId is required");
      if (!data.name.trim()) throw new Error("Give the listing a name.");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("ai_models")
      .update({
        name: data.name.trim(),
        tagline: data.tagline.trim() || null,
        description: data.description,
        risk_disclosure: data.riskDisclosure || null,
        tags: data.tags,
        asset_class: data.assetClass as never,
        strategy_type: data.strategyType as never,
        timeframe: data.timeframe,
        risk_level: data.riskLevel as never,
      })
      .eq("id", data.listingId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Step 3: persists the chosen price alongside the platform's suggestion. */
export const saveListingPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      listingId: string;
      pricingModel: ModelPricingModel;
      price: number;
      suggestedPrice: number;
      pricingScore: number;
    }) => {
      if (!data.listingId) throw new Error("listingId is required");
      if (!Number.isFinite(data.price) || data.price < 0) throw new Error("Enter a valid price.");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("ai_models")
      .update({
        pricing_model: data.pricingModel as never,
        price: data.price,
        suggested_price: data.suggestedPrice,
        pricing_score: data.pricingScore,
      })
      .eq("id", data.listingId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Final step: makes the listing public so consumers can find, buy and run it.
 * Requires a completed platform backtest — no evidence, no public listing.
 */
export const publishListingPublicly = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { listingId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: listing } = await supabase
      .from("ai_models")
      .select("id,slug,status,price,validation_job_id,backtest_ran_at")
      .eq("id", data.listingId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!listing) throw new Error("Listing not found.");
    if (!listing.validation_job_id || !listing.backtest_ran_at) {
      throw new Error("Run the platform backtest before publishing.");
    }
    if (listing.status !== "live") {
      throw new Error("The backtest has not passed validation yet.");
    }

    const { data: job } = await supabase
      .from("backtest_jobs")
      .select("kind,results")
      .eq("id", listing.validation_job_id)
      .maybeSingle();
    const verification = verificationChecklist((job?.results ?? null) as never, job?.kind);
    if (!verification.verified) {
      const missing = verification.items.filter((i) => !i.ok).map((i) => i.label);
      throw new Error(
        `This run is not stamped "Successfully verified" yet. Outstanding: ${missing.join("; ")}.`,
      );
    }

    const { error } = await supabase
      .from("ai_models")
      .update({ visibility: "public", listed_at: new Date().toISOString() })
      .eq("id", listing.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { slug: listing.slug };
  });

/** Hides a live listing from the marketplace without deleting any history. */
export const unlistListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { listingId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("ai_models")
      .update({ visibility: "private" })
      .eq("id", data.listingId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
