import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Pause, Play, Sparkles } from "lucide-react";
import {
  evaluateRiskGuards,
  listMyActivationsDetailed,
  resumeActivation,
  setActivationVersion,
  updateActivationRisk,
  type ActivationRow,
} from "@/lib/activations.functions";
import { setActivationStatus } from "@/lib/models.functions";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/metric-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { fmtDate, fmtMoney, fmtNum, pnlClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/my-models")({
  component: MyModels,
});

function MyModels() {
  const qc = useQueryClient();
  const activations = useQuery({ queryKey: ["my-activations"], queryFn: () => listMyActivationsDetailed() });

  const guards = useMutation({
    mutationFn: () => evaluateRiskGuards(),
    onSuccess: (res) => {
      if (res.paused.length) {
        toast.warning(`${res.paused.length} model(s) auto-paused by risk guards.`);
        void qc.invalidateQueries({ queryKey: ["my-activations"] });
        void qc.invalidateQueries({ queryKey: ["notifications"] });
      }
    },
  });

  useEffect(() => {
    guards.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = activations.data ?? [];
  const totalPnl = rows.reduce((a, r) => a + Number(r.pnl ?? 0), 0);
  const updates = rows.filter((r) => r.updateAvailable).length;
  const paused = rows.filter((r) => r.status === "paused").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My models</h1>
          <p className="text-sm text-muted-foreground">
            Version pinning, kill switches and auto-pause guards for every model you run.
          </p>
        </div>
        <Button variant="outline" onClick={() => guards.mutate()} disabled={guards.isPending}>
          Run risk check
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricCard label="Active models" value={String(rows.filter((r) => r.status === "active").length)} />
        <MetricCard label="Unrealised P&L" value={fmtMoney(totalPnl)} tone={totalPnl >= 0 ? "profit" : "loss"} />
        <MetricCard label="Updates available" value={String(updates)} tone={updates ? "warning" : "neutral"} />
        <MetricCard label="Paused" value={String(paused)} tone={paused ? "loss" : "neutral"} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" aria-hidden />}
          title="No models activated yet"
          description="Browse the marketplace and deploy a model to paper trading first."
          action={
            <Button asChild>
              <Link to="/models">Browse models</Link>
            </Button>
          }
        />
      ) : (
        rows.map((row) => <ActivationCard key={row.id} row={row} onChanged={() => void qc.invalidateQueries()} />)
      )}
    </div>
  );
}

function ActivationCard({ row, onChanged }: { row: ActivationRow; onChanged: () => void }) {
  const model = row.model as { name: string; slug: string; timeframe: string; risk_level: string } | null;
  const [kill, setKill] = useState(String(row.kill_switch_drawdown_pct ?? 15));
  const [daily, setDaily] = useState(String(row.daily_loss_limit_pct ?? 5));
  const [maxPos, setMaxPos] = useState(String(row.max_position_size_pct ?? 20));
  const [stop, setStop] = useState(String(row.stop_loss_pct ?? 5));

  const saveRisk = useMutation({
    mutationFn: () =>
      updateActivationRisk({
        data: {
          activationId: row.id,
          killSwitchDrawdownPct: Number(kill),
          dailyLossLimitPct: Number(daily),
          maxPositionSizePct: Number(maxPos),
          stopLossPct: Number(stop),
        },
      }),
    onSuccess: () => {
      toast.success("Risk controls saved");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const version = useMutation({
    mutationFn: (input: { version: string | null; autoUpgrade: boolean }) =>
      setActivationVersion({ data: { activationId: row.id, ...input } }),
    onSuccess: () => {
      toast.success("Version preference updated");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const status = useMutation({
    mutationFn: (next: "active" | "paused" | "stopped") =>
      setActivationStatus({ data: { activationId: row.id, status: next } }),
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  });

  const resume = useMutation({
    mutationFn: () => resumeActivation({ data: { activationId: row.id } }),
    onSuccess: () => {
      toast.success("Model resumed");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            {model?.name ?? "Model"}
            <Badge variant="outline">{row.mode}</Badge>
            <Badge variant={row.status === "active" ? "secondary" : "outline"}>{row.status}</Badge>
            {row.updateAvailable ? (
              <Badge className="bg-warning/15 text-warning">v{row.currentVersion?.version} available</Badge>
            ) : null}
          </CardTitle>
          <CardDescription>
            Running v{row.runningVersion ?? "1.0.0"} · activated {fmtDate(row.activated_at)} ·{" "}
            <span className={pnlClass(Number(row.pnl_pct ?? 0))}>{fmtNum(Number(row.pnl_pct ?? 0), 2)}%</span>
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {row.status === "active" ? (
            <Button variant="outline" size="sm" onClick={() => status.mutate("paused")}>
              <Pause className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Pause
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => resume.mutate()}>
              <Play className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Resume
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => status.mutate("stopped")}>
            Stop
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {row.paused_reason ? (
          <div className="flex items-start gap-2 rounded-md border border-loss/40 bg-loss/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-loss" aria-hidden />
            <span>{row.paused_reason}</span>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-medium">Version</p>
            <div className="flex items-center justify-between rounded-md border border-border/70 p-3">
              <div>
                <p className="text-sm">Auto-upgrade to latest</p>
                <p className="text-xs text-muted-foreground">Off keeps you pinned to the version you choose.</p>
              </div>
              <Switch
                checked={row.auto_upgrade}
                onCheckedChange={(checked) =>
                  version.mutate({ autoUpgrade: checked, version: checked ? null : row.runningVersion })
                }
              />
            </div>
            {!row.auto_upgrade ? (
              <Select
                value={row.pinned_version ?? row.runningVersion ?? undefined}
                onValueChange={(v) => version.mutate({ autoUpgrade: false, version: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pin a version" />
                </SelectTrigger>
                <SelectContent>
                  {row.versions.map((v) => (
                    <SelectItem key={v.id} value={v.version}>
                      v{v.version}
                      {v.is_current ? " (latest)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {row.currentVersion ? (
              <p className="text-xs text-muted-foreground">
                Latest changelog — v{row.currentVersion.version}: {row.currentVersion.changelog}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Risk controls</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kill switch drawdown %" value={kill} onChange={setKill} />
              <Field label="Daily loss limit %" value={daily} onChange={setDaily} />
              <Field label="Max position size %" value={maxPos} onChange={setMaxPos} />
              <Field label="Stop loss %" value={stop} onChange={setStop} />
            </div>
            <Button size="sm" onClick={() => saveRisk.mutate()} disabled={saveRisk.isPending}>
              Save risk controls
            </Button>
            <Separator />
            <p className="text-xs text-muted-foreground">
              The platform also auto-pauses any model whose live 30-day return deviates more than 30% from its verified
              backtest, and notifies you when it does.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input className="mono" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
