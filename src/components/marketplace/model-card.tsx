import { Link } from "@tanstack/react-router";
import { Star, Users, ShieldCheck, TriangleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtNum } from "@/lib/format";
import {
  ASSET_CLASSES,
  STRATEGY_TYPES,
  labelFor,
  pricingLabel,
  riskTone,
  type AssetClass,
  type ModelPricingModel,
  type ModelRiskLevel,
  type ModelStrategyType,
} from "@/lib/marketplace";
import { cn } from "@/lib/utils";
import { FrequencyBadge, LatencyBadge, TrustBadge } from "@/components/marketplace/trust-badges";
import type { FrequencyClass, HostingMode, TrustTier } from "@/lib/monetization";

export type ModelCardModel = {
  slug: string;
  name: string;
  tagline: string | null;
  asset_class: AssetClass;
  strategy_type: ModelStrategyType;
  timeframe: string;
  risk_level: ModelRiskLevel;
  pricing_model: ModelPricingModel;
  price: number;
  currency: string;
  sharpe: number;
  max_drawdown: number;
  win_rate: number;
  cagr: number;
  rating: number;
  rating_count: number;
  active_users: number;
  overfitting_risk?: boolean | null;
  hosting_mode?: HostingMode | null;
  trust_tier?: TrustTier | null;
  declared_frequency?: FrequencyClass | null;
  measured_latency_ms?: number | null;
  promoted?: boolean | null;
  consistency_score?: number | null;
  contributor: { display_name: string; avatar_url: string | null; verified: boolean; handle: string } | null;
};

export function ModelCard({
  model,
  layout = "grid",
  selected,
  onToggleSelect,
}: {
  model: ModelCardModel;
  layout?: "grid" | "list";
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const metrics = [
    { label: "CAGR", value: `${fmtNum(Number(model.cagr), 1)}%` },
    { label: "Sharpe", value: fmtNum(Number(model.sharpe), 2) },
    { label: "Max DD", value: `${fmtNum(Number(model.max_drawdown), 1)}%` },
    { label: "Win rate", value: `${fmtNum(Number(model.win_rate), 1)}%` },
  ];

  return (
    <Link to="/marketplace/$slug" params={{ slug: model.slug }} className="group relative block">
      {onToggleSelect ? (
        <label
          className="absolute top-3 right-3 z-10 flex cursor-pointer items-center gap-1.5 rounded-md border border-border/70 bg-background/90 px-2 py-1 text-[11px] text-muted-foreground"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSelect();
          }}
        >
          <input type="checkbox" checked={Boolean(selected)} readOnly className="accent-primary" aria-label={`Compare ${model.name}`} />
          Compare
        </label>
      ) : null}
      <Card
        className={cn(
          "h-full border-border/70 bg-card/80 transition-colors group-hover:border-primary/50",
          selected && "border-primary",
        )}
      >
        <CardContent className={cn("p-4", layout === "list" && "sm:flex sm:items-center sm:gap-6")}>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold tracking-tight">{model.name}</h3>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{model.tagline}</p>
              </div>
              <Badge variant="secondary" className={cn("mono shrink-0", onToggleSelect && "mt-7")}>
                {pricingLabel(model.pricing_model, Number(model.price), model.currency)}
              </Badge>
            </div>


            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <TrustBadge tier={(model.trust_tier ?? "unproven") as TrustTier} />
              <FrequencyBadge
                frequency={(model.declared_frequency ?? "swing") as FrequencyClass}
                hosting={(model.hosting_mode ?? "hosted") as HostingMode}
                latencyMs={Number(model.measured_latency_ms ?? 0)}
              />
              {model.hosting_mode === "remote" ? <LatencyBadge latencyMs={Number(model.measured_latency_ms ?? 0)} /> : null}
              {model.promoted ? (
                <Badge variant="secondary" className="border-warning/50 text-warning">
                  Promoted
                </Badge>
              ) : null}
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              {model.contributor?.avatar_url ? (
                <img
                  src={model.contributor.avatar_url}
                  alt=""
                  className="h-5 w-5 rounded-full bg-muted"
                  loading="lazy"
                />
              ) : null}
              <span className="truncate">{model.contributor?.display_name ?? "Unknown"}</span>
              {model.contributor?.verified ? <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden /> : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="outline">{labelFor(ASSET_CLASSES, model.asset_class)}</Badge>
              <Badge variant="outline">{labelFor(STRATEGY_TYPES, model.strategy_type)}</Badge>
              <Badge variant="outline" className="mono">
                {model.timeframe}
              </Badge>
              <Badge variant="outline" className={riskTone(model.risk_level)}>
                {model.risk_level} risk
              </Badge>
              {model.overfitting_risk ? (
                <Badge variant="outline" className="gap-1 border-warning/60 text-warning">
                  <TriangleAlert className="h-3 w-3" aria-hidden /> Overfitting risk
                </Badge>
              ) : null}
            </div>

          </div>

          <div className={cn("mt-4 sm:mt-0", layout === "list" && "sm:w-[420px] sm:shrink-0")}>
            <div className="grid grid-cols-4 gap-2 rounded-md border border-border/60 bg-muted/30 p-2">
              {metrics.map((m) => (
                <div key={m.label} className="text-center">
                  <div className="text-[10px] tracking-wide text-muted-foreground uppercase">{m.label}</div>
                  <div className="mono text-sm font-semibold">{m.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden />
                <span className="mono">{fmtNum(Number(model.rating), 1)}</span>
                <span>({model.rating_count})</span>
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden />
                <span className="mono">{model.active_users.toLocaleString()}</span> active
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
