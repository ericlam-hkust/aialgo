import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, ArrowRight, CheckCircle2, Cloud, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { getBaseModel } from "@/lib/base-models.functions";
import { advanceFineTune, getFineTuneJob, publishFineTune, startFineTune, type FineTuneParams } from "@/lib/fine-tune.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/models/fine-tune/$id")({
  component: FineTuneWizard,
});

const STEPS = ["Instruments", "Parameters", "Training", "Publish"] as const;

const INSTRUMENT_POOL = [
  "ETH/USDT",
  "SOL/USDT",
  "BTC/USDT",
  "0700.HK",
  "9988.HK",
  "AAPL",
  "TSLA",
  "SPY",
  "QQQ",
];

function FineTuneWizard() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState("1h");
  const [jobId, setJobId] = useState<string | null>(null);
  const [params, setParams] = useState<FineTuneParams>({
    entryThreshold: 0.6,
    exitThreshold: 0.4,
    trainingWindowMonths: 18,
    epochs: 8,
    learningRate: 0.0005,
  });
  const [listing, setListing] = useState({ name: "", slug: "", tagline: "", feePct: 15 });

  const baseFn = useServerFn(getBaseModel);
  const { data: base } = useQuery({ queryKey: ["base-model", id], queryFn: () => baseFn({ data: { id } }) });

  useEffect(() => {
    if (!base) return;
    setTimeframe((t) => (base.timeframes.includes(t) ? t : (base.timeframes[0] ?? t)));
    setParams((p) => ({
      ...p,
      entryThreshold: base.recommended_settings.entryThreshold ?? p.entryThreshold,
      exitThreshold: base.recommended_settings.exitThreshold ?? p.exitThreshold,
      trainingWindowMonths: base.recommended_settings.trainingWindowMonths ?? p.trainingWindowMonths,
      epochs: base.recommended_settings.epochs ?? p.epochs,
      learningRate: base.recommended_settings.learningRate ?? p.learningRate,
    }));
  }, [base]);

  const startFn = useServerFn(startFineTune);
  const advanceFn = useServerFn(advanceFineTune);
  const jobFn = useServerFn(getFineTuneJob);
  const publishFn = useServerFn(publishFineTune);

  const start = useMutation({
    mutationFn: () => startFn({ data: { baseModelId: id, instruments, timeframe, params } }),
    onSuccess: (r) => {
      setJobId(r.jobId);
      setStep(2);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: job } = useQuery({
    queryKey: ["fine-tune-job", jobId],
    enabled: !!jobId,
    refetchInterval: (q) => ((q.state.data as { status?: string } | undefined)?.status === "running" ? 1200 : false),
    queryFn: async () => {
      const j = await jobFn({ data: { jobId: jobId! } });
      if (j && j.status === "running") return await advanceFn({ data: { jobId: jobId! } });
      return j;
    },
  });

  const curve = useMemo(
    () => (job?.loss_curve ?? []) as unknown as { epoch: number; train: number; val: number }[],
    [job],
  );
  const trained = job?.status === "trained" || job?.status === "published";

  const publish = useMutation({
    mutationFn: () =>
      publishFn({
        data: {
          jobId: jobId!,
          name: listing.name.trim(),
          slug: listing.slug.trim(),
          tagline: listing.tagline.trim(),
          feePct: listing.feePct,
        },
      }),
    onSuccess: () => {
      toast.success("Derivative submitted — backtest validation is running.");
      navigate({ to: "/dashboard/models/backtests" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (sym: string) =>
    setInstruments((prev) => (prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="space-y-1.5">
        <Link to="/dashboard/resource-library" className="text-xs text-muted-foreground hover:underline">
          ← Resource Library
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Cloud className="h-5 w-5 text-primary" aria-hidden /> Cloud fine-tune
        </h1>
        <p className="text-sm text-muted-foreground">
          Fine-tuning <span className="mono">aialgo/{id}</span>
          {base ? ` v${base.version}` : ""} — free for contributors. The result goes straight into the mandatory
          platform backtest.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => (
          <Badge key={s} variant={i === step ? "default" : i < step ? "secondary" : "outline"} className="gap-1">
            {i < step ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : null}
            {s}
          </Badge>
        ))}
      </div>

      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Instruments & timeframe</CardTitle>
            <CardDescription>
              Pick what this derivative should specialise in. The base feature schema stays locked.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {INSTRUMENT_POOL.map((sym) => (
                <label
                  key={sym}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md border border-border/70 p-2.5 text-sm",
                    instruments.includes(sym) && "border-primary/60 bg-primary/5",
                  )}
                >
                  <Checkbox checked={instruments.includes(sym)} onCheckedChange={() => toggle(sym)} />
                  <span className="mono text-xs">{sym}</span>
                </label>
              ))}
            </div>
            <div className="max-w-xs space-y-1.5">
              <Label>Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(base?.timeframes ?? ["1h"]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button disabled={!instruments.length} onClick={() => setStep(1)}>
                Continue <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fine-tune parameters</CardTitle>
            <CardDescription>Only trainable layers and thresholds — frozen layers are untouched.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <SliderRow
              label="Entry threshold"
              value={params.entryThreshold}
              min={0.5}
              max={0.95}
              step={0.01}
              onChange={(v) => setParams({ ...params, entryThreshold: v })}
            />
            <SliderRow
              label="Exit threshold"
              value={params.exitThreshold}
              min={0.05}
              max={0.6}
              step={0.01}
              onChange={(v) => setParams({ ...params, exitThreshold: v })}
            />
            <SliderRow
              label="Training window (months)"
              value={params.trainingWindowMonths}
              min={6}
              max={48}
              step={1}
              format={(v) => `${v} mo`}
              onChange={(v) => setParams({ ...params, trainingWindowMonths: v })}
            />
            <SliderRow
              label="Epochs"
              value={params.epochs}
              min={2}
              max={24}
              step={1}
              format={(v) => String(v)}
              onChange={(v) => setParams({ ...params, epochs: v })}
            />
            <div className="max-w-xs space-y-1.5">
              <Label>Learning rate</Label>
              <Input
                type="number"
                step="0.0001"
                value={params.learningRate}
                onChange={(e) => setParams({ ...params, learningRate: Number(e.target.value) })}
              />
            </div>
            {params.trainingWindowMonths < 12 ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-xs text-destructive">
                Short training windows overfit easily — walk-forward consistency will be scrutinised.
              </p>
            ) : null}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>
                <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Back
              </Button>
              <Button onClick={() => start.mutate()} disabled={start.isPending}>
                {start.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />}
                Start training
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sandbox training</CardTitle>
            <CardDescription>{job?.stage_message ?? "Starting…"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={job?.progress ?? 0} />
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curve} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="epoch" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, "auto"]} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      fontSize: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="train" stroke="var(--color-primary)" dot={false} name="Train loss" />
                  <Line type="monotone" dataKey="val" stroke="var(--color-muted-foreground)" dot={false} name="Val loss" strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              When training finishes, the derivative is submitted to the same backtest validation every listing passes.
              Lineage alone never grants a trust badge.
            </div>
            <div className="flex justify-end">
              <Button
                disabled={!trained}
                onClick={() => {
                  setListing((l) => ({
                    ...l,
                    name: l.name || `${id.replace("-base", "")}-${(instruments[0] ?? "").split("/")[0]?.toLowerCase()}`,
                    slug:
                      l.slug ||
                      `${id.replace("-base", "")}-${(instruments[0] ?? "").split("/")[0]?.toLowerCase()}-${timeframe}`,
                  }));
                  setStep(3);
                }}
              >
                {trained ? "Review & publish" : "Training…"}
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publish derivative</CardTitle>
            <CardDescription>
              Same fee mechanics, watermarks, trust tiers and leaderboards as any other listing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Model name</Label>
                <Input value={listing.name} onChange={(e) => setListing({ ...listing, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input
                  value={listing.slug}
                  onChange={(e) => setListing({ ...listing, slug: e.target.value.toLowerCase() })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tagline</Label>
              <Input
                value={listing.tagline}
                placeholder="Mean reversion tuned for ETH and SOL hourly bars"
                onChange={(e) => setListing({ ...listing, tagline: e.target.value })}
              />
            </div>
            <SliderRow
              label="Performance fee (% of profitable exits)"
              value={listing.feePct}
              min={5}
              max={25}
              step={1}
              format={(v) => `${v}%`}
              onChange={(v) => setListing({ ...listing, feePct: v })}
            />
            <div className="rounded-md border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
              Lineage recorded: <span className="mono">aialgo/{id}</span>
              {base ? ` v${base.version}` : ""} · cloud fine-tune. Feature schema and output contract inherited
              unchanged.
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Back
              </Button>
              <Button onClick={() => publish.mutate()} disabled={publish.isPending || !listing.name || !listing.slug}>
                {publish.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : null}
                Submit for validation
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <Label>{label}</Label>
        <span className="mono text-xs text-muted-foreground">{format ? format(value) : value.toFixed(2)}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v ?? value)} />
    </div>
  );
}
