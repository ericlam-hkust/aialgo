/** Client-safe types and rules for the Base Model Library, lineage and multi-model pipeline bundles. */

export type BaseModelRow = {
  id: string;
  name: string;
  version: string;
  listing_kind: string;
  architecture: string;
  tagline: string;
  description: string;
  docs: string;
  instruments: string[];
  timeframes: string[];
  data_start: string | null;
  data_end: string | null;
  feature_schema: { field: string; type: string; note: string }[];
  trainable: string[];
  frozen: string[];
  recommended_settings: {
    trainingWindowMonths?: number;
    epochs?: number;
    learningRate?: number;
    entryThreshold?: number;
    exitThreshold?: number;
  };
  baseline_metrics: { sharpe?: number; cagr?: number; maxDrawdown?: number; winRate?: number; trades?: number };
  compute_estimate: string;
  package_contents: string[];
};

export type FinetuneMethod = "local" | "cloud" | "params_only";

export const FINETUNE_METHOD_LABELS: Record<FinetuneMethod, string> = {
  local: "Fine-tuned",
  cloud: "Fine-tuned",
  params_only: "Adapted",
};

export function lineageLabel(method: string | null | undefined) {
  return FINETUNE_METHOD_LABELS[(method ?? "local") as FinetuneMethod] ?? "Fine-tuned";
}

/* ------------------------------------------------------------------ */
/* Multi-model pipeline bundles                                        */
/* ------------------------------------------------------------------ */

export type PipelineType = "ensemble" | "sequential" | "regime_router" | "meta_labeling" | "custom";

export const PIPELINE_TYPES: { value: PipelineType; label: string; hint: string }[] = [
  { value: "ensemble", label: "Ensemble", hint: "Several models score the same bar; their outputs are blended." },
  { value: "sequential", label: "Sequential", hint: "Each stage consumes the previous stage's output." },
  { value: "regime_router", label: "Regime router", hint: "A router picks which specialist model handles the current regime." },
  { value: "meta_labeling", label: "Meta labeling", hint: "A primary model proposes trades; a meta model filters them." },
  { value: "custom", label: "Custom", hint: "Your own topology — describe it in the architecture notes." },
];

export const ARTIFACT_ROLES = [
  "regime_detector",
  "signal_generator",
  "meta_filter",
  "risk_sizer",
  "feature_encoder",
  "router",
  "blender",
] as const;

export type ArtifactRole = (typeof ARTIFACT_ROLES)[number];

export const ROLE_LABELS: Record<ArtifactRole, string> = {
  regime_detector: "Regime detector",
  signal_generator: "Signal generator",
  meta_filter: "Meta filter",
  risk_sizer: "Risk sizer",
  feature_encoder: "Feature encoder",
  router: "Router",
  blender: "Blender",
};

export type PipelineArtifact = {
  /** File inside artifacts/ */
  path: string;
  role: ArtifactRole;
  /** Free-form model type, e.g. "LSTM", "GBM", "rule-based" */
  kind: string;
  memoryMb: number;
  inferenceMs: number;
};

export type PipelineSpec = {
  enabled: boolean;
  type: PipelineType;
  architecture: string;
  artifacts: PipelineArtifact[];
};

export type ResourceSpec = {
  memoryMb: number;
  maxInferenceMs: number;
  requiresGpu: boolean;
};

/** Hard ceilings enforced by the validation sandbox. */
export const RESOURCE_LIMITS = {
  memoryMb: 4096,
  maxInferenceMs: 250,
  gpuAllowed: false,
  maxArtifacts: 6,
} as const;

export function emptyPipeline(): PipelineSpec {
  return {
    enabled: false,
    type: "sequential",
    architecture: "",
    artifacts: [
      { path: "artifacts/regime.pkl", role: "regime_detector", kind: "GBM classifier", memoryMb: 256, inferenceMs: 12 },
      { path: "artifacts/signal.safetensors", role: "signal_generator", kind: "LSTM", memoryMb: 1024, inferenceMs: 40 },
    ],
  };
}

export function emptyResources(): ResourceSpec {
  return { memoryMb: 1536, maxInferenceMs: 120, requiresGpu: false };
}

export type ResourceViolation = { code: string; message: string; remediation: string };

/**
 * The gate that runs before any bundle is replayed. Mirrors what the sandbox
 * can actually provision, so contributors see the same numbers everywhere.
 */
export function checkResources(resources: ResourceSpec, pipeline?: PipelineSpec | null): ResourceViolation[] {
  const out: ResourceViolation[] = [];
  const artifacts = pipeline?.enabled ? pipeline.artifacts : [];
  const artifactMemory = artifacts.reduce((s, a) => s + (Number(a.memoryMb) || 0), 0);
  const artifactLatency = artifacts.reduce((s, a) => s + (Number(a.inferenceMs) || 0), 0);
  const declaredMemory = Math.max(Number(resources.memoryMb) || 0, artifactMemory);

  if (declaredMemory > RESOURCE_LIMITS.memoryMb) {
    out.push({
      code: "memory_exceeded",
      message: `Bundle requests ${declaredMemory} MB of memory; the validation sandbox allows ${RESOURCE_LIMITS.memoryMb} MB.`,
      remediation:
        "Quantise or prune the largest artifact, merge the regime router into the signal model, or drop a stage and resubmit.",
    });
  }
  if ((Number(resources.maxInferenceMs) || 0) > RESOURCE_LIMITS.maxInferenceMs) {
    out.push({
      code: "latency_exceeded",
      message: `Declared per-bar inference budget is ${resources.maxInferenceMs} ms; the limit is ${RESOURCE_LIMITS.maxInferenceMs} ms.`,
      remediation: "Batch feature computation, cache indicators between bars, or run fewer stages per bar.",
    });
  }
  if (artifacts.length && artifactLatency > RESOURCE_LIMITS.maxInferenceMs) {
    out.push({
      code: "stage_latency_exceeded",
      message: `Stage latencies sum to ${artifactLatency} ms, above the ${RESOURCE_LIMITS.maxInferenceMs} ms per-bar limit.`,
      remediation: "Run independent stages in parallel, or collapse the ensemble into a single distilled model.",
    });
  }
  if (resources.requiresGpu && !RESOURCE_LIMITS.gpuAllowed) {
    out.push({
      code: "gpu_not_available",
      message: "This bundle requires a GPU at inference time; validation runs on CPU only.",
      remediation: "Export a CPU-executable artifact (ONNX / quantised weights) — GPU is only available during training.",
    });
  }
  if (artifacts.length > RESOURCE_LIMITS.maxArtifacts) {
    out.push({
      code: "too_many_artifacts",
      message: `Bundle declares ${artifacts.length} artifacts; the maximum is ${RESOURCE_LIMITS.maxArtifacts}.`,
      remediation: "Combine specialists that share a feature set, or publish them as separate listings.",
    });
  }
  return out;
}

export function normalizePipeline(raw: unknown): PipelineSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<PipelineSpec>;
  if (!r.enabled) return null;
  return {
    enabled: true,
    type: (r.type ?? "sequential") as PipelineType,
    architecture: String(r.architecture ?? ""),
    artifacts: Array.isArray(r.artifacts) ? (r.artifacts as PipelineArtifact[]) : [],
  };
}

export function normalizeResources(raw: unknown): ResourceSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<ResourceSpec>;
  return {
    memoryMb: Number(r.memoryMb) || 0,
    maxInferenceMs: Number(r.maxInferenceMs) || 0,
    requiresGpu: Boolean(r.requiresGpu),
  };
}
