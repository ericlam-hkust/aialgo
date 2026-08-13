import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const MODEL_COLUMNS =
  "id,team_id,visibility,slug,name,tagline,description,risk_disclosure,tags,asset_class,strategy_type,timeframe,risk_level,status,pricing_model,price,currency,parameters,sharpe,max_drawdown,win_rate,cagr,live_return_30d,rating,rating_count,active_users,executions,listed_at,contributor_id,divergence_flagged,last_validated_at,validation_job_id,backtest_config,overfitting_risk,consistency_score,interface_manifest,listing_kind,hosting_mode,trust_tier,declared_frequency,measured_latency_ms,live_since,promoted,loss_rate,profit_factor,total_trades,total_return,data_source_kind,data_source_label,backtest_ran_at,suggested_price,pricing_score,base_model_id,base_version,finetune_method,pipeline,resources";

export const listPublicModels = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const [{ data: models }, { data: contributors }] = await Promise.all([
    supabase
      .from("ai_models")
      .select(MODEL_COLUMNS)
      .eq("status", "live")
      .eq("visibility", "public")
      .order("active_users", { ascending: false }),
    supabase.from("contributor_profiles").select("id,handle,display_name,avatar_url,verified,country"),
  ]);
  const byId = new Map((contributors ?? []).map((c) => [c.id, c]));
  return (models ?? []).map((m) => ({ ...m, contributor: byId.get(m.contributor_id) ?? null }));
});

export type PublicModel = Awaited<ReturnType<typeof listPublicModels>>[number];

export const getPublicModel = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => {
    if (!/^[a-z0-9-]{1,80}$/.test(data.slug)) throw new Error("Invalid slug");
    return data;
  })
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: model } = await supabase
      .from("ai_models")
      .select(MODEL_COLUMNS)
      .eq("slug", data.slug)
      .neq("visibility", "private")
      .in("status", ["live", "paper_trading"])
      .maybeSingle();
    if (!model) return null;

    const [{ data: contributor }, { data: versions }, { data: metrics }, { data: reviews }] = await Promise.all([
      supabase
        .from("contributor_profiles")
        .select("id,handle,display_name,avatar_url,bio,verified,country")
        .eq("id", model.contributor_id)
        .maybeSingle(),
      supabase
        .from("model_versions")
        .select("id,version,changelog,is_current,released_at")
        .eq("model_id", model.id)
        .order("released_at", { ascending: false }),
      supabase.from("model_metrics").select("kind,series,monthly_returns,stats").eq("model_id", model.id),
      supabase
        .from("model_reviews")
        .select("id,author_name,rating,comment,created_at,verified,days_active")
        .eq("model_id", model.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    // Every non-sandbox completed run, so the page can show one verified report
    // per model version plus the evolution across versions.
    const { data: jobs } = await supabase
      .from("backtest_jobs")
      .select("id,model_version,results,completed_at,kind")
      .eq("model_id", model.id)
      .eq("status", "completed")
      .neq("kind", "sandbox")
      .order("completed_at", { ascending: false });

    const byVersion = new Map<string, (typeof jobs extends null ? never : NonNullable<typeof jobs>[number])>();
    for (const job of jobs ?? []) {
      const key = job.model_version ?? "1.0.0";
      if (!byVersion.has(key)) byVersion.set(key, job);
    }
    const versionReports = [...byVersion.entries()].map(([version, job]) => ({ version, job }));

    const { data: team } = model.team_id
      ? await supabase.from("teams").select("id,slug,name").eq("id", model.team_id).maybeSingle()
      : { data: null };

    return {
      ...model,
      team: team ?? null,
      namespace: team ? `${team.slug}/${model.slug}` : model.slug,
      verifiedBacktest: jobs?.[0] ?? null,
      versionReports,
      contributor: contributor ?? null,
      versions: versions ?? [],
      backtest: metrics?.find((m) => m.kind === "backtest") ?? null,
      live: metrics?.find((m) => m.kind === "live") ?? null,
      reviews: reviews ?? [],
    };
  });

export type PublicModelDetail = NonNullable<Awaited<ReturnType<typeof getPublicModel>>>;

/** Loads up to 3 live models plus their latest verified reports for side-by-side comparison. */
export const compareModelsData = createServerFn({ method: "GET" })
  .inputValidator((data: { slugs: string[] }) => {
    const slugs = data.slugs.filter((s) => /^[a-z0-9-]{1,80}$/.test(s)).slice(0, 3);
    return { slugs };
  })
  .handler(async ({ data }) => {
    if (!data.slugs.length) return [];
    const supabase = publicClient();
    const { data: models } = await supabase
      .from("ai_models")
      .select(MODEL_COLUMNS)
      .in("slug", data.slugs)
      .eq("status", "live");

    const rows = models ?? [];
    const { data: jobs } = await supabase
      .from("backtest_jobs")
      .select("model_id,model_version,results,completed_at")
      .in("model_id", rows.length ? rows.map((m) => m.id) : ["00000000-0000-0000-0000-000000000000"])
      .eq("status", "completed")
      .neq("kind", "sandbox")
      .order("completed_at", { ascending: false });

    const latest = new Map<string, NonNullable<typeof jobs>[number]>();
    for (const j of jobs ?? []) if (j.model_id && !latest.has(j.model_id)) latest.set(j.model_id, j);

    return data.slugs
      .map((slug) => rows.find((m) => m.slug === slug))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .map((m) => ({ ...m, report: latest.get(m.id) ?? null }));
  });

export type CompareModelRow = Awaited<ReturnType<typeof compareModelsData>>[number];


export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { modelId: string; rating: number; comment: string }) => {
    if (data.rating < 1 || data.rating > 5) throw new Error("Rating must be between 1 and 5");
    return { ...data, comment: data.comment.slice(0, 1200) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Only traders who have run the model for 7+ days can rate it.
    const { data: activation } = await supabase
      .from("model_activations")
      .select("activated_at")
      .eq("user_id", userId)
      .eq("model_id", data.modelId)
      .order("activated_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const daysActive = activation
      ? Math.floor((Date.now() - new Date(activation.activated_at).getTime()) / 86_400_000)
      : 0;
    if (!activation || daysActive < 7) {
      throw new Error("You can rate a model after running it for 7 days.");
    }

    const { data: profile } = await supabase.from("profiles").select("full_name,email").eq("id", userId).maybeSingle();
    const { error } = await supabase.from("model_reviews").upsert(
      {
        model_id: data.modelId,
        user_id: userId,
        author_name: profile?.full_name || profile?.email?.split("@")[0] || "Trader",
        rating: data.rating,
        comment: data.comment,
        verified: true,
        days_active: daysActive,
      },
      { onConflict: "model_id,user_id" },
    );
    if (error) throw new Error(error.message);

    // Refresh aggregate rating on the listing.
    const { data: all } = await supabase.from("model_reviews").select("rating").eq("model_id", data.modelId);
    const ratings = (all ?? []).map((r) => Number(r.rating));
    if (ratings.length) {
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      await supabase
        .from("ai_models")
        .update({ rating: Math.round(avg * 100) / 100, rating_count: ratings.length })
        .eq("id", data.modelId);
    }
    return { ok: true };
  });

export const getMyModelAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: activations } = await supabase
      .from("model_activations")
      .select("*")
      .eq("user_id", userId)
      .order("activated_at", { ascending: false });
    return { activations: activations ?? [] };
  });


export const listMyActivations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("model_activations")
      .select("*, model:ai_models(id,slug,name,asset_class,strategy_type,timeframe,risk_level,sharpe,live_return_30d)")
      .eq("user_id", userId)
      .order("activated_at", { ascending: false });
    return data ?? [];
  });

export const activateModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      modelId: string;
      purchaseId?: string;
      brokerConnectionId?: string | null;
      mode: "paper" | "live";
      capitalAllocation: number;
      maxPositionSizePct: number;
      dailyLossLimitPct: number;
      stopLossPct: number;
      maxOpenPositions?: number;
      killSwitchDrawdownPct?: number;
      parameters?: Record<string, string | number | boolean>;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: purchase } = await supabase
      .from("model_purchases")
      .select("id")
      .eq("user_id", userId)
      .eq("model_id", data.modelId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!purchase) throw new Error("Purchase this model before activating it.");

    const { data: row, error } = await supabase
      .from("model_activations")
      .insert({
        model_id: data.modelId,
        user_id: userId,
        purchase_id: purchase.id,
        broker_connection_id: data.brokerConnectionId ?? null,
        mode: data.mode,
        capital_allocation: data.capitalAllocation,
        max_position_size_pct: data.maxPositionSizePct,
        daily_loss_limit_pct: data.dailyLossLimitPct,
        stop_loss_pct: data.stopLossPct,
        max_open_positions: data.maxOpenPositions ?? 5,
        kill_switch_drawdown_pct: data.killSwitchDrawdownPct ?? 20,
        peak_equity: data.capitalAllocation,
        parameters: (data.parameters ?? {}) as never,
        status: "active",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const setActivationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { activationId: string; status: "active" | "paused" | "stopped" }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("model_activations")
      .update({ status: data.status })
      .eq("id", data.activationId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
