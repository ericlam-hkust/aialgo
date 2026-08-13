import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ModelListingStatus } from "@/lib/marketplace";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden — admin access required.");
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return { isAdmin: false as const };

    const [{ data: queue }, { data: transactions }, { data: contributors }, { data: models }, { data: settings }] =
      await Promise.all([
        supabase
          .from("model_submissions")
          .select("*, model:ai_models(id,name,slug,asset_class,strategy_type,price,pricing_model,risk_level)")
          .order("created_at", { ascending: false }),
        supabase
          .from("model_transactions")
          .select("id,model_name,gross_amount,commission_amount,net_amount,currency,created_at,status")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("contributor_profiles")
          .select("id,handle,display_name,verified,payout_status,country,created_at")
          .order("created_at", { ascending: false }),
        supabase.from("ai_models").select("id,name,slug,status,active_users,price,pricing_model"),
        supabase.from("platform_settings").select("key,value").eq("key", "commission").maybeSingle(),
      ]);

    return {
      isAdmin: true as const,
      queue: queue ?? [],
      transactions: transactions ?? [],
      contributors: contributors ?? [],
      models: models ?? [],
      commissionRate: Number((settings?.value as { rate?: number } | null)?.rate ?? 0.2),
    };
  });

export const reviewSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { submissionId: string; modelId: string; status: ModelListingStatus; notes?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { error } = await supabase
      .from("model_submissions")
      .update({
        status: data.status,
        reviewer_notes: data.notes ?? null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.submissionId);
    if (error) throw new Error(error.message);

    await supabase
      .from("ai_models")
      .update({
        status: data.status,
        ...(data.status === "live" ? { listed_at: new Date().toISOString() } : {}),
      })
      .eq("id", data.modelId);

    const { data: model } = await supabase
      .from("ai_models")
      .select("name,slug,user_id")
      .eq("id", data.modelId)
      .maybeSingle();
    if (model?.user_id) {
      const { notify } = await import("@/lib/notify.server");
      await notify({
        userId: model.user_id,
        kind: "review_status",
        title: `${model.name}: review status is now ${String(data.status).replace(/_/g, " ")}`,
        body: data.notes ?? "Track progress from your contributor dashboard.",
        link: "/dashboard/models",
      });
    }

    return { ok: true };
  });

/** Marks a payout batch as paid and notifies the contributor. */
export const markPayoutPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { payoutId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payout, error } = await supabaseAdmin
      .from("payout_batches")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", data.payoutId)
      .select("amount,currency,period,contributor_id")
      .maybeSingle();
    if (error) throw new Error(error.message);

    const { data: contributor } = await supabaseAdmin
      .from("contributor_profiles")
      .select("user_id")
      .eq("id", payout?.contributor_id ?? "")
      .maybeSingle();
    if (contributor?.user_id) {
      const { notify } = await import("@/lib/notify.server");
      await notify({
        userId: contributor.user_id,
        kind: "payout_sent",
        title: `Payout sent — ${payout?.period}`,
        body: `${payout?.amount} ${payout?.currency} is on its way to your payout account.`,
        link: "/dashboard/models/payouts",
      });
    }
    return { ok: true };
  });

export const setCommissionRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { rate: number }) => {
    if (data.rate < 0 || data.rate > 0.5) throw new Error("Commission must be between 0% and 50%");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "commission", value: { rate: data.rate }, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setContributorVerified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contributorId: string; verified: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("contributor_profiles")
      .update({ verified: data.verified })
      .eq("id", data.contributorId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
