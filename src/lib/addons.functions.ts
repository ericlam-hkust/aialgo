import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPlanTier } from "./entitlements.server";

/** Data feed add-ons: bundled with the user's plan or purchasable per feed. */
export const getDataAddons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: catalog }, { data: mine }, tier] = await Promise.all([
      supabase.from("data_addons").select("*").order("sort_order"),
      supabase.from("user_data_addons").select("id,addon_key,scope,model_id,status,started_at").eq("user_id", userId),
      getPlanTier(supabase, userId),
    ]);
    return { tier, catalog: catalog ?? [], mine: mine ?? [] };
  });

export const toggleDataAddon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { addonKey: string; enable: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.enable) {
      const { error } = await supabase
        .from("user_data_addons")
        .update({ status: "cancelled" })
        .eq("user_id", userId)
        .eq("addon_key", data.addonKey);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const [{ data: addon }, tier] = await Promise.all([
      supabase.from("data_addons").select("key,hft_required,bundled_in,price").eq("key", data.addonKey).maybeSingle(),
      getPlanTier(supabase, userId),
    ]);
    if (!addon) throw new Error("Unknown data feed");
    if (addon.hft_required && tier === "free") {
      throw new Error("Premium tick data requires a Pro or Desk plan.");
    }

    const { error } = await supabase.from("user_data_addons").upsert(
      { user_id: userId, addon_key: data.addonKey, scope: "account", status: "active", started_at: new Date().toISOString() },
      { onConflict: "user_id,addon_key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true, bundled: (addon.bundled_in ?? []).includes(tier) };
  });
