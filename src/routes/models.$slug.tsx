import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, ShieldCheck, Star, Users } from "lucide-react";
import { getPublicModel } from "@/lib/models.functions";
import { ApplyModelDialog } from "@/components/marketplace/apply-model-dialog";
import { MetricCard } from "@/components/metric-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { fmtDate, fmtNum, pnlClass } from "@/lib/format";
import { ASSET_CLASSES, STRATEGY_TYPES, labelFor, pricingLabel, riskTone } from "@/lib/marketplace";

const modelQuery = (slug: string) =>
  queryOptions({
    queryKey: ["public-model", slug],
    queryFn: () => getPublicModel({ data: { slug } }),
  });

export const Route = createFileRoute("/models/$slug")({
  loader: async ({ context, params }) => {
    const model = await context.queryClient.ensureQueryData(modelQuery(params.slug));
    if (!model) throw notFound();
    return model;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Model not found — AlgoForge" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} — AI trading model | AlgoForge`;
    const description = (loaderData.tagline ?? "Verified AI trading model on AlgoForge.").slice(0, 155);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: ModelNotFound,
  errorComponent: ModelNotFound,
  component: ModelDetail,
});

function ModelNotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Model unavailable</h1>
      <p className="mt-2 text-sm text-muted-foreground">This listing may have been delisted by its contributor.</p>
      <Button asChild className="mt-6">
        <Link to="/models">Back to marketplace</Link>
      </Button>
    </main>
  );
}

type Point = { t: string; v: number };

function ModelDetail() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(modelQuery(slug));
  const [applyOpen, setApplyOpen] = useState(false);
  if (!data) return <ModelNotFound />;

  const backtestSeries = ((data.backtest?.series as Point[] | null) ?? []).map((p) => ({ ...p, v: Number(p.v) }));
  const liveSeries = ((data.live?.series as Point[] | null) ?? []).map((p) => ({ ...p, v: Number(p.v) }));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/models">
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> All models
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{labelFor(ASSET_CLASSES, data.asset_class)}</Badge>
              <Badge variant="outline">{labelFor(STRATEGY_TYPES, data.strategy_type)}</Badge>
              <Badge variant="outline" className="mono">
                {data.timeframe}
              </Badge>
              <Badge variant="outline" className={riskTone(data.risk_level)}>
                {data.risk_level} risk
              </Badge>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{data.name}</h1>
            <p className="mt-2 text-muted-foreground">{data.tagline}</p>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              {data.contributor?.avatar_url ? (
                <img src={data.contributor.avatar_url} alt="" className="h-6 w-6 rounded-full bg-muted" />
              ) : null}
              <span>{data.contributor?.display_name}</span>
              {data.contributor?.verified ? <ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> : null}
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-warning text-warning" aria-hidden />
                <span className="mono">{fmtNum(Number(data.rating), 1)}</span>
                <span>({data.rating_count})</span>
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" aria-hidden />
                <span className="mono">{data.active_users.toLocaleString()}</span>
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <MetricCard label="Sharpe" value={fmtNum(Number(data.sharpe), 2)} tone="neutral" />
            <MetricCard label="Max drawdown" value={`-${fmtNum(Number(data.max_drawdown), 1)}%`} tone="loss" />
            <MetricCard label="Win rate" value={`${fmtNum(Number(data.win_rate), 1)}%`} />
            <MetricCard label="CAGR" value={`${fmtNum(Number(data.cagr), 1)}%`} tone="profit" />
          </div>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="backtest">Verified backtest</TabsTrigger>
              <TabsTrigger value="live">Live since listing</TabsTrigger>
              <TabsTrigger value="versions">Versions</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <Card className="border-border/70">
                <CardContent className="prose prose-invert max-w-none p-5 text-sm">
                  {(data.description ?? "").split("\n").map((line, i) =>
                    line.trim().startsWith("#") ? (
                      <h3 key={i} className="mt-4 text-base font-semibold">
                        {line.replace(/^#+\s*/, "")}
                      </h3>
                    ) : line.trim() ? (
                      <p key={i} className="mt-2 text-muted-foreground">
                        {line}
                      </p>
                    ) : null,
                  )}
                  <Separator className="my-4" />
                  <p className="text-xs text-muted-foreground">
                    Risk disclosure: {data.risk_disclosure ?? "Past performance does not guarantee future results."}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="backtest" className="mt-4">
              <EquityCard title="Out-of-sample equity curve" series={backtestSeries} />
            </TabsContent>

            <TabsContent value="live" className="mt-4">
              <EquityCard title="Live performance since listing" series={liveSeries} />
            </TabsContent>

            <TabsContent value="versions" className="mt-4 space-y-3">
              {data.versions.map((v) => (
                <Card key={v.id} className="border-border/70">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="mono font-semibold">v{v.version}</span>
                      <span className="text-xs text-muted-foreground">
                        {v.is_current ? "Current · " : ""}
                        {fmtDate(v.released_at)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">{v.changelog}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="reviews" className="mt-4 space-y-3">
              {data.reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                data.reviews.map((r) => (
                  <Card key={r.id} className="border-border/70">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{r.author_name}</span>
                        <span className="mono flex items-center gap-1 text-xs">
                          <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden />
                          {r.rating}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground">{r.comment}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{fmtDate(r.created_at)}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">
                {pricingLabel(data.pricing_model, Number(data.price), data.currency)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" size="lg" onClick={() => setApplyOpen(true)}>
                Use this model
              </Button>
              <p className="text-xs text-muted-foreground">
                Deploy to paper trading first. Cancel or pause anytime from My Strategies.
              </p>
              <Separator />
              <Row label="Live 30d" value={`${fmtNum(Number(data.live_return_30d), 2)}%`} cls={pnlClass(Number(data.live_return_30d))} />
              <Row label="Active users" value={data.active_users.toLocaleString()} />
              <Row label="Listed" value={data.listed_at ? fmtDate(data.listed_at) : "—"} />
            </CardContent>
          </Card>
        </aside>
      </div>

      <ApplyModelDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        model={{
          id: data.id,
          slug: data.slug,
          name: data.name,
          pricing_model: data.pricing_model,
          price: Number(data.price),
          currency: data.currency,
        }}
      />
    </main>
  );
}

function Row({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`mono font-medium ${cls ?? ""}`}>{value}</span>
    </div>
  );
}

function EquityCard({ title, series }: { title: string; series: Point[] }) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        {series.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data recorded yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="t" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" minTickGap={40} />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={60} />
              <ReTooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="v" stroke="var(--color-primary)" fill="url(#eq)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
