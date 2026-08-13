import { ArrowRight, ArrowDown, Boxes, Cpu, Filter, GitMerge, Route as RouteIcon, Scale, Waves } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PIPELINE_TYPES, ROLE_LABELS, type ArtifactRole, type PipelineSpec } from "@/lib/base-models";
import { cn } from "@/lib/utils";

const ROLE_ICON: Record<ArtifactRole, typeof Cpu> = {
  regime_detector: Waves,
  signal_generator: Cpu,
  meta_filter: Filter,
  risk_sizer: Scale,
  feature_encoder: Boxes,
  router: RouteIcon,
  blender: GitMerge,
};

/** Visual flow of the models inside a bundle so consumers see what they subscribe to. */
export function PipelineDiagram({ pipeline, className }: { pipeline: PipelineSpec; className?: string }) {
  const typeMeta = PIPELINE_TYPES.find((t) => t.value === pipeline.type);
  const parallel = pipeline.type === "ensemble";

  return (
    <div className={cn("space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{typeMeta?.label ?? pipeline.type}</Badge>
        <span className="text-xs text-muted-foreground">{typeMeta?.hint}</span>
      </div>

      <div className={cn("flex gap-2", parallel ? "flex-col sm:flex-row sm:flex-wrap" : "flex-col sm:flex-row sm:items-stretch")}>
        {pipeline.artifacts.map((a, i) => {
          const Icon = ROLE_ICON[a.role] ?? Cpu;
          return (
            <div key={`${a.path}-${i}`} className="flex items-center gap-2">
              <div className="min-w-[10rem] flex-1 rounded-md border border-border/70 bg-background p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="h-4 w-4 text-primary" aria-hidden />
                  {ROLE_LABELS[a.role] ?? a.role}
                </div>
                <div className="mono mt-1 truncate text-[11px] text-muted-foreground">{a.path}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {a.kind} · {a.memoryMb} MB · {a.inferenceMs} ms
                </div>
              </div>
              {i < pipeline.artifacts.length - 1 && !parallel ? (
                <>
                  <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden />
                  <ArrowDown className="h-4 w-4 shrink-0 text-muted-foreground sm:hidden" aria-hidden />
                </>
              ) : null}
            </div>
          );
        })}
        <div className="flex items-center gap-2">
          <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden />
          <ArrowDown className="h-4 w-4 shrink-0 text-muted-foreground sm:hidden" aria-hidden />
          <div className="min-w-[9rem] rounded-md border border-primary/50 bg-primary/5 p-3 text-sm font-medium">
            Signal output
            <div className="text-[11px] font-normal text-muted-foreground">action · confidence · size</div>
          </div>
        </div>
      </div>

      {pipeline.architecture ? <p className="text-xs text-muted-foreground">{pipeline.architecture}</p> : null}
    </div>
  );
}
