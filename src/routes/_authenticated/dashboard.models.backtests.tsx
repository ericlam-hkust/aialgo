import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock, FlaskConical, Gauge, RefreshCw } from "lucide-react";
import {
  advanceBacktestJob,
  appealValidation,
  listMyAppeals,
  listMyBacktestJobs,
  type BacktestJobRow,
} from "@/lib/backtest-validation.functions";
import { JOB_STAGES, stageLabel, type BacktestReport } from "@/lib/backtest-protocol";
import { BacktestReportView } from "@/components/marketplace/backtest-report";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/models/backtests")({
  component: BacktestQueue,
});

function BacktestQueue() {
  const qc = useQueryClient();
  const jobs = useQuery({ queryKey: ["backtest-jobs"], queryFn: () => listMyBacktestJobs() });
  const appeals = useQuery({ queryKey: ["my-appeals"], queryFn: () => listMyAppeals() });
  const [openReport, setOpenReport] = useState<BacktestJobRow | null>(null);
  const [appealFor, setAppealFor] = useState<BacktestJobRow | null>(null);

  const running = useMemo(
    () => (jobs.data ?? []).filter((j) => j.status !== "completed" && j.status !== "failed"),
    [jobs.data],
  );

  const advance = useMutation({
    mutationFn: (jobId: string) => advanceBacktestJob({ data: { jobId } }),
    onSuccess: (job) => {
      void qc.invalidateQueries({ queryKey: ["backtest-jobs"] });
      if (job && (job.status === "completed" || job.status === "failed")) {
        void qc.invalidateQueries({ queryKey: ["notifications"] });
        void qc.invalidateQueries({ queryKey: ["my-models"] });
        toast[job.status === "completed" ? "success" : "error"](
          job.status === "completed" ? "Backtest completed — report ready." : `Backtest failed: ${job.failure_reason}`,
        );
      }
    },
  });

  useEffect(() => {
    if (running.length === 0) return;
    const id = setInterval(() => running.forEach((j) => advance.mutate(j.id)), 2500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running.map((j) => j.id).join(",")]);

  const rows = jobs.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Backtest validation queue</h1>
          <p className="text-sm text-muted-foreground">
            Every model must pass the standardized platform backtest before it can be listed.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/dashboard/models/playground">
              <FlaskConical className="mr-1.5 h-4 w-4" aria-hidden /> Backtest playground
            </Link>
          </Button>
          <Button variant="outline" onClick={() => void jobs.refetch()}>
            <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden /> Refresh
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Gauge className="h-6 w-6" aria-hidden />}
          title="No validation runs yet"
          description="Submit a model from the upload wizard, or try an unofficial run in the playground."
          action={
            <Button asChild>
              <Link to="/dashboard/models/new">Submit a model</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {rows.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onViewReport={() => setOpenReport(job)}
              onAppeal={() => setAppealFor(job)}
            />
          ))}
        </div>
      )}

      {appeals.data && appeals.data.length > 0 ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Appeals</CardTitle>
            <CardDescription>Our review team responds within 3 business days.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {appeals.data.map((a) => (
              <div key={a.id} className="rounded-md border border-border/70 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{(a.model as { name?: string } | null)?.name ?? "Model"}</span>
                  <Badge variant="outline">{a.status}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{a.message}</p>
                {a.admin_notes ? <p className="mt-1 text-xs text-primary">Reviewer: {a.admin_notes}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">{fmtDate(a.created_at)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={Boolean(openReport)} onOpenChange={(o) => !o && setOpenReport(null)}>
        <DialogContent className="max-h-[88vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Backtest report — {(openReport?.model as { name?: string } | null)?.name ?? "Model"} v
              {openReport?.model_version}
            </DialogTitle>
          </DialogHeader>
          {openReport?.results ? (
            <BacktestReportView
              report={openReport.results as unknown as BacktestReport}
              variant={openReport.kind === "sandbox" ? "sandbox" : "verified"}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AppealDialog job={appealFor} onClose={() => setAppealFor(null)} onDone={() => void appeals.refetch()} />
    </div>
  );
}

function JobCard({
  job,
  onViewReport,
  onAppeal,
}: {
  job: BacktestJobRow;
  onViewReport: () => void;
  onAppeal: () => void;
}) {
  const model = job.model as { name?: string; slug?: string } | null;
  const done = job.status === "completed";
  const failed = job.status === "failed";
  const remaining = Math.max(
    0,
    Math.round(((job.eta_seconds ?? 120) * (100 - job.progress)) / 100),
  );

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            {model?.name ?? "Model"}
            <Badge variant="outline" className="mono">
              v{job.model_version}
            </Badge>
            <Badge variant={job.kind === "sandbox" ? "outline" : "secondary"}>
              {job.kind === "sandbox" ? "Self-test" : job.kind === "revalidation" ? "Re-validation" : "Validation"}
            </Badge>
            {done ? (
              <Badge className="gap-1 bg-profit/15 text-profit">
                <CheckCircle2 className="h-3 w-3" aria-hidden /> Passed
              </Badge>
            ) : null}
            {failed ? (
              <Badge className="gap-1 bg-loss/15 text-loss">
                <AlertTriangle className="h-3 w-3" aria-hidden /> Failed
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>
            Started {fmtDate(job.started_at)} · {stageLabel(job.stage)}
            {!done && !failed ? (
              <span className="ml-2 inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden /> ~{remaining}s remaining
              </span>
            ) : null}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {job.results ? (
            <Button size="sm" variant="outline" onClick={onViewReport}>
              View report
            </Button>
          ) : null}
          {failed ? (
            <>
              <Button size="sm" variant="ghost" onClick={onAppeal}>
                Appeal
              </Button>
              <Button size="sm" asChild>
                <Link to="/dashboard/models/new">Fix & resubmit</Link>
              </Button>
            </>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={job.progress} className="h-2" />
        <div className="flex flex-wrap gap-2 text-xs">
          {JOB_STAGES.map((s) => {
            const reached = job.progress >= s.pct || done;
            const current = job.stage === s.key && !done && !failed;
            return (
              <span
                key={s.key}
                className={`rounded-full border px-2.5 py-1 ${
                  current
                    ? "border-primary bg-primary/10 text-primary"
                    : reached
                      ? "border-profit/40 text-profit"
                      : "border-border text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            );
          })}
          <span
            className={`rounded-full border px-2.5 py-1 ${
              done ? "border-profit/40 text-profit" : failed ? "border-loss/50 text-loss" : "border-border text-muted-foreground"
            }`}
          >
            {failed ? "Failed" : "Published"}
          </span>
        </div>
        {job.stage_message ? <p className="text-sm text-muted-foreground">{job.stage_message}</p> : null}
        {failed ? (
          <div className="rounded-md border border-loss/40 bg-loss/10 p-3 text-sm">
            <p className="font-medium text-loss">{job.failure_code?.replace(/_/g, " ")}</p>
            <p className="mt-1 text-muted-foreground">{job.failure_reason}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AppealDialog({
  job,
  onClose,
  onDone,
}: {
  job: BacktestJobRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [message, setMessage] = useState("");
  const submit = useMutation({
    mutationFn: () =>
      appealValidation({
        data: { modelId: job?.model_id ?? "", jobId: job?.id ?? "", message },
      }),
    onSuccess: () => {
      toast.success("Appeal submitted");
      setMessage("");
      onDone();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={Boolean(job)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Appeal validation result</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Explain why you believe the result is wrong. Include anything that helps us reproduce your expected output.
        </p>
        <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
        <Button onClick={() => submit.mutate()} disabled={submit.isPending || message.trim().length < 20}>
          Submit appeal
        </Button>
      </DialogContent>
    </Dialog>
  );
}
