import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listDataCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { publicSupabase } = await import("@/lib/supabase-public.server");
  const { data } = await publicSupabase()
    .from("data_catalog")
    .select("*")
    .order("asset_class", { ascending: true })
    .order("symbol", { ascending: true });
  return data ?? [];
});

export type DataFeed = Awaited<ReturnType<typeof listDataCatalog>>[number];

export const requestDataFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { assetClass: "stocks" | "crypto" | "forex" | "futures"; symbol: string; timeframe: string; providerHint?: string; reason?: string }) => {
      if (!data.symbol.trim()) throw new Error("Symbol is required.");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("data_requests").insert({
      user_id: context.userId,
      asset_class: data.assetClass,
      symbol: data.symbol.trim().toUpperCase(),
      timeframe: data.timeframe,
      provider_hint: data.providerHint ?? null,
      reason: data.reason ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyDataRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("data_requests")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });
