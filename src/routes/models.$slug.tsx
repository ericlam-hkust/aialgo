import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, BadgeCheck, ShieldCheck, Star, Users } from "lucide-react";
import { getPublicModel, submitReview } from "@/lib/models.functions";
import { getReviewEligibility } from "@/lib/activations.functions";
import { daysSince, modelBadges } from "@/lib/model-badges";
import { BacktestReportView } from "@/components/marketplace/backtest-report";
import type { BacktestReport } from "@/lib/backtest-protocol";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const currentVersion = data?.versions.find((v) => v.is_current)?.version ?? data?.versions[0]?.version ?? "";
  const [selectedVersion, setSelectedVersion] = useState(currentVersion);
  const versionReports = (data?.versionReports ?? []).map((v) => ({
    version: v.version,
    report: (v.job.results as unknown as BacktestReport | null) ?? null,
    completedAt: v.job.completed_at,
  }));
  const [reportVersion, setReportVersion] = useState(versionReports[0]?.version ?? "");
  const activeReport =
    versionReports.find((v) => v.version === reportVersion)?.report ?? versionReports[0]?.report ?? null;
  const latestWalkForward = versionReports[0]?.report?.walkForward ?? null;
  if (!data) return <ModelNotFound />;


  const badges = modelBadges({
    hasBacktest: Boolean(data.backtest),
    liveDays: daysSince(data.listed_at),
    rating: Number(data.rating),
    ratingCount: Number(data.rating_count),
  });
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
            <div className="mt-3 flex flex-wrap gap-2">
              {data.verifiedBacktest ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  Platform Verified Backtest
                  {data.last_validated_at ? ` · ${new Date(data.last_validated_at).toISOString().slice(0, 10)}` : ""}
                </span>
              ) : null}
            </div>
            {badges.length ? (
              <div className="mt-3 flex flex-wrap gap-2">

                {badges.map((b) => (
                  <span
                    key={b.key}
                    title={b.hint}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                    {b.label}
                  </span>
                ))}
              </div>
            ) : null}
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

            <TabsContent value="backtest" className="mt-4 space-y-4">
              {versionReports.length ? (
                <>
                  {versionReports.length > 1 ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm text-muted-foreground">Verified report for version</span>
                      <Select value={reportVersion} onValueChange={setReportVersion}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Version" />
                        </SelectTrigger>
                        <SelectContent>
                          {versionReports.map((v) => (
                            <SelectItem key={v.version} value={v.version}>
                              v{v.version}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  {activeReport ? (
                    <BacktestReportView report={activeReport} variant="verified" title={`Version ${reportVersion}`} />
                  ) : null}
                </>
              ) : (
                <EquityCard title="Out-of-sample equity curve" series={backtestSeries} />
              )}
            </TabsContent>


            <TabsContent value="live" className="mt-4 space-y-4">
              {data.divergence_flagged ? (
                <div className="rounded-md border border-warning/50 bg-warning/10 p-3 text-sm text-warning">
                  Live performance has diverged materially from the verified backtest. Subscribers have been notified.
                </div>
              ) : null}
              <div className="grid gap-4 lg:grid-cols-2">
                <EquityCard title="Verified backtest" series={backtestSeries} />
                <EquityCard title="Live performance since listing" series={liveSeries} />
              </div>
            </TabsContent>


            <TabsContent value="versions" className="mt-4 space-y-3">
              {data.versions.length > 1 ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Viewing changelog for</span>
                  <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Version" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.versions.map((v) => (
                        <SelectItem key={v.id} value={v.version}>
                          v{v.version}
                          {v.is_current ? " (latest)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {data.versions.map((v) => (
                <Card
                  key={v.id}
                  className={v.version === selectedVersion ? "border-primary/60" : "border-border/70"}
                >
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
              <ReviewForm modelId={data.id} slug={data.slug} />
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
              <Row label="Latest version" value={currentVersion ? `v${currentVersion}` : "—"} />
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

function ReviewForm({ modelId, slug }: { modelId: string; slug: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const eligibility = useQuery({
    queryKey: ["review-eligibility", modelId],
    queryFn: () => getReviewEligibility({ data: { modelId } }),
    enabled: Boolean(user),
  });

  const post = useMutation({
    mutationFn: () => submitReview({ data: { modelId, rating, comment } }),
    onSuccess: () => {
      toast.success("Review posted");
      setComment("");
      void qc.invalidateQueries({ queryKey: ["public-model", slug] });
      void qc.invalidateQueries({ queryKey: ["review-eligibility", modelId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) {
    return (
      <Card className="border-border/70">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Sign in and run this model for 7+ days to leave a verified rating.
        </CardContent>
      </Card>
    );
  }

  const e = eligibility.data;
  if (!e) return null;

  if (!e.eligible) {
    return (
      <Card className="border-border/70">
        <CardContent className="p-4 text-sm text-muted-foreground">
          {e.hasActivation
            ? `Verified reviews unlock after ${e.minDays} days of running this model — you are on day ${e.daysActive}.`
            : `Only traders who have run this model for ${e.minDays}+ days can rate it.`}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Your rating</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
              <Star
                className={`h-5 w-5 ${n <= rating ? "fill-warning text-warning" : "text-muted-foreground"}`}
                aria-hidden
              />
            </button>
          ))}
          <Badge variant="outline" className="ml-auto">
            Verified · {e.daysActive}d running
          </Badge>
        </div>
        <Textarea
          value={comment}
          onChange={(ev) => setComment(ev.target.value)}
          placeholder="How did this model perform against your expectations?"
          rows={3}
        />
        <Button size="sm" onClick={() => post.mutate()} disabled={post.isPending || comment.trim().length < 10}>
          {e.existingReview ? "Update review" : "Post review"}
        </Button>
      </CardContent>
    </Card>
  );
}
