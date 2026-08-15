import { Bot, Building2, LineChart, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type OrderSource = "manual" | "algo" | "ai_model" | "broker";

export type SourceMeta = {
  source: string | null;
  strategyName?: string | null;
  modelName?: string | null;
  accountName?: string | null;
};

/** One consistent badge that says who created a trade: a human, an Algo, an AI model, or the broker. */
export function SourceBadge({ source, strategyName, modelName, accountName }: SourceMeta) {
  const kind = (source ?? "broker") as OrderSource;

  if (kind === "manual") {
    return (
      <Badge variant="outline" className="gap-1 border-blue-500/40 text-blue-400">
        <User className="h-3 w-3" aria-hidden />
        Manual{accountName ? ` · ${accountName}` : ""}
      </Badge>
    );
  }
  if (kind === "algo") {
    return (
      <Badge variant="outline" className="gap-1 border-profit/40 text-profit">
        <LineChart className="h-3 w-3" aria-hidden />
        Algo{strategyName ? ` · ${strategyName}` : ""}
      </Badge>
    );
  }
  if (kind === "ai_model") {
    return (
      <Badge variant="outline" className="gap-1 border-primary/50 text-primary">
        <Bot className="h-3 w-3" aria-hidden />
        AI{modelName ? ` · ${modelName}` : ""}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <Building2 className="h-3 w-3" aria-hidden />
      Broker
    </Badge>
  );
}
