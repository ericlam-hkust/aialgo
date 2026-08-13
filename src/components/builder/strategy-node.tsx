import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Activity, AlertTriangle, GitBranch, ShieldAlert, Zap } from "lucide-react";
import { specFor, type NodeCategory, type StrategyLane } from "@/lib/strategy-graph";
import { cn } from "@/lib/utils";
import { useBuilder } from "./builder-context";
import { IndicatorSparkline } from "./indicator-sparkline";

const STYLES: Record<NodeCategory, { ring: string; chip: string; icon: typeof Zap }> = {
  data: { ring: "border-chart-2/70", chip: "bg-chart-2/15 text-chart-2", icon: Activity },
  condition: { ring: "border-chart-4/70", chip: "bg-chart-4/15 text-chart-4", icon: GitBranch },
  action: { ring: "border-primary/70", chip: "bg-primary/15 text-primary", icon: Zap },
  risk: { ring: "border-destructive/70", chip: "bg-destructive/15 text-destructive", icon: ShieldAlert },
};

export type FlowNodeData = {
  kind: string;
  label: string;
  category: NodeCategory;
  lane: StrategyLane;
  params: Record<string, number | string>;
};

export function StrategyFlowNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  const { issues, updateParam } = useBuilder();
  const style = STYLES[d.category] ?? STYLES.data;
  const Icon = style.icon;
  const entries = Object.entries(d.params ?? {});
  const issue = issues[id];
  const spec = specFor({ type: d.category, data: { kind: d.kind, label: d.label, params: d.params } });
  const hasInput = (spec?.input ?? "none") !== "none";
  const hasOutput = (spec?.output ?? "none") !== "none";

  return (
    <div
      className={cn(
        "min-w-52 rounded-lg border-2 bg-card px-3 py-2 shadow-sm transition-shadow",
        style.ring,
        issue && "border-destructive/80",
        selected && "shadow-[var(--shadow-glow)] ring-2 ring-ring",
      )}
    >
      {hasInput ? (
        <Handle
          type="target"
          position={Position.Left}
          className={cn("!h-2.5 !w-2.5 !border-0", d.category === "action" ? "!bg-chart-4" : "!bg-chart-2")}
        />
      ) : null}

      <div className="flex items-center gap-2">
        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded", style.chip)}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="text-xs font-semibold">{d.label}</span>
        {issue ? (
          <span title={issue} className="ml-auto text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
      </div>

      {d.kind === "indicator" ? (
        <div className="text-chart-2">
          <IndicatorSparkline label={d.label} params={d.params} />
        </div>
      ) : null}

      {entries.length ? (
        <div className="mt-1.5 space-y-1">
          {entries.map(([k, v]) => (
            <label key={k} className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <span className="capitalize">{k.replace(/_/g, " ")}</span>
              <input
                value={String(v)}
                onChange={(e) => updateParam(id, k, e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                className="mono nodrag h-6 w-20 rounded border border-border bg-background px-1.5 text-right text-[11px] text-foreground outline-none focus:border-primary"
              />
            </label>
          ))}
        </div>
      ) : null}

      {issue ? <p className="mt-1.5 text-[10px] text-destructive">{issue}</p> : null}

      {hasOutput ? (
        <Handle
          type="source"
          position={Position.Right}
          className={cn("!h-2.5 !w-2.5 !border-0", d.category === "data" ? "!bg-chart-2" : "!bg-chart-4")}
        />
      ) : null}
    </div>
  );
}
