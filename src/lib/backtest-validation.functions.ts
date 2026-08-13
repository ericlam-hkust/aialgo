import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_PROTOCOL, FAILURE_REASONS as FAILURE_REASONS_MAP, type BacktestConfig, type BacktestProtocol } from "@/lib/backtest-protocol";
import { suggestPricing } from "@/lib/pricing-suggestion";

/** Reads the admin-configured global protocol, falling back to defaults. */
export const getBacktestProtocol = createServerFn({ method: "GET" }).handler(async () => {
  const { publicSupabase } = await import("@/lib/supabase-public.server");
  const { data } = await publicSupabase().from("platform_settings").select("value").eq("key", "backtest_protocol").maybeSingle();
  return { ...DEFAULT_PROTOCOL, ...((data?.value ?? {}) as Partial<BacktestProtocol>) } as BacktestProtocol;
});

export const saveBacktestProtocol = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { protocol: BacktestProtocol }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "backtest_protocol", value: data.protocol as never }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Confirms the platform holds the history a contributor's configuration needs. */
export const checkDataAvailability = createServerFn({ method: "POST" })
  .inputValidator((data: { symbols: string[]; timeframe: string }) => data)
  .handler(async ({ data }) => {
    const { publicSupabase } = await import("@/lib/supabase-public.server");
    const { data: feeds } = await publicSupabase()
      .from("data_catalog")
      .select("symbol,display_name,market,timeframes,coverage_start,coverage_end,update_frequency,row_count")
      .in("symbol", data.symbols.length ? data.symbols : ["__none__"]);

    const rows = feeds ?? [];
    return data.symbols.map((symbol) => {
      const feed = rows.find((f) => f.symbol === symbol);
      if (!feed) {
        return { symbol, ok: false, message: `No historical feed for ${symbol} yet — request it from the Data Library.` };
      }
      const hasTf = (feed.timeframes as string[]).includes(data.timeframe);
      return {
        symbol,
        ok: hasTf,
        coverageStart: feed.coverage_start,
        coverageEnd: feed.coverage_end,
        updateFrequency: feed.update_frequency,
        rowCount: Number(feed.row_count),
        timeframes: feed.timeframes as string[],
        message: hasTf
          ? `${feed.display_name} ${data.timeframe} data available from ${feed.coverage_start} to ${feed.coverage_end}.`
          : `${feed.display_name} has no ${data.timeframe} candles — available: ${(feed.timeframes as string[]).join(", ")}.`,
      };
    });
  });

function biasFor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 1000;
  return (h % 100) / 100; // 0..1
}

/** Contributor submits a model for the official platform validation backtest. */
export const submitForValidation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { modelId: string; config: BacktestConfig }) => {
    if (!data.config.universe.length) throw new Error("Pick at least one instrument.");
    if (!data.config.dataInputs.length) throw new Error("Select the data inputs your model consumes.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const protocol = await getBacktestProtocol();

    const { data: model } = await supabase
      .from("ai_models")
      .select("id,name,slug,user_id")
      .eq("id", data.modelId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!model) throw new Error("Model not found.");

    const { data: version } = await supabase
      .from("model_versions")
      .select("version")
      .eq("model_id", data.modelId)
      .eq("is_current", true)
      .maybeSingle();

    const { data: job, error } = await supabase
      .from("backtest_jobs")
      .insert({
        model_id: data.modelId,
        user_id: userId,
        kind: "validation",
        model_version: version?.version ?? "1.0.0",
        status: "running",
        stage: "interface_validation",
        progress: 5,
        stage_message: "Checking the model interface contract…",
        config: data.config as never,
        protocol: protocol as never,
        eta_seconds: 180,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabase
      .from("ai_models")
      .update({
        status: "backtest_validation",
        backtest_config: data.config as never,
        validation_job_id: job.id,
        data_source_kind: data.config.dataSourceKind ?? "platform",
        data_source_label: data.config.dataSourceLabel ?? "AlgoForge platform market data",
        data_source_id: data.config.dataSourceId ?? null,
      })
      .eq("id", data.modelId);
    await supabase.from("model_submissions").upsert(
      { model_id: data.modelId, user_id: userId, status: "backtest_validation" },
      { onConflict: "model_id" },
    );

    return { jobId: job.id };
  });

/** Contributor sandbox run — unofficial, never shown publicly. 3 free runs per model. */
export const runSandboxBacktest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { modelId: string; config: BacktestConfig }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: model } = await supabase
      .from("ai_models")
      .select("id,status,sandbox_runs_used")
      .eq("id", data.modelId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!model) throw new Error("Model not found.");

    const submitted = model.status !== "draft";
    if (!submitted && (model.sandbox_runs_used ?? 0) >= 3) {
      throw new Error("Free sandbox runs used up. Submit the model for validation to unlock unlimited runs.");
    }

    const protocol = await getBacktestProtocol();
    const { data: job, error } = await supabase
      .from("backtest_jobs")
      .insert({
        model_id: data.modelId,
        user_id: userId,
        kind: "sandbox",
        status: "running",
        stage: "data_check",
        progress: 20,
        stage_message: "Loading requested dataset…",
        config: data.config as never,
        protocol: { ...protocol, ...(data.config.startDate ? { inSampleStart: data.config.startDate } : {}), ...(data.config.endDate ? { holdoutEnd: data.config.endDate } : {}) } as never,
        eta_seconds: 60,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (!submitted) {
      await supabase
        .from("ai_models")
        .update({ sandbox_runs_used: (model.sandbox_runs_used ?? 0) + 1 })
        .eq("id", data.modelId);
    }
    return { jobId: job.id, runsUsed: (model.sandbox_runs_used ?? 0) + (submitted ? 0 : 1), unlimited: submitted };
  });

/**
 * Advances a running job based on elapsed time and materialises the report when
 * it reaches the end. The client polls this while showing the progress bar.
 */
export const advanceBacktestJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { jobId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: job } = await supabase.from("backtest_jobs").select("*").eq("id", data.jobId).maybeSingle();
    if (!job) throw new Error("Job not found.");
    if (job.status === "completed" || job.status === "failed") return job;

    const elapsed = (Date.now() - new Date(job.started_at).getTime()) / 1000;
    const total = job.eta_seconds || 120;
    const ratio = Math.min(1, elapsed / total);

    let stage = "interface_validation";
    let message = "Checking the model interface contract…";
    if (ratio > 0.15) {
      stage = "data_check";
      message = "Verifying historical data coverage…";
    }
    if (ratio > 0.3) {
      stage = "running";
      message = "Replaying bars with slippage, fees and spread…";
    }

    if (ratio < 1) {
      const { data: updated } = await supabase
        .from("backtest_jobs")
        .update({ stage, progress: Math.round(5 + ratio * 90), stage_message: message })
        .eq("id", data.jobId)
        .select("*")
        .single();
      return updated;
    }

    const { simulateBacktest } = await import("@/lib/backtest-sim.server");
    const config = job.config as unknown as BacktestConfig;
    const protocol = { ...DEFAULT_PROTOCOL, ...(job.protocol as unknown as BacktestProtocol) };
    const report = simulateBacktest({ seed: job.id, config, protocol, bias: biasFor(job.id) });

    const failed = !report.passed;
    const { data: finished } = await supabase
      .from("backtest_jobs")
      .update({
        status: failed ? "failed" : "completed",
        stage: failed ? "failed" : "results",
        progress: 100,
        stage_message: failed ? "Validation failed" : "Report generated",
        failure_code: report.failureCode ?? null,
        failure_reason: report.failureCode ? (FAILURE_REASONS_MAP[report.failureCode] ?? null) : null,
        results: report as never,
        completed_at: new Date().toISOString(),
      })
      .eq("id", data.jobId)
      .select("*")
      .single();

    if (job.kind !== "sandbox" && job.model_id) {
      const nextRevalidation = new Date();
      nextRevalidation.setMonth(nextRevalidation.getMonth() + (protocol.revalidationMonths || 3));
      const pricing = suggestPricing({
        sharpe: report.metrics.sharpe,
        maxDrawdown: report.metrics.maxDrawdown,
        winRate: report.metrics.winRate,
        profitFactor: report.metrics.profitFactor,
        consistencyScore: report.walkForward?.consistencyScore ?? 0,
        trades: report.metrics.trades,
        overfittingRisk: Boolean(report.walkForward?.overfittingRisk),
        cagr: report.metrics.cagr,
      });
      await supabase
        .from("ai_models")
        .update({
          status: failed ? "rejected" : "live",
          ...(failed
            ? {}
            : {
                listed_at: new Date().toISOString(),
                sharpe: report.metrics.sharpe,
                max_drawdown: report.metrics.maxDrawdown,
                win_rate: report.metrics.winRate,
                loss_rate: Math.max(0, Math.round((100 - report.metrics.winRate) * 100) / 100),
                profit_factor: report.metrics.profitFactor,
                total_trades: report.metrics.trades,
                total_return: report.metrics.totalReturn,
                cagr: report.metrics.cagr,
                backtest_ran_at: new Date().toISOString(),
                last_validated_at: new Date().toISOString(),
                next_revalidation_at: nextRevalidation.toISOString(),
                divergence_flagged: false,
                overfitting_risk: Boolean(report.walkForward?.overfittingRisk),
                consistency_score: report.walkForward?.consistencyScore ?? 0,
                suggested_price: pricing.suggested,
                pricing_score: pricing.score,
              }),

        })
        .eq("id", job.model_id);

      await supabase
        .from("model_submissions")
        .upsert(
          {
            model_id: job.model_id,
            user_id: userId,
            status: failed ? "rejected" : "live",
            reviewer_notes: failed ? finished?.failure_reason ?? "Validation failed" : "Passed platform backtest.",
            reviewed_at: new Date().toISOString(),
          },
          { onConflict: "model_id" },
        );

      if (!failed) {
        await supabase.from("model_metrics").insert({
          model_id: job.model_id,
          kind: "backtest",
          series: report.equity.map((p) => ({ t: p.t, v: p.v })) as never,
          monthly_returns: report.monthly as never,
          stats: report.metrics as never,
        });
      }

      const { notify } = await import("@/lib/notify.server");
      await notify({
        userId,
        kind: failed ? "backtest_failed" : "backtest_passed",
        title: failed ? "Backtest validation failed" : "Backtest validation passed",
        body: failed
          ? finished?.failure_reason ?? "See the report for details."
          : `Sharpe ${report.metrics.sharpe} · CAGR ${report.metrics.cagr}% — your model is now listed.`,
        link: `/dashboard/models/backtests`,
      });
    }

    return finished;
  });

export const getBacktestJob = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { jobId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: job } = await context.supabase
      .from("backtest_jobs")
      .select("*, model:ai_models(id,name,slug,status)")
      .eq("id", data.jobId)
      .maybeSingle();
    return job;
  });

export const listMyBacktestJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("backtest_jobs")
      .select("id,model_id,kind,model_version,status,stage,progress,stage_message,failure_code,failure_reason,config,eta_seconds,started_at,completed_at,created_at,results,model:ai_models(id,name,slug,status)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export type BacktestJobRow = Awaited<ReturnType<typeof listMyBacktestJobs>>[number];

/** Public: the verified report attached to a live listing. */
export const getVerifiedReport = createServerFn({ method: "GET" })
  .inputValidator((data: { modelId: string }) => data)
  .handler(async ({ data }) => {
    const { publicSupabase } = await import("@/lib/supabase-public.server");
    const { data: job } = await publicSupabase()
      .from("backtest_jobs")
      .select("id,model_version,results,completed_at,kind,status")
      .eq("model_id", data.modelId)
      .eq("status", "completed")
      .neq("kind", "sandbox")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return job ?? null;
  });

export const appealValidation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { modelId: string; jobId?: string; message: string }) => {
    if (data.message.trim().length < 20) throw new Error("Please describe the issue in at least 20 characters.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("model_appeals").insert({
      model_id: data.modelId,
      job_id: data.jobId ?? null,
      user_id: context.userId,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyAppeals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("model_appeals")
      .select("*, model:ai_models(name,slug)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

/**
 * Quarterly re-validation plus continuous divergence monitoring. Models whose
 * live 30d return deviates badly from the verified backtest are flagged, and
 * badly failing re-validations are auto-unlisted with an appeals path.
 */
export const runScheduledRevalidations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const protocol = await getBacktestProtocol();
    const { data: models } = await supabase
      .from("ai_models")
      .select("id,name,user_id,cagr,live_return_30d,backtest_config,next_revalidation_at,status")
      .eq("status", "live");

    const { simulateBacktest } = await import("@/lib/backtest-sim.server");
    const { notify } = await import("@/lib/notify.server");
    const revalidated: string[] = [];
    const unlisted: string[] = [];
    const flagged: string[] = [];

    for (const model of models ?? []) {
      const expected30d = Number(model.cagr) / 12;
      const live30d = Number(model.live_return_30d);
      const deviation = Math.abs(expected30d) > 0.01 ? ((expected30d - live30d) / Math.abs(expected30d)) * 100 : 0;
      if (deviation > protocol.divergenceThresholdPct) {
        flagged.push(model.name);
        await supabase.from("ai_models").update({ divergence_flagged: true }).eq("id", model.id);
      }

      const due = !model.next_revalidation_at || new Date(model.next_revalidation_at) <= new Date();
      if (!due) continue;

      const config = (model.backtest_config ?? {}) as unknown as BacktestConfig;
      const seed = `${model.id}-${new Date().toISOString().slice(0, 7)}`;
      const report = simulateBacktest({
        seed,
        config: { assetClass: "stocks", universe: ["SPY"], timeframe: "1d" as const, signalFrequency: "daily", minimumCapital: 1000, dataInputs: ["ohlcv"], ...(config as Partial<BacktestConfig>) } as BacktestConfig,
        protocol,
        bias: biasFor(seed),
      });

      const { data: job } = await supabase
        .from("backtest_jobs")
        .insert({
          model_id: model.id,
          user_id: model.user_id ?? userId,
          kind: "revalidation",
          status: report.passed ? "completed" : "failed",
          stage: report.passed ? "results" : "failed",
          progress: 100,
          stage_message: report.passed ? "Re-validation passed" : "Re-validation failed",
          failure_code: report.failureCode ?? null,
          failure_reason: report.failureCode ? FAILURE_REASONS_MAP[report.failureCode] ?? null : null,
          config: config as never,
          protocol: protocol as never,
          results: report as never,
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      const next = new Date();
      next.setMonth(next.getMonth() + (protocol.revalidationMonths || 3));
      const badFail = !report.passed && report.metrics.maxDrawdown > protocol.maxAllowedDrawdownPct * 1.2;

      await supabase
        .from("ai_models")
        .update({
          last_validated_at: new Date().toISOString(),
          next_revalidation_at: next.toISOString(),
          overfitting_risk: Boolean(report.walkForward?.overfittingRisk),
          consistency_score: report.walkForward?.consistencyScore ?? 0,
          ...(badFail ? { status: "delisted" as const } : {}),
        })
        .eq("id", model.id);

      revalidated.push(model.name);
      if (badFail) unlisted.push(model.name);

      if (model.user_id) {
        await notify({
          userId: model.user_id,
          kind: badFail ? "model_unlisted" : "revalidation",
          title: badFail ? `${model.name} was auto-unlisted` : `${model.name} re-validation ${report.passed ? "passed" : "failed"}`,
          body: badFail
            ? "Live risk exceeded the platform limit during re-validation. You can appeal from the backtest queue."
            : `Sharpe ${report.metrics.sharpe} · max drawdown ${report.metrics.maxDrawdown}%.`,
          link: `/dashboard/models/backtests?job=${job?.id ?? ""}`,
        });
      }
    }

    return { revalidated, unlisted, flagged };
  });
