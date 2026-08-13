import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PipelineDiagram } from "@/components/marketplace/pipeline-diagram";
import {
  ARTIFACT_ROLES,
  PIPELINE_TYPES,
  RESOURCE_LIMITS,
  ROLE_LABELS,
  checkResources,
  type ArtifactRole,
  type PipelineSpec,
  type PipelineType,
  type ResourceSpec,
} from "@/lib/base-models";

export function emptyPipeline(): PipelineSpec {
  return { enabled: false, type: "sequential", architecture: "", artifacts: [] };
}

export function emptyResources(): ResourceSpec {
  return { memoryMb: 512, maxInferenceMs: 50, requiresGpu: false };
}

/** "Advanced: Multi-Model Pipeline" path in the upload wizard. */
export function PipelineBuilder({
  pipeline,
  resources,
  onPipelineChange,
  onResourcesChange,
}: {
  pipeline: PipelineSpec;
  resources: ResourceSpec;
  onPipelineChange: (p: PipelineSpec) => void;
  onResourcesChange: (r: ResourceSpec) => void;
}) {
  const violations = pipeline.enabled ? checkResources(resources, pipeline) : [];

  const addArtifact = () =>
    onPipelineChange({
      ...pipeline,
      artifacts: [
        ...pipeline.artifacts,
        {
          path: `artifacts/model_${pipeline.artifacts.length + 1}.pkl`,
          role: "signal_generator",
          kind: "sklearn",
          memoryMb: 256,
          inferenceMs: 20,
        },
      ],
    });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-md border border-border/70 p-3">
        <div>
          <Label className="text-sm">Advanced: Multi-Model Pipeline</Label>
          <p className="text-xs text-muted-foreground">
            Ship an <span className="mono">artifacts/</span> folder with several model files and declare how they
            compose.
          </p>
        </div>
        <Switch
          checked={pipeline.enabled}
          onCheckedChange={(v) => onPipelineChange({ ...pipeline, enabled: v })}
          aria-label="Enable multi-model pipeline"
        />
      </div>

      {pipeline.enabled ? (
        <>
          <div className="flex items-start gap-2 rounded-md border border-warning/50 bg-warning/10 p-3 text-xs text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Multi-stage pipelines carry higher overfitting risk — your model will receive extra walk-forward scrutiny
            during validation.
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Pipeline type</Label>
              <Select
                value={pipeline.type}
                onValueChange={(v) => onPipelineChange({ ...pipeline, type: v as PipelineType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Bundle memory (MB)</Label>
              <Input
                type="number"
                value={resources.memoryMb}
                onChange={(e) => onResourcesChange({ ...resources, memoryMb: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Max inference per bar (ms)</Label>
              <Input
                type="number"
                value={resources.maxInferenceMs}
                onChange={(e) => onResourcesChange({ ...resources, maxInferenceMs: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Switch
                checked={resources.requiresGpu}
                onCheckedChange={(v) => onResourcesChange({ ...resources, requiresGpu: v })}
                aria-label="Requires GPU"
              />
              <Label className="text-sm">Requires GPU</Label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Architecture description</Label>
            <Textarea
              rows={3}
              value={pipeline.architecture}
              placeholder="A HMM regime detector routes each bar to a trend or mean-reversion specialist; a meta filter vetoes low-confidence trades."
              onChange={(e) => onPipelineChange({ ...pipeline, architecture: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Artifacts ({pipeline.artifacts.length}/{RESOURCE_LIMITS.maxArtifacts})</Label>
              <Button size="sm" variant="outline" onClick={addArtifact}>
                <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Add artifact
              </Button>
            </div>
            {pipeline.artifacts.map((a, i) => (
              <div key={i} className="grid gap-2 rounded-md border border-border/70 p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                <Input
                  value={a.path}
                  className="mono text-xs"
                  onChange={(e) => {
                    const next = [...pipeline.artifacts];
                    next[i] = { ...a, path: e.target.value };
                    onPipelineChange({ ...pipeline, artifacts: next });
                  }}
                />
                <Select
                  value={a.role}
                  onValueChange={(v) => {
                    const next = [...pipeline.artifacts];
                    next[i] = { ...a, role: v as ArtifactRole };
                    onPipelineChange({ ...pipeline, artifacts: next });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ARTIFACT_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    aria-label="Memory MB"
                    value={a.memoryMb}
                    onChange={(e) => {
                      const next = [...pipeline.artifacts];
                      next[i] = { ...a, memoryMb: Number(e.target.value) || 0 };
                      onPipelineChange({ ...pipeline, artifacts: next });
                    }}
                  />
                  <Input
                    type="number"
                    aria-label="Inference ms"
                    value={a.inferenceMs}
                    onChange={(e) => {
                      const next = [...pipeline.artifacts];
                      next[i] = { ...a, inferenceMs: Number(e.target.value) || 0 };
                      onPipelineChange({ ...pipeline, artifacts: next });
                    }}
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remove artifact"
                  onClick={() =>
                    onPipelineChange({ ...pipeline, artifacts: pipeline.artifacts.filter((_, j) => j !== i) })
                  }
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>

          {pipeline.artifacts.length ? <PipelineDiagram pipeline={pipeline} /> : null}

          {violations.length ? (
            <div className="space-y-2 rounded-md border border-destructive/50 bg-destructive/5 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" aria-hidden /> Bundle exceeds sandbox limits
              </div>
              {violations.map((v) => (
                <div key={v.code} className="text-xs">
                  <div className="text-destructive">{v.message}</div>
                  <div className="text-muted-foreground">Remediation: {v.remediation}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Limits: ≤{RESOURCE_LIMITS.memoryMb} MB · ≤{RESOURCE_LIMITS.maxInferenceMs} ms per bar · CPU only · ≤
              {RESOURCE_LIMITS.maxArtifacts} artifacts. Bundles are versioned atomically — any artifact change requires
              a new version and a new backtest.
            </p>
          )}
          <Badge variant="outline" className="text-[11px] font-normal">
            Atomic versioning enforced
          </Badge>
        </>
      ) : null}
    </div>
  );
}
