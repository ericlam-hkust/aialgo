import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { contributorIdFor, periodKey } from "./gateway.server";
import type { ComputePlanKey } from "./monetization";

/** Contributor cost + earnings console: compute plan, GPU metering, commission split. */
export const getContributorBilling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const contributorId = await contributorIdFor(supabase, userId);
    if (!contributorId) {
      return { contributor: null, billing: null, compute: [], signal: null, transactions: [], payouts: [], profile: null };
    }

    const period = periodKey();
    const [{ data: profile }, { data: billing }, { data: compute }, { data: signal }, { data: transactions }, { data: payouts }] =
      await Promise.all([
        supabase
          .from("contributor_profiles")
          .select("id,handle,display_name,payout_status,kyc_status,tax_form_status,stripe_account_id,payout_email")
          .eq("id", contributorId)
          .maybeSingle(),
        supabase
          .from("contributor_billing")
          .select("compute_plan,signal_plan,gpu_spend_cap,pending_signal_plan")
          .eq("contributor_id", contributorId)
          .maybeSingle(),
        supabase
          .from("compute_usage")
          .select("period,model_id,cpu_hours,gpu_hours,plan_cost,gpu_cost,platform_cost")
          .eq("contributor_id", contributorId)
          .order("period", { ascending: false })
          .limit(24),
        supabase
          .from("signal_api_usage")
          .select("period,plan,calls,included_calls,overage_amount,flat_amount,p95_latency_ms")
          .eq("contributor_id", contributorId)
          .eq("period", period)
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
      billing: billing ?? null,
      compute: compute ?? [],
      signal: signal ?? null,
      transactions: transactions ?? [],
      payouts: payouts ?? [],
      period,
    };
  });

export const setComputePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { plan: ComputePlanKey }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const contributorId = await contributorIdFor(supabase, userId);
    if (!contributorId) throw new Error("Create a contributor profile first");
    const { error } = await supabase
      .from("contributor_billing")
      .upsert(
        { contributor_id: contributorId, compute_plan: data.plan, updated_at: new Date().toISOString() },
        { onConflict: "contributor_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setGpuSpendCap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { cap: number }) => {
    if (!Number.isFinite(data.cap) || data.cap < 0 || data.cap > 100000) throw new Error("Cap must be between 0 and 100,000");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const contributorId = await contributorIdFor(supabase, userId);
    if (!contributorId) throw new Error("Create a contributor profile first");
    const { error } = await supabase
      .from("contributor_billing")
      .upsert(
        { contributor_id: contributorId, gpu_spend_cap: data.cap, updated_at: new Date().toISOString() },
        { onConflict: "contributor_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
