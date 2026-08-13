import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { FlaskConical, Play } from "lucide-react";
import { listMyModels } from "@/lib/contributor.functions";
import { advanceBacktestJob, getBacktestJob, runSandboxBacktest } from "@/lib/backtest-validation.functions";
import { stageLabel, type BacktestConfig, type BacktestReport } from "@/lib/backtest-protocol";
import { BacktestConfigForm, emptyBacktestConfig } from "@/components/marketplace/backtest-config-form";
import { BacktestReportView } from "@/components/marketplace/backtest-report";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/dashboard/models/playground")({
  component: Playground,
  head: () => ({
    meta: [
      { title: "Backtest Playground | aiAlgo" },
      { name: "description", content: "Run unofficial self-test backtests on your trading models before submitting them for platform validation." },
    ],
  }),
});

function Playground() {
  const models = useQuery({ queryKey: ["my-models"], queryFn: () => listMyModels() });
  const [modelId, setModelId] = useState("");
  const [config, setConfig] = useState<BacktestConfig>(emptyBacktestConfig());
  const [jobId, setJobId] = useState<string | null>(null);

  const selected = (models.data ?? []).find((m) => m.id === modelId);

  const job = useQuery({
    queryKey: ["sandbox-job", jobId],
    queryFn: () => getBacktestJob({ data: { jobId: jobId! } }),
    enabled: Boolean(jobId),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "completed" || s === "failed" ? false : 2000;
    },
  });

  useEffect(() => {
    if (!jobId) return;
    const status = job.data?.status;
    if (status === "completed" || status === "failed") return;
    const id = setInterval(() => void advanceBacktestJob({ data: { jobId } }).then(() => job.refetch()), 2200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, job.data?.status]);

  const run = useMutation({
    mutationFn: () => runSandboxBacktest({ data: { modelId, config } }),
    onSuccess: (res) => {
      setJobId(res.jobId);
      toast.success(res.unlimited ? "Sandbox run started" : `Sandbox run started (${res.runsUsed}/3 free runs used)`);
      void models.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const report = job.data?.results as unknown as BacktestReport | null | undefined;
  const running = Boolean(jobId) && job.data?.status !== "completed" && job.data?.status !== "failed";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <FlaskConical className="h-5 w-5 text-warning" aria-hidden /> Backtest playground
        </h1>
        <p className="text-sm text-muted-foreground">
          Unofficial self-tests using the same report format as platform validation. Results are never shown on the
          public listing.
        </p>
      </div>

      <Alert>
        <AlertTitle>3 free sandbox runs per draft model</AlertTitle>
        <AlertDescription>
          Once a model has been submitted for validation, sandbox runs become unlimited.
        </AlertDescription>
      </Alert>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Run configuration</CardTitle>
          <CardDescription>Pick a model, dataset, date range and parameters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5 sm:max-w-sm">
            <Label>Model</Label>
            <Select value={modelId} onValueChange={setModelId}>
              <SelectTrigger>
                <SelectValue placeholder="Select one of your models" />
              </SelectTrigger>
              <SelectContent>
                {(models.data ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} · {m.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && selected.status === "draft" ? (
              <p className="text-xs text-muted-foreground">
                {3 - (selected.sandbox_runs_used ?? 0)} free run(s) remaining.
              </p>
            ) : null}
          </div>

          <BacktestConfigForm value={config} onChange={setConfig} showDateRange />

          <Button onClick={() => run.mutate()} disabled={!modelId || running || run.isPending || config.universe.length === 0}>
            <Play className="mr-1.5 h-4 w-4" aria-hidden /> Run self-test
          </Button>
        </CardContent>
      </Card>

      {jobId ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">{stageLabel(job.data?.stage ?? "queued")}</CardTitle>
            <CardDescription>{job.data?.stage_message ?? "Preparing run…"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={job.data?.progress ?? 5} className="h-2" />
          </CardContent>
        </Card>
      ) : null}

      {job.data?.status === "failed" ? (
        <Alert variant="destructive">
          <AlertTitle>{job.data.failure_code?.replace(/_/g, " ")}</AlertTitle>
          <AlertDescription>{job.data.failure_reason}</AlertDescription>
        </Alert>
      ) : null}

      {report ? <BacktestReportView report={report} variant="sandbox" /> : null}
    </div>
  );
}
