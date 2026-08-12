import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Activity, GitBranch, ShieldAlert, Zap } from "lucide-react";
import type { NodeCategory } from "@/lib/strategy-graph";
import { cn } from "@/lib/utils";

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
  params: Record<string, number | string>;
};

export function StrategyFlowNode({ data, selected }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  const style = STYLES[d.category] ?? STYLES.data;
  const Icon = style.icon;
  const entries = Object.entries(d.params ?? {});

  return (
    <div
      className={cn(
        "min-w-44 rounded-lg border-2 bg-card px-3 py-2 shadow-sm transition-shadow",
        style.ring,
        selected && "shadow-[var(--shadow-glow)] ring-2 ring-ring",
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-muted-foreground" />
      <div className="flex items-center gap-2">
        <span className={cn("flex h-6 w-6 items-center justify-center rounded", style.chip)}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="text-xs font-semibold">{d.label}</span>
      </div>
      {entries.length ? (
        <dl className="mono mt-1.5 space-y-0.5 text-[10px] text-muted-foreground">
          {entries.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt>{k}</dt>
              <dd className="text-foreground">{String(v)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-muted-foreground" />
    </div>
  );
}
