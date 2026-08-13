import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Loader2,
  Pause,
  Play,
  ShieldAlert,
  Wallet,
  Zap,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getExecutionOverview, tickExecution, triggerKillSwitch } from "@/lib/execution.functions";
import { resumeActivation } from "@/lib/activations.functions";
import { providerLabel } from "@/lib/trading-accounts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/execution")({
  component: ExecutionDashboard,
  head: () => ({
    meta: [
      { title: "Execution Monitor — aiAlgo" },
      {
        name: "description",
        content: "Live monitoring of every active model: signals, risk-engine decisions, orders, P&L and kill switch.",
      },
      { property: "og:title", content: "Execution Monitor — aiAlgo" },
      { property: "og:description", content: "Watch signals flow through the risk engine into your broker account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ExecutionDashboard() {
  const qc = useQueryClient();
  const overview = useQuery({ queryKey: ["execution-overview"], queryFn: () => getExecutionOverview() });
  const [selectedId, setSelectedId] = useState<string>("");
  const [autoRun, setAutoRun] = useState(false);

  const tick = useMutation({
    mutationFn: () => tickExecution(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["execution-overview"] }),
  });

  useEffect(() => {
    if (!autoRun) return;
    const t = setInterval(() => tick.mutate(), 6000);
    return () => clearInterval(t);
  }, [autoRun, tick]);

  const activations = overview.data?.activations ?? [];
  const active = useMemo(
    () => activations.find((a) => a.id === selectedId) ?? activations[0],
    [activations, selectedId],
  );

  const signals = (overview.data?.signals ?? []).filter((s) => !active || s.activation_id === active.id);
  const orders = (overview.data?.orders ?? []).filter((o) => !active || o.activation_id === active.id);
  const account = (overview.data?.accounts ?? []).find((a) => a.id === active?.broker_connection_id);

  const pause = useMutation({
    mutationFn: (id: string) => triggerKillSwitch({ data: { activationId: id } }),
    onSuccess: () => {
      toast.success("Model paused");
      void qc.invalidateQueries({ queryKey: ["execution-overview"] });
    },
  });
  const resume = useMutation({
    mutationFn: (id: string) => resumeActivation({ data: { activationId: id } }),
    onSuccess: () => {
      toast.success("Model resumed");
      void qc.invalidateQueries({ queryKey: ["execution-overview"] });
    },
  });
  const kill = useMutation({
    mutationFn: (id: string) => triggerKillSwitch({ data: { activationId: id } }),
    onSuccess: () => {
      toast.error("Kill switch engaged — model stopped");
      void qc.invalidateQueries({ queryKey: ["execution-overview"] });
    },
  });

  const equity = useMemo(() => {
    const capital = Number(active?.capital_allocation ?? 0);
    let running = 0;
    return [...orders]
      .reverse()
      .map((o, i) => {
        running += Number(o.realized_pnl ?? 0);
        return { i, equity: Math.round((capital + running) * 100) / 100 };
      })
      .slice(-60);
  }, [orders, active]);

  const todayPnl = orders
    .filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString())
    .reduce((n, o) => n + Number(o.realized_pnl ?? 0), 0);

  if (overview.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (!active) {
    return (
      <EmptyState
        icon={<Activity className="h-6 w-6" aria-hidden />}
        title="No active models"
        description="Apply a model from the marketplace to see its live execution chain here."
      />
    );
  }

  const model = active.model as unknown as { name: string; slug: string; timeframe: string } | null;
  const latest = signals[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Execution monitor</h1>
          <p className="text-sm text-muted-foreground">Signal → risk engine → account, with a live audit trail.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={autoRun} onCheckedChange={setAutoRun} id="auto" />
            <Label htmlFor="auto" className="text-xs">
              Auto-run loop
            </Label>
          </div>
          <Button variant="outline" onClick={() => tick.mutate()} disabled={tick.isPending}>
            {tick.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Zap className="mr-2 h-4 w-4" aria-hidden />
            )}
            Run cycle
          </Button>
          <Select value={active.id} onValueChange={setSelectedId}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activations.map((a) => {
                const m = a.model as unknown as { name: string } | null;
                return (
                  <SelectItem key={a.id} value={a.id}>
                    {m?.name ?? "Model"} · {a.status}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{model?.name ?? "Model"}</CardTitle>
          <CardDescription>
            {active.mode} · {model?.timeframe ?? "—"} · activated {new Date(active.activated_at).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              icon={Cpu}
              label={model?.name ?? "Model"}
              status={active.status === "active" ? "ok" : "off"}
              detail={active.status}
            />
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            <Link
              icon={ShieldAlert}
              label="Risk engine"
              status="ok"
              detail={`${Number(active.max_position_size_pct)}% pos · ${Number(active.max_open_positions ?? 5)} open`}
            />
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            <Link
              icon={Wallet}
              label={account ? account.nickname || providerLabel(account.broker_name) : "Paper account"}
              status={account?.status === "error" ? "error" : "ok"}
              detail={account?.status ?? "simulated"}
            />
          </div>

          {active.paused_reason ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" aria-hidden />
              <span>{active.paused_reason}</span>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Today's P&L" value={fmtMoney(todayPnl)} tone={todayPnl >= 0 ? "profit" : "loss"} />
            <Stat
              label="Cumulative P&L"
              value={fmtMoney(Number(active.pnl))}
              tone={Number(active.pnl) >= 0 ? "profit" : "loss"}
            />
            <Stat label="Signals consumed" value={String(active.signals_consumed ?? 0)} />
            <Stat label="Executions" value={String(active.executions_count ?? 0)} />
          </div>

          <div className="flex flex-wrap gap-2">
            {active.status === "active" ? (
              <Button variant="outline" size="sm" onClick={() => pause.mutate(active.id)}>
                <Pause className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Pause
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => resume.mutate(active.id)}>
                <Play className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Resume
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={() => kill.mutate(active.id)}>
              <ShieldAlert className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Kill switch
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Latest signal</CardTitle>
          </CardHeader>
          <CardContent>
            {latest ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={latest.status === "passed" ? "default" : "destructive"}>
                    {latest.status === "passed" ? "Passed risk engine" : "Blocked"}
                  </Badge>
                  <span className="mono text-xs text-muted-foreground">
                    {new Date(latest.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="mono">
                  {latest.action} {latest.symbol} · conf {Number(latest.confidence).toFixed(2)} · size{" "}
                  {Number(latest.position_size_pct)}%
                </p>
                {latest.block_reason ? <p className="text-xs text-loss">{latest.block_reason}</p> : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No signals yet — run a cycle.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Cumulative P&L</CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            {equity.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="i" hide />
                  <YAxis tick={{ fontSize: 10 }} width={60} domain={["auto", "auto"]} />
                  <Tooltip />
                  <Area dataKey="equity" stroke="var(--color-chart-2)" fill="var(--color-chart-2)" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Not enough fills yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Execution log</CardTitle>
          <CardDescription>Every signal, risk decision and fill.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {signals.slice(0, 40).map((s) => {
            const order = orders.find((o) => o.signal_id === s.id);
            return (
              <div key={s.id} className="rounded-md border border-border/70 p-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mono text-muted-foreground">{new Date(s.created_at).toLocaleTimeString()}</span>
                  <Badge variant="outline">{s.action}</Badge>
                  <span className="mono">{s.symbol}</span>
                  <span className="text-muted-foreground">conf {Number(s.confidence).toFixed(2)}</span>
                  {s.status === "passed" ? (
                    <span className="flex items-center gap-1 text-profit">
                      <CheckCircle2 className="h-3 w-3" aria-hidden /> passed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-loss">
                      <AlertTriangle className="h-3 w-3" aria-hidden /> blocked
                    </span>
                  )}
                </div>
                {s.block_reason ? <p className="mt-1 text-loss">{s.block_reason}</p> : null}
                {order ? (
                  <>
                    <Separator className="my-1.5" />
                    <p className="mono text-muted-foreground">
                      order {order.status} · {Number(order.quantity)} @ {Number(order.price)} · P&L{" "}
                      <span className={Number(order.realized_pnl) >= 0 ? "text-profit" : "text-loss"}>
                        {fmtMoney(Number(order.realized_pnl))}
                      </span>
                    </p>
                  </>
                ) : null}
              </div>
            );
          })}
          {signals.length === 0 ? <p className="text-sm text-muted-foreground">Nothing logged yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Link({
  icon: Icon,
  label,
  detail,
  status,
}: {
  icon: typeof Cpu;
  label: string;
  detail: string;
  status: "ok" | "off" | "error";
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      <div>
        <div className="text-xs font-medium">{label}</div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              status === "ok" ? "bg-profit" : status === "error" ? "bg-destructive" : "bg-muted-foreground",
            )}
          />
          {detail}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "profit" | "loss" }) {
  return (
    <div className="rounded-md border border-border/70 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("mono text-lg", tone === "profit" && "text-profit", tone === "loss" && "text-loss")}>
        {value}
      </div>
    </div>
  );
}
