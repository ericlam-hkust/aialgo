import { Link } from "@tanstack/react-router";
import { GitBranch, Cloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { lineageLabel } from "@/lib/base-models";

/** "Fine-tuned from aialgo/meanrev-gbm-base v2.1 · View base →" */
export function LineageBadge({
  baseModelId,
  baseVersion,
  method,
  compact,
}: {
  baseModelId?: string | null | undefined;
  baseVersion?: string | null | undefined;
  method?: string | null | undefined;
  compact?: boolean | undefined;
}) {
  if (!baseModelId) return null;
  const label = `${lineageLabel(method)} from aialgo/${baseModelId}${baseVersion ? ` v${baseVersion}` : ""}`;

  if (compact) {
    return (
      <Badge variant="outline" className="gap-1 text-[11px] font-normal">
        <GitBranch className="h-3 w-3" aria-hidden />
        {label}
        {method === "cloud" ? <Cloud className="h-3 w-3 text-primary" aria-hidden /> : null}
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs">
      <GitBranch className="h-3.5 w-3.5 text-primary" aria-hidden />
      <span>{label}</span>
      {method === "cloud" ? (
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <Cloud className="h-3 w-3" aria-hidden /> Cloud-trained
        </Badge>
      ) : null}
      <Link to="/marketplace/base-models/$id" params={{ id: baseModelId }} className="text-primary hover:underline">
        View base →
      </Link>
    </div>
  );
}
