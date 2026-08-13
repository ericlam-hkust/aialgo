import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Full execution-chain state for every activation of the signed-in user. */
export const getExecutionOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: activations }, { data: signals }, { data: orders }, { data: accounts }] = await Promise.all([
      supabase
        .from("model_activations")
        .select(
          "id,model_id,status,mode,capital_allocation,max_position_size_pct,daily_loss_limit_pct,max_open_positions,kill_switch_drawdown_pct,stop_loss_pct,parameters,pnl,pnl_pct,peak_equity,paused_reason,signals_consumed,executions_count,last_signal_at,activated_at,broker_connection_id, model:ai_models(id,slug,name,asset_class,timeframe,interface_manifest)",
        )
        .eq("user_id", userId)
        .order("activated_at", { ascending: false }),
      supabase
        .from("execution_signals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("execution_orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("broker_connections")
        .select("id,broker_name,nickname,status,mode,currency,account_balance,is_default,last_synced_at,last_error"),
    ]);

    return {
      activations: activations ?? [],
      signals: signals ?? [],
      orders: orders ?? [],
      accounts: accounts ?? [],
    };
  });

export type ExecutionOverview = Awaited<ReturnType<typeof getExecutionOverview>>;

/** Advance the simulated signal → risk engine → order loop once. */
export const tickExecution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { runExecutionTick } = await import("@/lib/execution.server");
    const events = await runExecutionTick(context.supabase, context.userId);

    const alerts = events.filter((e) => e.status !== "passed");
    if (alerts.length) {
      const { notify } = await import("@/lib/notify.server");
      await notify(
        alerts.slice(0, 5).map((e) => ({
          userId: context.userId,
          kind: e.status === "killed" ? ("model_paused" as const) : ("signal_blocked" as const),
          title: e.status === "killed" ? `${e.modelName} kill switch triggered` : `${e.modelName} signal blocked`,
          body: e.reason ?? `${e.action} ${e.symbol} did not pass the risk engine.`,
          link: "/dashboard/execution",
        })),
      );
    }
    return { events };
  });

/** Kill switch: stop the model immediately and flatten its state. */
export const triggerKillSwitch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { activationId: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("model_activations")
      .update({
        status: "paused",
        paused_reason: "Kill switch pressed by you — all new signals are rejected.",
        paused_at: new Date().toISOString(),
      })
      .eq("id", data.activationId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Consumer-side usage metering for the current calendar month. */
export const getMyUsageMetering = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    const since = start.toISOString();

    const [{ data: activations }, { data: signals }, { data: orders }] = await Promise.all([
      supabase
        .from("model_activations")
        .select("id,model_id,activated_at,status, model:ai_models(name,slug)")
        .eq("user_id", userId),
      supabase.from("execution_signals").select("activation_id,status").eq("user_id", userId).gte("created_at", since),
      supabase.from("execution_orders").select("activation_id").eq("user_id", userId).gte("created_at", since),
    ]);

    const signalsBy = new Map<string, number>();
    const blockedBy = new Map<string, number>();
    for (const s of signals ?? []) {
      signalsBy.set(s.activation_id, (signalsBy.get(s.activation_id) ?? 0) + 1);
      if (s.status !== "passed") blockedBy.set(s.activation_id, (blockedBy.get(s.activation_id) ?? 0) + 1);
    }
    const ordersBy = new Map<string, number>();
    for (const o of orders ?? []) ordersBy.set(o.activation_id, (ordersBy.get(o.activation_id) ?? 0) + 1);

    const rows = (activations ?? []).map((a) => {
      const model = a.model as unknown as { name: string; slug: string } | null;
      return {
        activationId: a.id,
        modelName: model?.name ?? "Model",
        modelSlug: model?.slug ?? "",
        status: a.status,
        signals: signalsBy.get(a.id) ?? 0,
        blocked: blockedBy.get(a.id) ?? 0,
        executions: ordersBy.get(a.id) ?? 0,
        daysActive: Math.max(1, Math.floor((Date.now() - new Date(a.activated_at).getTime()) / 86_400_000)),
      };
    });

    return {
      periodStart: since,
      rows,
      totals: {
        signals: rows.reduce((n, r) => n + r.signals, 0),
        executions: rows.reduce((n, r) => n + r.executions, 0),
        blocked: rows.reduce((n, r) => n + r.blocked, 0),
        activeModels: rows.filter((r) => r.status === "active").length,
      },
    };
  });

/** Contributor-side breakdown of how subscribers are consuming their models. */
export const getSubscriberUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: contributor } = await supabase
      .from("contributor_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!contributor) return { models: [] };

    const { data: models } = await supabase
      .from("ai_models")
      .select("id,name,slug,price,pricing_model")
      .eq("contributor_id", contributor.id);
    const modelIds = (models ?? []).map((m) => m.id);
    if (!modelIds.length) return { models: [] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);

    const [{ data: activations }, { data: signals }] = await Promise.all([
      supabaseAdmin
        .from("model_activations")
        .select("id,model_id,user_id,status,activated_at,signals_consumed,executions_count")
        .in("model_id", modelIds),
      supabaseAdmin
        .from("execution_signals")
        .select("model_id,status")
        .in("model_id", modelIds)
        .gte("created_at", start.toISOString()),
    ]);

    const monthSignals = new Map<string, number>();
    const monthExecs = new Map<string, number>();
    for (const s of signals ?? []) {
      if (!s.model_id) continue;
      monthSignals.set(s.model_id, (monthSignals.get(s.model_id) ?? 0) + 1);
      if (s.status === "passed") monthExecs.set(s.model_id, (monthExecs.get(s.model_id) ?? 0) + 1);
    }

    return {
      models: (models ?? []).map((m) => {
        const rows = (activations ?? []).filter((a) => a.model_id === m.id);
        const subscribers = new Set(rows.map((r) => r.user_id)).size;
        const daysActive = rows.reduce(
          (n, r) => n + Math.max(1, Math.floor((Date.now() - new Date(r.activated_at).getTime()) / 86_400_000)),
          0,
        );
        return {
          id: m.id,
          name: m.name,
          slug: m.slug,
          subscribers,
          activeSubscribers: rows.filter((r) => r.status === "active").length,
          signalsThisMonth: monthSignals.get(m.id) ?? 0,
          executionsThisMonth: monthExecs.get(m.id) ?? 0,
          lifetimeSignals: rows.reduce((n, r) => n + Number(r.signals_consumed ?? 0), 0),
          lifetimeExecutions: rows.reduce((n, r) => n + Number(r.executions_count ?? 0), 0),
          subscriberDays: daysActive,
        };
      }),
    };
  });
