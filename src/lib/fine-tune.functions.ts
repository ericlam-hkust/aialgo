import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_PROTOCOL, type BacktestConfig, type BacktestProtocol } from "@/lib/backtest-protocol";
import { checkResources, type ResourceSpec } from "@/lib/base-models";

export type FineTuneParams = {
  entryThreshold: number;
  exitThreshold: number;
  trainingWindowMonths: number;
  epochs: number;
  learningRate: number;
};

const TRAIN_SECONDS = 24;

/** Starts a simulated sandbox fine-tune run. Free for contributors. */
export const startFineTune = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { baseModelId: string; instruments: string[]; timeframe: string; params: FineTuneParams }) => {
      if (!data.instruments.length) throw new Error("Pick at least one instrument to fine-tune on.");
      if (data.params.trainingWindowMonths < 6) throw new Error("Use a training window of at least 6 months.");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: base } = await supabase
      .from("base_models")
      .select("id,version")
      .eq("id", data.baseModelId)
      .maybeSingle();
    if (!base) throw new Error("Base model not found.");

    const { data: job, error } = await supabase
      .from("fine_tune_jobs")
      .insert({
        user_id: userId,
        base_model_id: base.id,
        base_version: base.version,
        instruments: data.instruments,
        timeframe: data.timeframe,
        params: data.params as never,
        status: "running",
        stage: "preparing",
        progress: 2,
        stage_message: "Provisioning sandbox and loading base weights…",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { jobId: job.id };
  });

function lossCurve(seed: string, epochs: number, upTo: number) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 997;
  const noise = (i: number) => (((h + i * 137) % 100) / 100 - 0.5) * 0.03;
  const points: { epoch: number; train: number; val: number }[] = [];
  for (let i = 1; i <= Math.min(epochs, upTo); i++) {
    const t = i / epochs;
    const train = Math.max(0.05, 0.62 * Math.exp(-2.4 * t) + 0.08 + noise(i));
    const val = Math.max(0.06, 0.64 * Math.exp(-2.1 * t) + 0.11 + noise(i * 3));
    points.push({ epoch: i, train: Math.round(train * 1000) / 1000, val: Math.round(val * 1000) / 1000 });
  }
  return points;
}

/** Client polls this while the animated progress bar runs. */
export const advanceFineTune = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { jobId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: job } = await supabase.from("fine_tune_jobs").select("*").eq("id", data.jobId).maybeSingle();
    if (!job) throw new Error("Fine-tune job not found.");
    if (job.status !== "running") return job;

    const params = job.params as unknown as FineTuneParams;
    const epochs = Math.max(1, Number(params.epochs) || 8);
    const elapsed = (Date.now() - new Date(job.started_at).getTime()) / 1000;
    const ratio = Math.min(1, elapsed / TRAIN_SECONDS);
    const epochsDone = Math.max(1, Math.ceil(ratio * epochs));
    const curve = lossCurve(job.id, epochs, epochsDone);

    let stage = "preparing";
    let message = "Provisioning sandbox and loading base weights…";
    if (ratio > 0.12) {
      stage = "data";
      message = `Loading ${(job.instruments as string[]).join(", ")} ${job.timeframe} history…`;
    }
    if (ratio > 0.25) {
      stage = "training";
      message = `Training epoch ${epochsDone} of ${epochs} (frozen layers untouched)…`;
    }
    if (ratio >= 1) {
      stage = "trained";
      message = "Fine-tune complete — handing off to backtest validation.";
    }

    const { data: updated } = await supabase
      .from("fine_tune_jobs")
      .update({
        status: ratio >= 1 ? "trained" : "running",
        stage,
        stage_message: message,
        progress: Math.round(2 + ratio * 98),
        loss_curve: curve as never,
        completed_at: ratio >= 1 ? new Date().toISOString() : null,
      })
      .eq("id", data.jobId)
      .select("*")
      .single();

    return updated;
  });

export const getFineTuneJob = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { jobId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: job } = await context.supabase.from("fine_tune_jobs").select("*").eq("id", data.jobId).maybeSingle();
    return job;
  });

/**
 * Turns a completed fine-tune into a normal derivative listing and pushes it
 * straight into the mandatory platform backtest — lineage never skips validation.
 */
export const publishFineTune = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { jobId: string; name: string; slug: string; tagline: string; feePct: number }) => {
    if (!/^[a-z0-9-]{3,80}$/.test(data.slug)) throw new Error("Slug must be lowercase letters, numbers and dashes.");
    if (!data.name.trim()) throw new Error("Give your derivative a name.");
    if (data.feePct < 5 || data.feePct > 25) throw new Error("Performance fee must be between 5% and 25%.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: job } = await supabase
      .from("fine_tune_jobs")
      .select("*")
      .eq("id", data.jobId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!job) throw new Error("Fine-tune job not found.");
    if (job.status !== "trained" && job.status !== "published") throw new Error("Training has not finished yet.");

    const { data: base } = await supabase
      .from("base_models")
      .select("id,version,listing_kind,instruments,feature_schema,timeframes")
      .eq("id", job.base_model_id)
      .maybeSingle();
    if (!base) throw new Error("Base model not found.");

    let { data: contributor } = await supabase
      .from("contributor_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!contributor) {
      const handle = `creator_${userId.slice(0, 8)}`;
      const { data: created, error: cErr } = await supabase
        .from("contributor_profiles")
        .insert({
          user_id: userId,
          handle,
          display_name: handle,
          country: "HK",
          avatar_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${handle}`,
        })
        .select("id")
        .single();
      if (cErr) throw new Error(cErr.message);
      contributor = created;
    }

    const params = job.params as unknown as FineTuneParams;
    const instruments = job.instruments as string[];
    const resources: ResourceSpec = { memoryMb: 1024, maxInferenceMs: 60, requiresGpu: false };

    const { data: model, error } = await supabase
      .from("ai_models")
      .insert({
        contributor_id: contributor.id,
        user_id: userId,
        slug: data.slug,
        name: data.name,
        tagline: data.tagline,
        description: `Cloud fine-tune of ${base.id} v${base.version} on ${instruments.join(", ")} ${job.timeframe} data. Feature schema and output contract inherited unchanged from the base model.`,
        risk_disclosure: "Derivative of a platform base model. Past and simulated performance never guarantees future results.",
        tags: ["fine-tuned", base.id],
        asset_class: instruments.some((i) => i.includes("/")) ? "crypto" : "stocks",
        strategy_type: base.id.includes("meanrev") ? "mean_reversion" : base.id.includes("momentum") ? "momentum" : "ml_signal",
        timeframe: job.timeframe,
        risk_level: "medium",
        status: "pending_review",
        listing_kind: base.listing_kind === "algo" ? "algo" : "ai_model",
        pricing_model: "per_signal",
        price: data.feePct,
        package_kind: "package",
        package_path: `cloud://fine-tune/${job.id}`,
        parameters: [
          { name: "entry_threshold", type: "number", default: String(params.entryThreshold) },
          { name: "exit_threshold", type: "number", default: String(params.exitThreshold) },
        ] as never,
        interface_manifest: {
          instruments,
          timeframe: job.timeframe,
          lookbackBars: 200,
          indicators: (base.feature_schema as { field: string }[]).map((f) => f.field),
          parameters: [],
          outputConfirmed: true,
        } as never,
        base_model_id: base.id,
        base_version: base.version,
        finetune_method: "cloud",
        resources: resources as never,
      })
      .select("id,slug")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("model_versions").insert({
      model_id: model.id,
      version: "1.0.0",
      changelog: `Cloud fine-tune of ${base.id} v${base.version}.`,
      is_current: true,
    });

    // Mandatory backtest validation, exactly like a from-scratch submission.
    const violations = checkResources(resources, null);
    if (violations.length) throw new Error(violations[0]!.message);

    const config: BacktestConfig = {
      universe: instruments,
      timeframe: job.timeframe,
      signalFrequency: job.timeframe,
      dataInputs: (base.feature_schema as { field: string }[]).map((f) => f.field),
      minimumCapital: 10000,
      dataSourceKind: "platform",
      dataSourceLabel: "aiAlgo platform market data",
    } as BacktestConfig;

    const protocol: BacktestProtocol = DEFAULT_PROTOCOL;
    const { data: btJob, error: btErr } = await supabase
      .from("backtest_jobs")
      .insert({
        model_id: model.id,
        user_id: userId,
        kind: "validation",
        model_version: "1.0.0",
        status: "running",
        stage: "interface_validation",
        progress: 5,
        stage_message: "Checking the derivative against the base contract…",
        config: config as never,
        protocol: protocol as never,
        eta_seconds: 30,
      })
      .select("id")
      .single();
    if (btErr) throw new Error(btErr.message);

    await supabase
      .from("ai_models")
      .update({
        status: "backtest_validation",
        backtest_config: config as never,
        validation_job_id: btJob.id,
        data_source_kind: "platform",
        data_source_label: "aiAlgo platform market data",
      })
      .eq("id", model.id);

    await supabase
      .from("model_submissions")
      .upsert({ model_id: model.id, user_id: userId, status: "backtest_validation" }, { onConflict: "model_id" });

    await supabase
      .from("fine_tune_jobs")
      .update({ status: "published", model_id: model.id, backtest_job_id: btJob.id })
      .eq("id", job.id);

    return { modelId: model.id, slug: model.slug, backtestJobId: btJob.id };
  });
