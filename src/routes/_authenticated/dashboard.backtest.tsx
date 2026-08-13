import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, FlaskConical, History, Play, ShieldCheck, XCircle } from "lucide-react";
import {
  advanceBacktestJob,
  getBacktestJob,
  listMyBacktestJobs,
  runSandboxBacktest,
  submitForValidation,
} from "@/lib/backtest-validation.functions";
import { listBacktestTargets } from "@/lib/backtest-targets.functions";
import { publishStrategyListing } from "@/lib/algo-listing.functions";
import { stageLabel, type BacktestConfig, type BacktestReport } from "@/lib/backtest-protocol";
import { verificationChecklist } from "@/lib/backtest-verification";
import { BacktestConfigForm, emptyBacktestConfig } from "@/components/marketplace/backtest-config-form";
import { BacktestReportView } from "@/components/marketplace/backtest-report";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/dashboard/backtest")({
  component: BacktestPlayground,
  head: () => ({
    meta: [
      { title: "Backtest Playground | aiAlgo" },
      {
        name: "description",
        content:
          "Run self-tests and verification backtests on your algo strategies and AI models using platform data or your own connected feeds.",
      },
      { property: "og:title", content: "Backtest Playground | aiAlgo" },
      {
        property: "og:description",
        content: "One place to test, verify and stamp your strategies before listing them publicly.",
      },
    ],
  }),
});

type Mode = "sandbox" | "verification";

function BacktestPlayground() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const targets = useQuery({ queryKey: ["backtest-targets"], queryFn: () => listBacktestTargets() });
  const jobs = useQuery({ queryKey: ["my-backtest-jobs"], queryFn: () => listMyBacktestJobs() });

  const [targetId, setTargetId] = useState("");
  const [mode, setMode] = useState<Mode>("sandbox");
  const [config, setConfig] = useState<BacktestConfig>(emptyBacktestConfig());
  const [jobId, setJobId] = useState<string | null>(null);

  const models = targets.data?.models ?? [];
  const strategies = targets.data?.strategies ?? [];
  const selectedModel = models.find((m) => m.id === targetId);
  const selectedStrategy = strategies.find((s) => s.id === targetId);

  const job = useQuery({
    queryKey: ["backtest-job", jobId],
    queryFn: () => getBacktestJob({ data: { jobId: jobId! } }),
    enabled: Boolean(jobId),
  });

  const running = job.data?.status === "running" || job.data?.status === "queued";

  useEffect(() => {
    if (!jobId || !running) return;
    const t = setInterval(async () => {
      await advanceBacktestJob({ data: { jobId } });
      await job.refetch();
    }, 2000);
    return () => clearInterval(t);
  }, [jobId, running, job]);

  useEffect(() => {
    if (job.data && job.data.status !== "running" && job.data.status !== "queued") {
      void qc.invalidateQueries({ queryKey: ["my-backtest-jobs"] });
      void qc.invalidateQueries({ queryKey: ["backtest-targets"] });
    }
  }, [job.data?.status, qc, job.data]);

  const dataSourceReady = Boolean(config.dataSourceLabel);
  const universeReady = config.universe.length > 0;
  const canRun = Boolean(targetId) && dataSourceReady && universeReady;

  const run = useMutation({
    mutationFn: async () => {
      let modelId = selectedModel?.id;
      if (!modelId && selectedStrategy) {
        const created = await publishStrategyListing({ data: { strategyId: selectedStrategy.id } });
        modelId = created.id;
      }
      if (!modelId) throw new Error("Pick a strategy or model to test.");
      return mode === "verification"
        ? submitForValidation({ data: { modelId, config } })
        : runSandboxBacktest({ data: { modelId, config } });
    },
    onSuccess: (res) => {
      setJobId(res.jobId);
      void qc.invalidateQueries({ queryKey: ["backtest-targets"] });
      toast.success(mode === "verification" ? "Verification run started" : "Self-test started");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const report = (job.data?.results ?? null) as BacktestReport | null;
  const verification = useMemo(
    () => verificationChecklist(report, job.data?.kind as string | undefined),
    [report, job.data?.kind],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <FlaskConical className="h-6 w-6 text-primary" aria-hidden /> Backtest Playground
        </h1>
        <p className="text-sm text-muted-foreground">
          Test any algo strategy or AI model you own. A passing verification run is required before a listing can go public.
        </p>
      </header>

      <Tabs defaultValue="run" className="space-y-5">
        <TabsList>
          <TabsTrigger value="run">Run</TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-1.5 h-4 w-4" aria-hidden /> Runs history
          </TabsTrigger>
        </TabsList>

        <TabsContent value="run" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. What are you testing?</CardTitle>
              <CardDescription>Your listings and builder strategies both show up here.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Strategy or model</Label>
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.length ? (
                      <SelectGroup>
                        <SelectLabel>Listings</SelectLabel>
                        {models.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} · {m.listing_kind === "algo" ? "Algo" : "AI model"}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ) : null}
                    {strategies.length ? (
                      <SelectGroup>
                        <SelectLabel>Builder strategies</SelectLabel>
                        {strategies.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Run mode</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Self-test — private, iterate freely</SelectItem>
                    <SelectItem value="verification">Verification run — locked protocol, required to go public</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {mode === "verification"
                    ? "Runs the standard platform protocol with out-of-sample holdout and walk-forward analysis."
                    : selectedModel && selectedModel.status === "draft"
                      ? `${3 - (selectedModel.sandbox_runs_used ?? 0)} free self-tests left on this draft.`
                      : "Unofficial run — never shown to buyers."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Data, universe and assumptions</CardTitle>
              <CardDescription>Pick the feed, symbols, timeframe and period this run should use.</CardDescription>
            </CardHeader>
            <CardContent>
              <BacktestConfigForm value={config} onChange={setConfig} showDateRange />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">3. Run</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canRun ? (
                <Alert>
                  <AlertTitle>Before you can run</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-1 space-y-1 text-sm">
                      <li>{targetId ? "✓" : "•"} Pick a strategy or model</li>
                      <li>{dataSourceReady ? "✓" : "•"} Choose a data source (platform feed, or a tested connection)</li>
                      <li>{universeReady ? "✓" : "•"} Select at least one symbol for the universe</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}
              <Button onClick={() => run.mutate()} disabled={!canRun || run.isPending || running}>
                <Play className="mr-2 h-4 w-4" aria-hidden />
                {mode === "verification" ? "Run verification backtest" : "Run self-test"}
              </Button>

              {job.data && running ? (
                <div className="space-y-2">
                  <Progress value={job.data.progress ?? 0} />
                  <p className="text-sm text-muted-foreground">
                    {stageLabel(job.data.stage ?? "queued")} — {job.data.stage_message}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {report ? (
            <>
              <VerificationCard
                verification={verification}
                modelId={(job.data?.model_id as string | null) ?? null}
                strategyId={selectedModel?.strategy_id ?? null}
                onList={(_id, strategyId) =>
                  strategyId
                    ? navigate({ to: "/dashboard/strategies/list/$id", params: { id: strategyId } })
                    : navigate({ to: "/dashboard/my-models" })
                }
              />

              <BacktestReportView report={report} />
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {jobs.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading runs…</p>
          ) : (jobs.data ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No runs yet. Start a self-test from the Run tab.
              </CardContent>
            </Card>
          ) : (
            (jobs.data ?? []).map((j) => {
              const r = (j.results ?? null) as BacktestReport | null;
              const v = verificationChecklist(r, j.kind);
              return (
                <Card key={j.id}>
                  <CardContent className="flex flex-wrap items-center gap-3 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{j.model?.name ?? "Untitled"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(j.created_at).toLocaleString()} ·{" "}
                        {(j.config as BacktestConfig | null)?.dataSourceLabel ?? "unknown data source"}
                      </p>
                    </div>
                    <Badge variant="outline">{j.kind === "sandbox" ? "Self-test" : "Verification"}</Badge>
                    <Badge
                      variant={j.status === "completed" ? (v.verified ? "default" : "secondary") : j.status === "failed" ? "destructive" : "outline"}
                    >
                      {j.status === "completed" ? (v.verified ? "Successfully verified" : "Completed") : j.status}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => setJobId(j.id)}>
                      Open report
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VerificationCard({
  verification,
  modelId,
  strategyId,
  onList,
}: {
  verification: ReturnType<typeof verificationChecklist>;
  modelId: string | null;
  strategyId: string | null;
  onList: (modelId: string, strategyId: string | null) => void;
}) {
  return (
    <Card className={verification.verified ? "border-profit/60" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className={`h-4 w-4 ${verification.verified ? "text-profit" : "text-muted-foreground"}`} aria-hidden />
          {verification.verified ? "Successfully verified" : "Public listing criteria"}
        </CardTitle>
        <CardDescription>
          {verification.passedCount}/{verification.items.length} criteria met.{" "}
          {verification.verified
            ? "This run can back a public marketplace listing."
            : "All criteria must pass before this strategy can be listed publicly."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {verification.items.map((item) => (
          <div key={item.key} className="flex items-start gap-2 text-sm">
            {item.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-profit" aria-hidden />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-loss" aria-hidden />
            )}
            <span>
              <span className="font-medium">{item.label}</span>
              <span className="block text-xs text-muted-foreground">{item.detail}</span>
            </span>
          </div>
        ))}
        {verification.verified && modelId ? (
          <Button className="mt-2" onClick={() => onList(modelId, strategyId)}>
            Continue to listing
          </Button>
        ) : null}
        {!verification.verified ? (
          <p className="pt-2 text-xs text-muted-foreground">
            Keeping it private? No verification needed —{" "}
            <Link to="/dashboard/strategies" className="text-primary underline-offset-2 hover:underline">
              manage your strategies
            </Link>
            .
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
