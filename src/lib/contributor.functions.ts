import { createServerFn } from "@tanstack/react-start";
import type { InterfaceManifest } from "@/lib/model-interface";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AssetClass, ModelPricingModel, ModelRiskLevel, ModelStrategyType } from "@/lib/marketplace";
import { checkResources, type FinetuneMethod, type PipelineSpec, type ResourceSpec } from "@/lib/base-models";

export const getContributorProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("contributor_profiles").select("*").eq("user_id", userId).maybeSingle();
    return data;
  });

export const saveContributorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { handle: string; displayName: string; bio?: string; country?: string; payoutEmail?: string }) => {
      if (!/^[a-z0-9_]{3,30}$/.test(data.handle)) throw new Error("Handle must be 3-30 lowercase letters, numbers or _");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("contributor_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const payload = {
      user_id: userId,
      handle: data.handle,
      display_name: data.displayName,
      bio: data.bio ?? null,
      country: data.country ?? "HK",
      payout_email: data.payoutEmail ?? null,
      avatar_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(data.handle)}`,
    };

    if (existing) {
      const { error } = await supabase.from("contributor_profiles").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { id: existing.id };
    }
    const { data: row, error } = await supabase.from("contributor_profiles").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const listMyModels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: contributor } = await supabase
      .from("contributor_profiles")
      .select("id,handle,display_name,payout_status,stripe_account_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!contributor) return { contributor: null, models: [], submissions: [] };

    const [{ data: models }, { data: submissions }] = await Promise.all([
      supabase
        .from("ai_models")
        .select("*")
        .eq("contributor_id", contributor.id)
        .order("created_at", { ascending: false }),
      supabase.from("model_submissions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);

    return {
      contributor,
      models: models ?? [],
      submissions: submissions ?? [],
    };
  });


export type ModelDraft = {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  riskDisclosure: string;
  tags: string[];
  assetClass: AssetClass;
  strategyType: ModelStrategyType;
  timeframe: string;
  riskLevel: ModelRiskLevel;
  packageKind: "api" | "package";
  apiEndpoint?: string;
  apiAuthToken?: string;
  packagePath?: string;
  parameters: { name: string; type: string; default: string; min?: string; max?: string; description?: string }[];
  pricingModel: ModelPricingModel;
  price: number;
  manifest?: InterfaceManifest;
  baseModelId?: string;
  baseVersion?: string;
  finetuneMethod?: FinetuneMethod;
  pipeline?: PipelineSpec;
  resources?: ResourceSpec;
};

export const submitModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ModelDraft) => {
    if (!/^[a-z0-9-]{3,80}$/.test(data.slug)) throw new Error("Slug must be lowercase letters, numbers and dashes");
    if (!data.name.trim()) throw new Error("Name is required");
    if (data.price < 0) throw new Error("Price must be positive");
    if (data.resources) {
      const violations = checkResources(data.resources, data.pipeline ?? null);
      if (violations.length) throw new Error(`${violations[0]!.message} ${violations[0]!.remediation}`);
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: contributor } = await supabase
      .from("contributor_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!contributor) throw new Error("Create your contributor profile first.");

    let apiAuthEncrypted: string | null = null;
    if (data.apiAuthToken) {
      const { encryptSecret } = await import("@/lib/crypto.server");
      apiAuthEncrypted = await encryptSecret(data.apiAuthToken);
    }

    const { data: model, error } = await supabase
      .from("ai_models")
      .insert({
        contributor_id: contributor.id,
        user_id: userId,
        slug: data.slug,
        name: data.name,
        tagline: data.tagline,
        description: data.description,
        risk_disclosure: data.riskDisclosure,
        tags: data.tags,
        asset_class: data.assetClass,
        strategy_type: data.strategyType,
        timeframe: data.timeframe,
        risk_level: data.riskLevel,
        status: "pending_review",
        pricing_model: data.pricingModel,
        price: data.price,
        package_kind: data.packageKind,
        api_endpoint: data.apiEndpoint ?? null,
        api_auth_encrypted: apiAuthEncrypted,
        package_path: data.packagePath ?? null,
        parameters: data.parameters,
        interface_manifest: (data.manifest ?? null) as never,
        base_model_id: data.baseModelId ?? null,
        base_version: data.baseVersion ?? null,
        finetune_method: data.baseModelId ? (data.finetuneMethod ?? "local") : null,
        pipeline: (data.pipeline?.enabled ? data.pipeline : null) as never,
        resources: (data.resources ?? null) as never,
      })
      .select("id,slug")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("model_versions").insert({
      model_id: model.id,
      version: "1.0.0",
      changelog: "Initial submission.",
      is_current: true,
    });
    await supabase.from("model_submissions").insert({
      model_id: model.id,
      user_id: userId,
      status: "pending_review",
    });

    return { id: model.id, slug: model.slug };
  });

export const publishModelVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { modelId: string; version: string; changelog: string }) => {
    if (!/^\d+\.\d+(\.\d+)?$/.test(data.version.trim())) throw new Error("Use semantic versions like 1.1 or 1.2.0");
    if (!data.changelog.trim()) throw new Error("A changelog is required for every release.");
    return { ...data, version: data.version.trim() };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: model } = await supabase
      .from("ai_models")
      .select("id,name,slug,user_id")
      .eq("id", data.modelId)
      .maybeSingle();
    if (!model) throw new Error("Model not found");

    await supabase.from("model_versions").update({ is_current: false }).eq("model_id", data.modelId);
    const { error } = await supabase.from("model_versions").insert({
      model_id: data.modelId,
      version: data.version,
      changelog: data.changelog,
      is_current: true,
    });
    if (error) throw new Error(error.message);

    // Notify every subscriber running this model.
    const { data: subscribers } = await supabase
      .from("model_activations")
      .select("user_id,pinned_version")
      .eq("model_id", data.modelId);
    const userIds = [...new Set((subscribers ?? []).map((s) => s.user_id))];
    if (userIds.length) {
      const { notify } = await import("@/lib/notify.server");
      await notify(
        userIds.map((userId) => ({
          userId,
          kind: "new_version" as const,
          title: `${model.name} v${data.version} is available`,
          body: data.changelog,
          link: `/marketplace/${model.slug}`,
        })),
      );
    }

    return { ok: true, notified: userIds.length };
  });

/** Payout, KYC and tax-form state for the contributor onboarding screen. */
export const getPayoutOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: contributor } = await supabase
      .from("contributor_profiles")
      .select("id,handle,display_name,country,payout_email,payout_status,kyc_status,tax_form_status,tax_form_submitted_at,stripe_account_id,verified")
      .eq("user_id", userId)
      .maybeSingle();
    if (!contributor) return null;

    const [{ data: transactions }, { data: payouts }] = await Promise.all([
      supabase
        .from("model_transactions")
        .select("id,model_id,model_name,gross_amount,commission_amount,net_amount,currency,kind,status,created_at")
        .eq("contributor_id", contributor.id)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("payout_batches")
        .select("*")
        .eq("contributor_id", contributor.id)
        .order("period", { ascending: false }),
    ]);

    return { contributor, transactions: transactions ?? [], payouts: payouts ?? [] };
  });

export const setTaxFormStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status: "not_started" | "submitted" }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("contributor_profiles")
      .update({
        tax_form_status: data.status,
        tax_form_submitted_at: data.status === "submitted" ? new Date().toISOString() : null,
      })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setModelStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { modelId: string; status: "live" | "paused" | "delisted" }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ai_models")
      .update({ status: data.status })
      .eq("id", data.modelId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateModelPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { modelId: string; pricingModel: ModelPricingModel; price: number; tagline: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ai_models")
      .update({ pricing_model: data.pricingModel, price: data.price, tagline: data.tagline })
      .eq("id", data.modelId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
