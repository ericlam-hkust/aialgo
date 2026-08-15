import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, Database, Loader2, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";

import {
  getStrategyListing,
  publishStrategyListing,
  saveListingDetails,
  saveListingPricing,
  publishListingPublicly,
} from "@/lib/algo-listing.functions";
import { advanceBacktestJob, submitForValidation, checkDataAvailability } from "@/lib/backtest-validation.functions";
import { listDataSources } from "@/lib/data-sources.functions";
import { DATA_INPUTS, SIGNAL_FREQUENCIES, type BacktestConfig, type BacktestReport } from "@/lib/backtest-protocol";
import { repriceListing, setListingPricingMode } from "@/lib/pricing.functions";
import { suggestPricing } from "@/lib/pricing-suggestion";
import { ASSET_CLASSES, PRICING_MODELS, RISK_LEVELS, STRATEGY_TYPES, TIMEFRAMES, pricingLabel } from "@/lib/marketplace";
import { BacktestReportView } from "@/components/marketplace/backtest-report";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/strategies/list/$id")({
  head: () => ({
    meta: [
      { title: "List strategy on the marketplace — aiAlgo" },
      {
        name: "description",
        content:
          "Publish an algo strategy: verified platform backtest, data source attribution and a data-driven price suggestion.",
      },
      { property: "og:title", content: "List strategy on the marketplace — aiAlgo" },
      {
        property: "og:description",
        content: "Run the platform backtest, review win rate and drawdown, and price your strategy with confidence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ListStrategyWizard,
});

const STEPS = ["Listing details", "Verified backtest", "Pricing", "Publish"] as const;

function ListStrategyWizard() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const state = useQuery({
    queryKey: ["strategy-listing", id],
    queryFn: () => getStrategyListing({ data: { strategyId: id } }),
  });
  const listing = state.data?.listing ?? null;
  const strategy = state.data?.strategy ?? null;

  const create = useMutation({
    mutationFn: () => publishStrategyListing({ data: { strategyId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["strategy-listing", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  // A listing row must exist before any wizard step can persist anything.
  useEffect(() => {
    if (state.isSuccess && !listing && !create.isPending && !create.isSuccess) create.mutate();
  }, [state.isSuccess, listing, create]);

  if (state.isLoading || (!listing && !state.isError)) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Preparing your listing…
      </div>
    );
  }
  if (state.isError || !listing || !strategy) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {(state.error as Error | null)?.message ?? "This strategy could not be loaded."}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link to="/dashboard/strategies">
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> My strategies
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">List “{listing.name}” on the marketplace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every listing is backed by a platform-run backtest. Results, data source and price are stored with the listing.
        </p>
      </div>

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                i === step
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {i + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <DetailsStep listing={listing} onSaved={() => setStep(1)} strategyId={id} />
      ) : null}
      {step === 1 ? (
        <BacktestStep listing={listing} jobs={state.data?.jobs ?? []} strategyId={id} onDone={() => setStep(2)} />
      ) : null}
      {step === 2 ? <PricingStep listing={listing} strategyId={id} onSaved={() => setStep(3)} /> : null}
      {step === 3 ? (
        <PublishStep
          listing={listing}
          strategyId={id}
          onPublished={(slug) => navigate({ to: "/marketplace/$slug", params: { slug } })}
        />
      ) : null}
    </div>
  );
}

type Listing = NonNullable<Awaited<ReturnType<typeof getStrategyListing>>["listing"]>;
type Job = Awaited<ReturnType<typeof getStrategyListing>>["jobs"][number];

function DetailsStep({ listing, strategyId, onSaved }: { listing: Listing; strategyId: string; onSaved: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: listing.name,
    tagline: listing.tagline ?? "",
    description: listing.description ?? "",
    riskDisclosure: listing.risk_disclosure ?? "",
    tags: (listing.tags ?? []).join(", "),
    assetClass: listing.asset_class ?? "stocks",
    strategyType: listing.strategy_type ?? "momentum",
    timeframe: listing.timeframe ?? "1d",
    riskLevel: listing.risk_level ?? "medium",
  });

  const save = useMutation({
    mutationFn: () =>
      saveListingDetails({
        data: {
          listingId: listing.id,
          name: form.name,
          tagline: form.tagline,
          description: form.description,
          riskDisclosure: form.riskDisclosure,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
          assetClass: form.assetClass,
          strategyType: form.strategyType,
          timeframe: form.timeframe,
          riskLevel: form.riskLevel as "low" | "medium" | "high",
        },
      }),
    onSuccess: () => {
      toast.success("Listing details saved");
      qc.invalidateQueries({ queryKey: ["strategy-listing", strategyId] });
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listing details</CardTitle>
        <CardDescription>What consumers see in the marketplace before they buy.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              maxLength={140}
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder="Trend-following on HK large caps"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desc">Description</Label>
          <Textarea
            id="desc"
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="How the strategy works, what market conditions suit it, and what it avoids."
          />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Asset class">
            <Select value={form.assetClass} onValueChange={(v) => setForm({ ...form, assetClass: v as typeof form.assetClass })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSET_CLASSES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Strategy type">
            <Select value={form.strategyType} onValueChange={(v) => setForm({ ...form, strategyType: v as typeof form.strategyType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STRATEGY_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Timeframe">
            <Select value={form.timeframe} onValueChange={(v) => setForm({ ...form, timeframe: v as typeof form.timeframe })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEFRAMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Risk level">
            <Select value={form.riskLevel} onValueChange={(v) => setForm({ ...form, riskLevel: v as typeof form.riskLevel })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RISK_LEVELS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input id="tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="risk">Risk disclosure</Label>
            <Input
              id="risk"
              value={form.riskDisclosure}
              onChange={(e) => setForm({ ...form, riskDisclosure: e.target.value })}
              placeholder="Leverage, concentration or liquidity risks buyers should know."
            />
          </div>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save and continue"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function BacktestStep({
  listing,
  jobs,
  strategyId,
  onDone,
}: {
  listing: Listing;
  jobs: Job[];
  strategyId: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const sources = useQuery({ queryKey: ["data-sources"], queryFn: () => listDataSources() });
  const saved = (listing.backtest_config ?? {}) as Partial<BacktestConfig>;

  const [universe, setUniverse] = useState((saved.universe ?? ["0700.HK", "AAPL"]).join(", "));
  const [timeframe, setTimeframe] = useState<BacktestConfig["timeframe"]>(saved.timeframe ?? "1d");
  const [signalFrequency, setSignalFrequency] = useState(saved.signalFrequency ?? "daily");
  const [inputs, setInputs] = useState<string[]>(saved.dataInputs ?? ["ohlcv", "indicators"]);
  const [sourceValue, setSourceValue] = useState(
    saved.dataSourceKind === "contributor" && saved.dataSourceId ? saved.dataSourceId : "platform",
  );

  const symbols = universe.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const availability = useQuery({
    queryKey: ["data-availability", symbols.join(","), timeframe],
    queryFn: () => checkDataAvailability({ data: { symbols, timeframe } }),
    enabled: symbols.length > 0 && sourceValue === "platform",
  });

  const activeJob = jobs.find((j) => j.status === "running") ?? jobs[0] ?? null;
  const [jobId, setJobId] = useState<string | null>(activeJob?.status === "running" ? activeJob.id : null);

  const poll = useQuery({
    queryKey: ["listing-job", jobId],
    queryFn: () => advanceBacktestJob({ data: { jobId: jobId! } }),
    enabled: Boolean(jobId),
    refetchInterval: (q) => {
      const s = (q.state.data as { status?: string } | undefined)?.status;
      return s === "completed" || s === "failed" ? false : 2500;
    },
  });

  useEffect(() => {
    const s = (poll.data as { status?: string } | undefined)?.status;
    if (s === "completed" || s === "failed") {
      qc.invalidateQueries({ queryKey: ["strategy-listing", strategyId] });
    }
  }, [poll.data, qc, strategyId]);

  const connection = (sources.data?.connections ?? []).find((c) => c.id === sourceValue);
  const sourceLabel =
    sourceValue === "platform"
      ? "aiAlgo platform market data"
      : `${connection?.label ?? connection?.provider ?? "Contributor feed"} (own connection)`;

  const run = useMutation({
    mutationFn: () => {
      const config: BacktestConfig = {
        assetClass: listing.asset_class ?? "stocks",
        universe: symbols,
        timeframe,
        signalFrequency,
        minimumCapital: 100_000,
        dataInputs: inputs,
        dataSourceKind: sourceValue === "platform" ? "platform" : "contributor",
        dataSourceLabel: sourceLabel,
        ...(sourceValue === "platform" ? {} : { dataSourceId: sourceValue }),
      };
      return submitForValidation({ data: { modelId: listing.id, config } });
    },
    onSuccess: (res) => {
      setJobId(res.jobId);
      toast.success("Platform backtest queued");
      qc.invalidateQueries({ queryKey: ["strategy-listing", strategyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const latest = jobs.find((j) => j.status === "completed") ?? null;
  const report = (latest?.results as unknown as BacktestReport | null) ?? null;
  const live = (poll.data as { status?: string; progress?: number; stage_message?: string } | null) ?? null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Verified platform backtest</CardTitle>
          <CardDescription>
            We re-run your strategy under the platform protocol (slippage, fees, holdout period and walk-forward
            windows). The data source you pick is recorded on the public listing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="universe">Instruments</Label>
              <Input id="universe" value={universe} onChange={(e) => setUniverse(e.target.value)} />
            </div>
            <Field label="Data source used for this backtest">
              <Select value={sourceValue} onValueChange={setSourceValue}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">aiAlgo platform market data</SelectItem>
                  {(sources.data?.connections ?? [])
                    .filter((c) => c.enabled)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label ?? c.provider} — my connection
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Timeframe">
              <Select value={timeframe} onValueChange={(v) => setTimeframe(v as BacktestConfig["timeframe"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["1m", "5m", "1h", "1d"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Signal frequency">
              <Select value={signalFrequency} onValueChange={setSignalFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SIGNAL_FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="space-y-2">
            <Label>Data inputs</Label>
            <div className="flex flex-wrap gap-2">
              {DATA_INPUTS.map((d) => {
                const on = inputs.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setInputs(on ? inputs.filter((i) => i !== d.value) : [...inputs, d.value])}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Database className="h-3.5 w-3.5" aria-hidden /> {sourceLabel}
            </div>
            {sourceValue === "platform" ? (
              <ul className="mt-2 space-y-1">
                {(availability.data ?? []).map((a) => (
                  <li key={a.symbol} className={a.ok ? "" : "text-warning"}>
                    {a.ok ? "✓" : "!"} {a.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2">
                Results will be attributed to your own provider connection. Consumers see this on the listing page.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => run.mutate()} disabled={run.isPending || symbols.length === 0}>
              {run.isPending ? "Queuing…" : "Run platform backtest"}
            </Button>
            {report ? (
              <Button variant="outline" onClick={onDone}>
                Continue to pricing
              </Button>
            ) : null}
          </div>

          {live && live.status === "running" ? (
            <div className="space-y-2">
              <Progress value={live.progress ?? 0} />
              <p className="text-xs text-muted-foreground">{live.stage_message}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {report ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard label="Win rate" value={`${fmtNum(report.metrics.winRate, 1)}%`} />
            <MetricCard
              label="Loss rate"
              value={`${fmtNum(100 - report.metrics.winRate, 1)}%`}
            />
            <MetricCard label="Max drawdown" value={`${fmtNum(report.metrics.maxDrawdown, 1)}%`} />
            <MetricCard label="Sharpe" value={fmtNum(report.metrics.sharpe, 2)} />
            <MetricCard
              label="Total return"
              value={`${fmtNum(report.metrics.totalReturn, 1)}%`}
              tone={report.metrics.totalReturn >= 0 ? "profit" : "loss"}
            />
          </div>
          <BacktestReportView report={report} variant="verified" title="Platform verified report" />
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No verified backtest yet — run the platform backtest to generate the results shown on your listing.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PricingStep({ listing, strategyId, onSaved }: { listing: Listing; strategyId: string; onSaved: () => void }) {
  const qc = useQueryClient();
  const hasBacktest = Boolean(listing.backtest_ran_at);
  const suggestion = useMemo(
    () =>
      suggestPricing(
        {
          sharpe: Number(listing.sharpe ?? 0),
          maxDrawdown: Number(listing.max_drawdown ?? 0),
          winRate: Number(listing.win_rate ?? 0),
          profitFactor: Number(listing.profit_factor ?? 0),
          consistencyScore: Number(listing.consistency_score ?? 0),
          trades: Number(listing.total_trades ?? 0),
          overfittingRisk: Boolean(listing.overfitting_risk),
          cagr: Number(listing.cagr ?? 0),
        },
        listing.currency ?? "HKD",
      ),
    [listing],
  );
  const [pricingModel, setPricingModel] = useState(listing.pricing_model ?? "subscription");
  const [price, setPrice] = useState(String(Number(listing.price) || suggestion.suggested));
  const [mode, setMode] = useState<"builder" | "platform">(listing.pricing_mode ?? "builder");

  const applyMode = useMutation({
    mutationFn: (next: "builder" | "platform") => setListingPricingMode({ data: { listingId: listing.id, mode: next } }),
    onSuccess: (res) => {
      setMode(res.mode);
      if (res.price != null) {
        setPrice(String(res.price));
        toast.success(res.summary ?? "aiAlgo priced this listing");
      } else {
        toast.success("You control this price");
      }
      qc.invalidateQueries({ queryKey: ["strategy-listing", strategyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reprice = useMutation({
    mutationFn: () => repriceListing({ data: { listingId: listing.id } }),
    onSuccess: (res) => {
      if (res.price != null) setPrice(String(res.price));
      toast.success(res.summary || "Repriced");
      qc.invalidateQueries({ queryKey: ["strategy-listing", strategyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () =>
      saveListingPricing({
        data: {
          listingId: listing.id,
          pricingModel: pricingModel as "one_time" | "subscription" | "per_signal",
          price: Number(price),
          suggestedPrice: suggestion.suggested,
          pricingScore: suggestion.score,
        },
      }),
    onSuccess: () => {
      toast.success("Pricing saved");
      qc.invalidateQueries({ queryKey: ["strategy-listing", strategyId] });
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!hasBacktest) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Run the verified backtest first — pricing is derived from those results.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Suggested price
          </CardTitle>
          <CardDescription>{suggestion.summary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold">{suggestion.score}</span>
            <span className="text-sm text-muted-foreground">/ 100 performance score · {suggestion.grade}</span>
          </div>
          <Separator />
          <ul className="space-y-3">
            {suggestion.factors.map((f) => (
              <li key={f.key}>
                <div className="flex items-center justify-between text-sm">
                  <span>{f.label}</span>
                  <span className="mono text-xs text-muted-foreground">
                    {Math.round(f.score)}/100 · weight {Math.round(f.weight * 100)}%
                  </span>
                </div>
                <Progress value={f.score} className="mt-1.5 h-1.5" />
                <p className="mt-1 text-xs text-muted-foreground">{f.detail}</p>
              </li>
            ))}
          </ul>
          {suggestion.penalties.length ? (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
              {suggestion.penalties.map((p) => (
                <div key={p} className="flex items-start gap-1.5">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {p}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your price</CardTitle>
          <CardDescription>
            Platform commission is 20%. You keep 80% of every sale plus your share of performance fees.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Who sets the price?</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                { key: "builder", label: "I set it", hint: "You choose the price and it never changes on its own." },
                { key: "platform", label: "aiAlgo sets it", hint: "Priced automatically from performance, likes and comment sentiment." },
              ] as const).map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => applyMode.mutate(o.key)}
                  disabled={applyMode.isPending}
                  className={`rounded-lg border p-3 text-left text-sm transition ${
                    mode === o.key ? "border-primary bg-primary/10" : "border-border/70 hover:border-primary/50"
                  }`}
                >
                  <span className="font-medium">{o.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{o.hint}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Buyers always see which of the two set the price on your listing.
            </p>
          </div>
          <Field label="Pricing model">
            <Select value={pricingModel} onValueChange={(v) => setPricingModel(v as typeof pricingModel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRICING_MODELS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="space-y-1.5">
            <Label htmlFor="price">Price ({listing.currency ?? "HKD"})</Label>
            <Input id="price" type="number" min={0} value={price} disabled={mode === "platform"} onChange={(e) => setPrice(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Suggested range {suggestion.min}–{suggestion.max}. Tap to use {suggestion.suggested}.
            </p>
            <Button variant="outline" size="sm" onClick={() => setPrice(String(suggestion.suggested))}>
              Use suggested price
            </Button>
          </div>
          {mode === "platform" ? (
            <Button variant="outline" className="w-full" onClick={() => reprice.mutate()} disabled={reprice.isPending}>
              {reprice.isPending ? "Recomputing…" : "Recompute aiAlgo price now"}
            </Button>
          ) : null}
          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending || mode === "platform"}>
            {save.isPending ? "Saving…" : mode === "platform" ? "Managed by aiAlgo" : "Save pricing"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PublishStep({
  listing,
  strategyId,
  onPublished,
}: {
  listing: Listing;
  strategyId: string;
  onPublished: (slug: string) => void;
}) {
  const qc = useQueryClient();
  const publish = useMutation({
    mutationFn: () => publishListingPublicly({ data: { listingId: listing.id } }),
    onSuccess: (res) => {
      toast.success("Listed on the marketplace");
      qc.invalidateQueries({ queryKey: ["strategy-listing", strategyId] });
      onPublished(res.slug);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ready = Boolean(listing.backtest_ran_at) && listing.status === "live";
  const isPublic = listing.visibility === "public";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review and publish</CardTitle>
        <CardDescription>Once public, consumers can find, purchase and run this strategy.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          <Row label="Listing">{listing.name}</Row>
          <Row label="Price">
            {pricingLabel(
              (listing.pricing_model ?? "subscription") as "one_time" | "subscription" | "per_signal",
              Number(listing.price),
              listing.currency ?? "HKD",
            )}
          </Row>
          <Row label="Win rate / loss rate">
            {fmtNum(Number(listing.win_rate ?? 0), 1)}% / {fmtNum(Number(listing.loss_rate ?? 0), 1)}%
          </Row>
          <Row label="Max drawdown">{fmtNum(Number(listing.max_drawdown ?? 0), 1)}%</Row>
          <Row label="Sharpe / profit factor">
            {fmtNum(Number(listing.sharpe ?? 0), 2)} / {fmtNum(Number(listing.profit_factor ?? 0), 2)}
          </Row>
          <Row label="Trades">{listing.total_trades ?? 0}</Row>
          <Row label="Data source">{listing.data_source_label ?? "—"}</Row>
          <Row label="Backtest run at">
            {listing.backtest_ran_at ? new Date(listing.backtest_ran_at).toLocaleString() : "Not run"}
          </Row>
        </dl>

        {ready ? (
          <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden /> Verified backtest attached — ready to publish.
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
            <TriangleAlert className="h-4 w-4" aria-hidden /> A passing platform backtest is required before listing.
          </div>
        )}

        {isPublic ? (
          <div className="flex items-center gap-2">
            <Badge className="gap-1">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Live on the marketplace
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link to="/marketplace/$slug" params={{ slug: listing.slug }}>
                View public listing
              </Link>
            </Button>
          </div>
        ) : (
          <Button onClick={() => publish.mutate()} disabled={!ready || publish.isPending}>
            {publish.isPending ? "Publishing…" : "Publish to marketplace"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}
