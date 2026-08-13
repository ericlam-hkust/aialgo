import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { contributorIdFor, periodKey } from "./contributor.server";

/** Contributor earnings console: sales, commission split and payout history. */
export const getContributorBilling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const contributorId = await contributorIdFor(supabase, userId);
    if (!contributorId) {
      return { contributor: null, transactions: [], payouts: [], profile: null, period: periodKey() };
    }

    const period = periodKey();
    const [{ data: profile }, { data: transactions }, { data: payouts }] = await Promise.all([
      supabase
        .from("contributor_profiles")
        .select("id,handle,display_name,payout_status,kyc_status,tax_form_status,stripe_account_id,payout_email")
        .eq("id", contributorId)
        .maybeSingle(),
      supabase
        .from("model_transactions")
        .select("id,model_name,kind,gross_amount,commission_amount,net_amount,commission_rate,currency,status,created_at")
        .eq("contributor_id", contributorId)
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("payout_batches")
        .select("id,period,amount,currency,status,paid_at,created_at")
        .eq("contributor_id", contributorId)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    return {
      contributor: contributorId,
      profile: profile ?? null,
      transactions: transactions ?? [],
      payouts: payouts ?? [],
      period,
    };
  });
