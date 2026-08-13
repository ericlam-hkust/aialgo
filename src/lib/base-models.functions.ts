import { createServerFn } from "@tanstack/react-start";
import type { BaseModelRow } from "@/lib/base-models";

const BASE_COLUMNS =
  "id,name,version,listing_kind,architecture,tagline,description,docs,instruments,timeframes,data_start,data_end,feature_schema,trainable,frozen,recommended_settings,baseline_metrics,compute_estimate,package_contents";

export const listBaseModels = createServerFn({ method: "GET" }).handler(async () => {
  const { publicSupabase } = await import("@/lib/supabase-public.server");
  const supabase = publicSupabase();
  const [{ data: bases }, { data: derivatives }] = await Promise.all([
    supabase.from("base_models").select(BASE_COLUMNS).order("name"),
    supabase.from("ai_models").select("id,base_model_id").eq("status", "live").not("base_model_id", "is", null),
  ]);
  const counts = new Map<string, number>();
  for (const d of derivatives ?? []) {
    const key = d.base_model_id as string;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return ((bases ?? []) as unknown as BaseModelRow[]).map((b) => ({ ...b, derivativeCount: counts.get(b.id) ?? 0 }));
});

export type BaseModelListItem = Awaited<ReturnType<typeof listBaseModels>>[number];

export const getBaseModel = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => {
    if (!/^[a-z0-9-]{1,80}$/.test(data.id)) throw new Error("Invalid base model id");
    return data;
  })
  .handler(async ({ data }) => {
    const { publicSupabase } = await import("@/lib/supabase-public.server");
    const supabase = publicSupabase();
    const { data: base } = await supabase.from("base_models").select(BASE_COLUMNS).eq("id", data.id).maybeSingle();
    if (!base) return null;

    const { data: derivatives } = await supabase
      .from("ai_models")
      .select(
        "id,slug,name,tagline,base_version,finetune_method,sharpe,cagr,max_drawdown,win_rate,trust_tier,consistency_score,overfitting_risk,listed_at,active_users",
      )
      .eq("base_model_id", data.id)
      .eq("status", "live")
      .eq("visibility", "public")
      .order("listed_at", { ascending: false });

    return { ...(base as unknown as BaseModelRow), derivatives: derivatives ?? [] };
  });

export type BaseModelDetail = NonNullable<Awaited<ReturnType<typeof getBaseModel>>>;
