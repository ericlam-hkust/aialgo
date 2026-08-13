import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Disclosed broker referral offers. Ranking is never influenced by payout. */
export const listBrokerReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("broker_referrals")
      .select("id,broker,region,blurb,disclosure,referral_url,payout_note")
      .eq("active", true)
      .order("sort_order");
    return data ?? [];
  });

export const recordReferralClick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { partnerKey: string }) => data)
  .handler(async ({ data, context }) => {
    await context.supabase.from("referral_clicks").insert({ user_id: context.userId, partner_key: data.partnerKey });
    return { ok: true };
  });
