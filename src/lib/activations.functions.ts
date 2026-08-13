import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { REVIEW_MIN_DAYS } from "@/lib/model-badges";

const ACTIVATION_COLUMNS =
  "id,model_id,mode,status,capital_allocation,max_position_size_pct,daily_loss_limit_pct,stop_loss_pct,kill_switch_drawdown_pct,peak_equity,paused_reason,paused_at,pinned_version,auto_upgrade,pnl,pnl_pct,activated_at";

/** Consumer view: every model the signed-in user has activated, with version state. */
export const listMyActivationsDetailed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: activations } = await supabase
      .from("model_activations")
      .select(
        `${ACTIVATION_COLUMNS}, model:ai_models(id,slug,name,asset_class,strategy_type,timeframe,risk_level,sharpe,cagr,live_return_30d,status,listed_at)`,
      )
      .eq("user_id", userId)
      .order("activated_at", { ascending: false });

    const rows = activations ?? [];
    const modelIds = [...new Set(rows.map((r) => r.model_id))];
    const { data: versions } = modelIds.length
      ? await supabase
          .from("model_versions")
          .select("id,model_id,version,changelog,is_current,released_at")
          .in("model_id", modelIds)
          .order("released_at", { ascending: false })
      : { data: [] as never[] };

    const byModel = new Map<string, NonNullable<typeof versions>>();
    for (const v of versions ?? []) {
      const list = byModel.get(v.model_id) ?? [];
      list.push(v);
      byModel.set(v.model_id, list);
    }

    return rows.map((a) => {
      const list = byModel.get(a.model_id) ?? [];
      const current = list.find((v) => v.is_current) ?? list[0] ?? null;
      const running = a.pinned_version ?? current?.version ?? null;
      return {
        ...a,
        versions: list,
        currentVersion: current,
        runningVersion: running,
        updateAvailable: Boolean(current && running && current.version !== running),
      };
    });
  });

export type ActivationRow = Awaited<ReturnType<typeof listMyActivationsDetailed>>[number];

/** Kill-switch and risk limits per activation. */
export const updateActivationRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      activationId: string;
      killSwitchDrawdownPct: number;
      dailyLossLimitPct: number;
      maxPositionSizePct: number;
      stopLossPct: number;
    }) => {
      if (data.killSwitchDrawdownPct <= 0 || data.killSwitchDrawdownPct > 100)
        throw new Error("Kill-switch drawdown must be between 0 and 100%.");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("model_activations")
      .update({
        kill_switch_drawdown_pct: data.killSwitchDrawdownPct,
        daily_loss_limit_pct: data.dailyLossLimitPct,
        max_position_size_pct: data.maxPositionSizePct,
        stop_loss_pct: data.stopLossPct,
      })
      .eq("id", data.activationId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Pin to a specific version, or follow the contributor's latest release. */
export const setActivationVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { activationId: string; version: string | null; autoUpgrade: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("model_activations")
      .update({ pinned_version: data.autoUpgrade ? null : data.version, auto_upgrade: data.autoUpgrade })
      .eq("id", data.activationId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Resume a model that a kill-switch or deviation guard paused. */
export const resumeActivation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { activationId: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("model_activations")
      .update({ status: "active", paused_reason: null, paused_at: null, peak_equity: 0 })
      .eq("id", data.activationId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Evaluates both guards for the signed-in user's activations:
 *  1. kill-switch — pause when drawdown from peak equity exceeds the user's limit
 *  2. deviation   — pause when live 30d return is >30% below the backtest expectation
 * Subscribers get an in-app + email notification for every auto-pause.
 */
export const evaluateRiskGuards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: activations } = await supabase
      .from("model_activations")
      .select(
        "id,model_id,status,capital_allocation,peak_equity,pnl,pnl_pct,kill_switch_drawdown_pct, model:ai_models(name,slug,cagr,live_return_30d)",
      )
      .eq("user_id", userId)
      .eq("status", "active");

    const paused: { id: string; reason: string; name: string; slug: string }[] = [];

    for (const a of activations ?? []) {
      const model = a.model as { name: string; slug: string; cagr: number; live_return_30d: number } | null;
      const capital = Number(a.capital_allocation) || 0;
      const equity = capital + Number(a.pnl ?? 0);
      const peak = Math.max(Number(a.peak_equity ?? 0), equity, capital);
      const drawdownPct = peak > 0 ? ((peak - equity) / peak) * 100 : 0;

      const expected30d = (Number(model?.cagr ?? 0) / 12) || 0;
      const live30d = Number(model?.live_return_30d ?? 0);
      const deviationBreach =
        Math.abs(expected30d) > 0.01 && (expected30d - live30d) / Math.abs(expected30d) > 0.3;

      let reason: string | null = null;
      if (drawdownPct > Number(a.kill_switch_drawdown_pct ?? 100)) {
        reason = `Kill switch: drawdown ${drawdownPct.toFixed(1)}% exceeded your ${Number(
          a.kill_switch_drawdown_pct,
        ).toFixed(1)}% limit.`;
      } else if (deviationBreach) {
        reason = `Live performance (${live30d.toFixed(2)}% 30d) deviates more than 30% from the verified backtest (${expected30d.toFixed(
          2,
        )}% expected).`;
      }

      if (reason) {
        await supabase
          .from("model_activations")
          .update({ status: "paused", paused_reason: reason, paused_at: new Date().toISOString(), peak_equity: peak })
          .eq("id", a.id)
          .eq("user_id", userId);
        paused.push({ id: a.id, reason, name: model?.name ?? "Model", slug: model?.slug ?? "" });
      } else if (peak > Number(a.peak_equity ?? 0)) {
        await supabase.from("model_activations").update({ peak_equity: peak }).eq("id", a.id).eq("user_id", userId);
      }
    }

    if (paused.length) {
      const { notify } = await import("@/lib/notify.server");
      await notify(
        paused.map((p) => ({
          userId,
          kind: "model_paused" as const,
          title: `${p.name} was auto-paused`,
          body: p.reason,
          link: `/dashboard/my-models`,
        })),
      );
    }

    return { paused };
  });

/** A rating is only allowed after 7+ days of running the model. */
export const getReviewEligibility = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { modelId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: activation }, { data: review }] = await Promise.all([
      supabase
        .from("model_activations")
        .select("activated_at")
        .eq("user_id", userId)
        .eq("model_id", data.modelId)
        .order("activated_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("model_reviews")
        .select("id,rating,comment")
        .eq("user_id", userId)
        .eq("model_id", data.modelId)
        .maybeSingle(),
    ]);

    const days = activation
      ? Math.floor((Date.now() - new Date(activation.activated_at).getTime()) / 86_400_000)
      : 0;
    return {
      hasActivation: Boolean(activation),
      daysActive: days,
      minDays: REVIEW_MIN_DAYS,
      eligible: Boolean(activation) && days >= REVIEW_MIN_DAYS,
      existingReview: review ?? null,
    };
  });
