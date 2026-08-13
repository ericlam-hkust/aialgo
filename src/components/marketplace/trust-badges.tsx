import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarDays, Clock, ServerCog, Signal, TrendingUp, Zap } from "lucide-react";
import {
  FREQUENCY_CLASSES,
  HFT_LATENCY_MS,
  TRUST_TIERS,
  isHftReady,
  type FrequencyClass,
  type HostingMode,
  type TrustTier,
} from "@/lib/monetization";
import { cn } from "@/lib/utils";

function Hint({ children, hint }: { children: React.ReactNode; hint: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{hint}</TooltipContent>
    </Tooltip>
  );
}

export function TrustBadge({ tier, className }: { tier: TrustTier; className?: string }) {
  const spec = TRUST_TIERS[tier] ?? TRUST_TIERS.unproven;
  return (
    <Hint hint={spec.hint}>
      <Badge variant="outline" className={cn("gap-1", spec.tone, className)}>
        {tier === "platform_verified" ? (
          <ServerCog className="h-3 w-3" aria-hidden />
        ) : tier === "live_verified" ? (
          <Signal className="h-3 w-3" aria-hidden />
        ) : (
          <Clock className="h-3 w-3" aria-hidden />
        )}
        {spec.label}
      </Badge>
    </Hint>
  );
}

const FREQ_ICON = { hft: Zap, intraday: Clock, swing: TrendingUp, position: CalendarDays } as const;

export function FrequencyBadge({
  frequency,
  hosting,
  latencyMs = 0,
  className,
}: {
  frequency: FrequencyClass;
  hosting?: HostingMode;
  latencyMs?: number;
  className?: string;
}) {
  const spec = FREQUENCY_CLASSES[frequency] ?? FREQUENCY_CLASSES.swing;
  const Icon = FREQ_ICON[frequency] ?? TrendingUp;
  const ready = hosting ? isHftReady({ hosting_mode: hosting, declared_frequency: frequency, measured_latency_ms: latencyMs }) : false;
  return (
    <Hint hint={`${spec.hint} Typical holding period: ${spec.holding}.`}>
      <Badge variant="outline" className={cn("gap-1", frequency === "hft" && "border-primary/60 text-primary", className)}>
        <Icon className="h-3 w-3" aria-hidden />
        {frequency === "hft" && ready ? "HFT-Ready" : spec.label}
      </Badge>
    </Hint>
  );
}

export function LatencyBadge({ latencyMs, className }: { latencyMs: number; className?: string }) {
  if (!latencyMs) return null;
  const good = latencyMs < HFT_LATENCY_MS;
  return (
    <Hint hint="Median measured latency between the contributor's signal timestamp and our gateway receipt.">
      <Badge variant="outline" className={cn("mono gap-1", good ? "border-profit/60 text-profit" : "text-muted-foreground", className)}>
        <Zap className="h-3 w-3" aria-hidden />
        {Math.round(latencyMs)}ms
      </Badge>
    </Hint>
  );
}

export function HostingBadge({ hosting }: { hosting: HostingMode }) {
  return (
    <Hint
      hint={
        hosting === "hosted"
          ? "Tier 1 — the contributor's code runs inside the aiAlgo sandbox on our data feeds."
          : "Tier 2 — the contributor runs the model on their own infrastructure and sends signals to our gateway."
      }
    >
      <Badge variant="secondary" className="gap-1">
        {hosting === "hosted" ? "Platform-hosted" : "Remote signals"}
      </Badge>
    </Hint>
  );
}
