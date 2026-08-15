import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = (v: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(v)) throw new Error("Invalid id");
  return v;
};

/**
 * Switches a listing between builder-set and platform-set (automatic) pricing.
 * Switching to platform mode immediately runs one repricing cycle.
 */
export const setListingPricingMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { listingId: string; mode: "builder" | "platform" }) => {
    if (data.mode !== "builder" && data.mode !== "platform") throw new Error("Invalid pricing mode");
    return { listingId: uuid(data.listingId), mode: data.mode };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: owned } = await supabase
      .from("ai_models")
      .select("id")
      .eq("id", data.listingId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!owned) throw new Error("Listing not found.");

    const { error } = await supabase
      .from("ai_models")
      .update({ pricing_mode: data.mode, price_set_at: new Date().toISOString() })
      .eq("id", data.listingId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    if (data.mode === "platform") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { refreshCommunityAndPrice } = await import("@/lib/community.server");
      const result = await refreshCommunityAndPrice(supabaseAdmin as never, data.listingId);
      return { ok: true, mode: data.mode, price: result?.auto.price ?? null, summary: result?.auto.summary ?? null };
    }
    return { ok: true, mode: data.mode, price: null, summary: null };
  });

/** Owner-triggered repricing cycle for a listing already on platform pricing. */
export const repriceListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { listingId: string }) => ({ listingId: uuid(data.listingId) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: listing } = await supabase
      .from("ai_models")
      .select("id,pricing_mode")
      .eq("id", data.listingId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!listing) throw new Error("Listing not found.");
    if (listing.pricing_mode !== "platform") throw new Error("Switch to platform pricing first.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { refreshCommunityAndPrice } = await import("@/lib/community.server");
    const result = await refreshCommunityAndPrice(supabaseAdmin as never, data.listingId);
    return {
      price: result?.auto.price ?? null,
      changed: result?.changed ?? false,
      summary: result?.auto.summary ?? "",
      groups: result?.auto.groups ?? [],
    };
  });
