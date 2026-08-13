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
  "id,slug,name,tagline,description,risk_disclosure,tags,asset_class,strategy_type,timeframe,risk_level,status,pricing_model,price,currency,parameters,sharpe,max_drawdown,win_rate,cagr,live_return_30d,rating,rating_count,active_users,executions,listed_at,contributor_id";

export const listPublicModels = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const [{ data: models }, { data: contributors }] = await Promise.all([
    supabase.from("ai_models").select(MODEL_COLUMNS).eq("status", "live").order("active_users", { ascending: false }),
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
      .eq("status", "live")
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
        .select("id,author_name,rating,comment,created_at")
        .eq("model_id", model.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    return {
      ...model,
      contributor: contributor ?? null,
      versions: versions ?? [],
      backtest: metrics?.find((m) => m.kind === "backtest") ?? null,
      live: metrics?.find((m) => m.kind === "live") ?? null,
      reviews: reviews ?? [],
    };
  });

export type PublicModelDetail = NonNullable<Awaited<ReturnType<typeof getPublicModel>>>;

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { modelId: string; rating: number; comment: string }) => {
    if (data.rating < 1 || data.rating > 5) throw new Error("Rating must be between 1 and 5");
    return { ...data, comment: data.comment.slice(0, 1200) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("full_name,email").eq("id", userId).maybeSingle();
    const { error } = await supabase.from("model_reviews").upsert(
      {
        model_id: data.modelId,
        user_id: userId,
        author_name: profile?.full_name || profile?.email?.split("@")[0] || "Trader",
        rating: data.rating,
        comment: data.comment,
      },
      { onConflict: "model_id,user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyModelAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: purchases }, { data: activations }] = await Promise.all([
      supabase.from("model_purchases").select("*").eq("user_id", userId).eq("status", "active"),
      supabase.from("model_activations").select("*").eq("user_id", userId).order("activated_at", { ascending: false }),
    ]);
    return { purchases: purchases ?? [], activations: activations ?? [] };
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
