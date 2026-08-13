import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen, Boxes, CalendarRange, Cpu, GitBranch, Info, Timer } from "lucide-react";
import { listBaseModels } from "@/lib/base-models.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtNum } from "@/lib/format";

const basesQuery = queryOptions({ queryKey: ["base-models"], queryFn: () => listBaseModels() });

export const Route = createFileRoute("/marketplace/base-models/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(basesQuery),
  head: () => ({
    meta: [
      { title: "Base Models — pretrained trading foundations | aiAlgo" },
      {
        name: "description",
        content:
          "Start from platform-pretrained trading base models. Fine-tune locally or in the cloud and publish your own verified derivative strategy on aiAlgo.",
      },
      { property: "og:title", content: "Base Models — pretrained trading foundations | aiAlgo" },
      {
        property: "og:description",
        content: "Pretrained momentum, mean-reversion and grid base models you can fine-tune into your own listing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BaseModelLibrary,
});

function BaseModelLibrary() {
  const { data } = useSuspenseQuery(basesQuery);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Base Models</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Platform-pretrained foundations for trading models. Fine-tune one on your own instruments and publish the
            derivative — every derivative still has to pass its own platform backtest.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/marketplace/fine-tuning-guide">
            <BookOpen className="mr-1.5 h-4 w-4" aria-hidden /> Fine-tuning guide
          </Link>
        </Button>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        Base models are not directly subscribable — they exist only as foundations. Fine-tune one to create a model
        traders can subscribe to.
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((b) => (
          <Card key={b.id} className="flex flex-col border-border/70">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="mono text-base">{b.name}</CardTitle>
                <Badge variant="outline">v{b.version}</Badge>
              </div>
              <CardDescription>{b.tagline}</CardDescription>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Cpu className="h-3.5 w-3.5" aria-hidden /> {b.architecture}
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-start gap-1.5 text-muted-foreground">
                  <Boxes className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    Pretrained on {b.instruments.join(", ")} · {b.timeframes.join(" / ")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarRange className="h-3.5 w-3.5" aria-hidden /> {b.data_start} → {b.data_end}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Timer className="h-3.5 w-3.5" aria-hidden /> {b.compute_estimate}
                </div>
              </div>

              <div className="rounded-md border border-border/70 bg-muted/20 p-2.5">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <Metric label="Sharpe" value={fmtNum(Number(b.baseline_metrics.sharpe ?? 0), 2)} />
                  <Metric label="CAGR" value={`${fmtNum(Number(b.baseline_metrics.cagr ?? 0) * 100, 1)}%`} />
                  <Metric label="Max DD" value={`${fmtNum(Number(b.baseline_metrics.maxDrawdown ?? 0) * 100, 1)}%`} />
                  <Metric label="Win" value={`${fmtNum(Number(b.baseline_metrics.winRate ?? 0) * 100, 0)}%`} />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Base performance — derivatives must pass their own backtest.
                </p>
              </div>

              <div className="text-muted-foreground">
                Expects: <span className="mono">{b.feature_schema.map((f) => f.field).join(", ")}</span>
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <GitBranch className="h-3.5 w-3.5" aria-hidden /> {b.derivativeCount} published derivative
                  {b.derivativeCount === 1 ? "" : "s"}
                </span>
                <Button asChild size="sm">
                  <Link to="/marketplace/base-models/$id" params={{ id: b.id }}>
                    Use this base
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mono text-sm">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
