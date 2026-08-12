import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { InfoTip } from "@/components/info-tip";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  sub,
  tone = "neutral",
  tip,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "neutral" | "profit" | "loss" | "warning";
  tip?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-card/80 backdrop-blur">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
            <InfoTip term={label} text={tip} />
          </span>
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        </div>
        <div
          className={cn(
            "mono mt-2 text-2xl font-semibold",
            tone === "profit" && "text-profit",
            tone === "loss" && "text-loss",
            tone === "warning" && "text-warning",
          )}
        >
          {value}
        </div>
        {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}
