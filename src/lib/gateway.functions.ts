import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  contributorIdFor,
  deriveTrustTier,
  generateGatewaySecret,
  hashSecret,
  percentile,
  periodKey,
} from "./gateway.server";
import type { SignalPlanKey } from "./monetization";

/** Contributor console for Tier 2 (remote) models: endpoints, health, signal log. */
export const getGatewayConsole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const contributorId = await contributorIdFor(supabase, userId);
    if (!contributorId) return { contributor: null, models: [], events: [], usage: null, billing: null };

    const [{ data: models }, { data: events }, { data: usage }, { data: billing }] = await Promise.all([
      supabase
        .from("ai_models")
        .select("id,name,slug,status,hosting_mode,trust_tier,declared_frequency,measured_latency_ms,live_since,gateway_secret_hash,active_users")
        .eq("contributor_id", contributorId)
        .eq("hosting_mode", "remote")
        .order("created_at", { ascending: false }),
      supabase
        .from("signal_events")
        .select("id,model_id,symbol,action,received_at,validation_ok,validation_error,subscribers_reached,latency_ms,transport")
        .eq("contributor_id", contributorId)
        .order("received_at", { ascending: false })
        .limit(60),
      supabase
        .from("signal_api_usage")
        .select("period,plan,calls,included_calls,overage_amount,flat_amount,p95_latency_ms")
        .eq("contributor_id", contributorId)
        .eq("period", periodKey())
        .maybeSingle(),
      supabase
        .from("contributor_billing")
        .select("signal_plan,pending_signal_plan,compute_plan,gpu_spend_cap")
        .eq("contributor_id", contributorId)
        .maybeSingle(),
    ]);

    const ids = (models ?? []).map((m) => m.id);
    const { data: statuses } = ids.length
      ? await supabase.from("gateway_status").select("*").in("model_id", ids)
      : { data: [] as any[] };
    const statusById = new Map((statuses ?? []).map((s: any) => [s.model_id, s]));

    return {
      contributor: contributorId,
      billing,
      usage,
      events: events ?? [],
      models: (models ?? []).map((m) => {
        const lat = (events ?? []).filter((e) => e.model_id === m.id).map((e) => Number(e.latency_ms ?? 0));
        return {
          ...m,
          hasSecret: Boolean(m.gateway_secret_hash),
          gateway_secret_hash: undefined,
          status_row: statusById.get(m.id) ?? null,
          p50: percentile(lat, 50),
          p95: percentile(lat, 95),
          derivedTier: deriveTrustTier({
            hosting_mode: m.hosting_mode,
            live_since: m.live_since,
            signalDays: 0,
          }),
        };
      }),
    };
  });

/** Issues a new gateway secret. The plaintext is returned exactly once. */
export const rotateGatewaySecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { modelId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const contributorId = await contributorIdFor(supabase, userId);
    if (!contributorId) throw new Error("Create a contributor profile first");

    const secret = generateGatewaySecret();
    const { error } = await supabase
      .from("ai_models")
      .update({ gateway_secret_hash: await hashSecret(secret) })
      .eq("id", data.modelId)
      .eq("contributor_id", contributorId);
    if (error) throw new Error(error.message);
    return { secret };
  });

/** Switches the Signal API plan. HFT-classified models are forced onto Remote HFT. */
export const setSignalPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { plan: SignalPlanKey }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const contributorId = await contributorIdFor(supabase, userId);
    if (!contributorId) throw new Error("Create a contributor profile first");

    const { data: hft } = await supabase
      .from("ai_models")
      .select("id")
      .eq("contributor_id", contributorId)
      .eq("hosting_mode", "remote")
      .eq("declared_frequency", "hft")
      .limit(1);

    if ((hft ?? []).length > 0 && data.plan !== "remote_hft") {
      throw new Error("You run an HFT-classified model — it requires the Remote HFT tier for dedicated gateway capacity.");
    }

    const { error } = await supabase
      .from("contributor_billing")
      .upsert({ contributor_id: contributorId, signal_plan: data.plan, updated_at: new Date().toISOString() }, { onConflict: "contributor_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setGatewayPaused = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { modelId: string; paused: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const contributorId = await contributorIdFor(supabase, userId);
    if (!contributorId) throw new Error("Create a contributor profile first");

    const { data: owned } = await supabase
      .from("ai_models")
      .select("id")
      .eq("id", data.modelId)
      .eq("contributor_id", contributorId)
      .maybeSingle();
    if (!owned) throw new Error("Model not found");

    const { error } = await supabase.from("gateway_status").upsert(
      {
        model_id: data.modelId,
        status: data.paused ? "paused" : "online",
        paused_reason: data.paused ? "Paused by contributor" : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "model_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
