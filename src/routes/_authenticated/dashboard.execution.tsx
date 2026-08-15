import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  Plus,
  RefreshCw,
  ShieldAlert,
  Wallet,
  Zap,
} from "lucide-react";
import { getExecutionOverview, tickExecution, triggerKillSwitch } from "@/lib/execution.functions";
import { cancelDeskOrder, getDeskState, placeManualOrder, refreshOrderBook } from "@/lib/trading-desk.functions";
import { resumeActivation } from "@/lib/activations.functions";
import { accountStatus, providerLabel } from "@/lib/trading-accounts";
import { SYMBOLS } from "@/lib/market";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { OrderTicket, type TicketPayload } from "@/components/trade/order-ticket";
import { OrderBook, PositionsTable, isWorking, type DeskOrder } from "@/components/trade/order-book";
import { TradeBlotter } from "@/components/trade/trade-blotter";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/execution")({
  component: TradingDesk,
  head: () => ({
    meta: [
      { title: "Trading Desk — aiAlgo" },
      {
        name: "description",
        content:
          "Live order book on your connected broker accounts, manual order entry, and a blotter showing whether each trade was human executed or strategy driven.",
      },
      { property: "og:title", content: "Trading Desk — aiAlgo" },
      {
        property: "og:description",
        content: "Trade manually or watch your Algo and AI strategies work — every fill clearly attributed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type BlotterOrder = DeskOrder & { broker_connection_id: string };

function TradingDesk() {
  const qc = useQueryClient();
  const desk = useQuery({ queryKey: ["desk-state"], queryFn: () => getDeskState(), refetchInterval: 20_000 });
  const [accountId, setAccountId] = useState<string>("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const accounts = desk.data?.accounts ?? [];
  const account = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? accounts.find((a) => a.is_default) ?? accounts[0],
    [accounts, accountId],
  );
  const currency = account?.currency ?? "USD";
  const simulated = account?.mode === "simulation" || account?.broker_name === "paper";

  const orders = (desk.data?.orders ?? []) as BlotterOrder[];
  const accountOrders = orders.filter((o) => o.broker_connection_id === account?.id);
  const workingOrders = accountOrders.filter((o) => isWorking(o.status));
  const positions = (desk.data?.positions ?? []).filter(
    (p) => (p as { broker_connection_id: string }).broker_connection_id === account?.id,
  );

  const strategies = (desk.data?.strategies ?? []).map((s) => ({ id: s.id, name: s.name }));
  const activations = (desk.data?.activations ?? []).map((a) => {
    const model = a.model as unknown as { name: string } | null;
    return { id: a.id, name: model?.name ?? "AI model", modelId: a.model_id as string | null };
  });

  const quotes = desk.data?.quotes ?? [];
  const priceOf = (symbol: string) => {
    const q = quotes.find((x) => x.symbol === symbol);
    return q ? Number(q.price) : null;
  };

  const nameFor = (o: DeskOrder) => ({
    strategyName: strategies.find((s) => s.id === o.strategy_id)?.name ?? null,
    modelName: activations.find((a) => a.id === o.activation_id || a.modelId === o.model_id)?.name ?? null,
  });
  const accountName = (o: { broker_connection_id?: string }) => {
    const acc = accounts.find((a) => a.id === o.broker_connection_id);
    return acc ? acc.nickname || providerLabel(acc.broker_name) : "—";
  };

  const place = useMutation({
    mutationFn: (payload: TicketPayload) =>
      placeManualOrder({ data: { accountId: account!.id, ...payload } }),
    onSuccess: (res) => {
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      void qc.invalidateQueries({ queryKey: ["desk-state"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => {
      setCancellingId(id);
      return cancelDeskOrder({ data: { orderId: id } });
    },
    onSuccess: () => {
      toast.success("Order cancelled");
      void qc.invalidateQueries({ queryKey: ["desk-state"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setCancellingId(null),
  });

  const sync = useMutation({
    mutationFn: () => refreshOrderBook({ data: { accountId: account!.id } }),
    onSuccess: (res) => {
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      void qc.invalidateQueries({ queryKey: ["desk-state"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (desk.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trading desk</h1>
          <p className="text-sm text-muted-foreground">
            Live order book, manual trading, and every fill attributed to a person or a strategy.
          </p>
        </div>
        {accounts.length > 0 ? (
          <div className="flex items-center gap-2">
            <Select value={account?.id ?? ""} onValueChange={setAccountId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => {
                  const st = accountStatus(a);
                  return (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className={`inline-block h-2 w-2 rounded-full ${
                            st.tone === "connected"
                              ? "bg-profit"
                              : st.tone === "error"
                                ? "bg-loss"
                                : "bg-muted-foreground"
                          }`}
                        />
                        {a.nickname || providerLabel(a.broker_name)} · {st.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending || !account}>
              {sync.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
              )}
              Sync now
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/dashboard/accounts">
                <Plus className="mr-2 h-4 w-4" aria-hidden /> Add trading account
              </Link>
            </Button>
          </div>
        ) : (
          <Button variant="outline" asChild>
            <Link to="/dashboard/accounts">
              <Plus className="mr-2 h-4 w-4" aria-hidden /> Add trading account
            </Link>
          </Button>
        )}
      </div>

      {!account ? (
        <EmptyState
          icon={<Wallet className="h-6 w-6" aria-hidden />}
          title="No connected account"
          description="Connect a broker account under Trade → Connected Accounts to trade and see your live order book."
        />
      ) : (
        <>
          <Card className="border-border/70">
            <CardContent className="flex flex-wrap items-center gap-4 py-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Account</div>
                <div className="font-medium">
                  {account.nickname || providerLabel(account.broker_name)}{" "}
                  <span className="mono text-xs text-muted-foreground">{account.account_id ?? ""}</span>
                </div>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div>
                <div className="text-xs text-muted-foreground">Balance</div>
                <div className="mono">{fmtMoney(Number(account.account_balance ?? 0), currency)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Buying power</div>
                <div className="mono">{fmtMoney(Number(account.buying_power ?? 0), currency)}</div>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <Badge variant={account.status === "error" ? "destructive" : "outline"}>{account.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Last sync {account.last_synced_at ? new Date(account.last_synced_at).toLocaleString() : "never"}
              </div>
              {simulated ? (
                <Badge variant="outline" className="ml-auto">
                  Simulation mode — orders are filled inside aiAlgo, not routed to a broker
                </Badge>
              ) : null}
              {account.last_error ? (
                <p className="w-full text-xs text-loss">{account.last_error}</p>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            {simulated ? (
              <OrderTicket
              symbols={SYMBOLS.map((s) => s.symbol)}
              lastPrice={priceOf}
              currency={currency}
              accountLabel={account.nickname || providerLabel(account.broker_name)}
              simulated={Boolean(simulated)}
              strategies={strategies}
              activations={activations}
              pending={place.isPending}
                onSubmit={(payload) => place.mutate(payload)}
              />
            ) : (
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">Read-only monitoring</CardTitle>
                  <CardDescription>
                    aiAlgo never transmits orders to your broker. Orders for this account are placed by your
                    self-hosted runner package; this desk mirrors the resulting fills and positions.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
            <div className="space-y-6">
              <OrderBook
                orders={workingOrders}
                currency={currency}
                nameFor={nameFor}
                onCancel={(id) => cancel.mutate(id)}
                cancellingId={cancellingId}
              />
              <PositionsTable positions={positions as never} currency={currency} />
            </div>
          </div>

          <TradeBlotter orders={orders} accountName={accountName} nameFor={nameFor} currency={currency} />
        </>
      )}

      <StrategyMonitor />
    </div>
  );
}

/** The original signal → risk engine → account monitor, kept as its own section. */
function StrategyMonitor() {
  const qc = useQueryClient();
  const overview = useQuery({ queryKey: ["execution-overview"], queryFn: () => getExecutionOverview() });
  const [selectedId, setSelectedId] = useState<string>("");
  const [autoRun, setAutoRun] = useState(false);

  const tick = useMutation({
    mutationFn: () => tickExecution(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["execution-overview"] });
      void qc.invalidateQueries({ queryKey: ["desk-state"] });
    },
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

  const todayPnl = orders
    .filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString())
    .reduce((n, o) => n + Number(o.realized_pnl ?? 0), 0);

  if (overview.isLoading) return null;

  if (!active) {
    return (
      <EmptyState
        icon={<Activity className="h-6 w-6" aria-hidden />}
        title="No strategies running"
        description="Apply a model or deploy an algo strategy to see its live execution chain here."
      />
    );
  }

  const model = active.model as unknown as { name: string; slug: string; timeframe: string } | null;
  const latest = signals[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Strategy execution monitor</h2>
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
            <SelectTrigger className="w-56">
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
            <Node
              icon={Cpu}
              label={model?.name ?? "Model"}
              status={active.status === "active" ? "ok" : "off"}
              detail={active.status}
            />
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            <Node
              icon={ShieldAlert}
              label="Risk engine"
              status="ok"
              detail={`${Number(active.max_position_size_pct)}% pos · ${Number(active.max_open_positions ?? 5)} open`}
            />
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            <Node
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
            <Button variant="destructive" size="sm" onClick={() => pause.mutate(active.id)}>
              <ShieldAlert className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Kill switch
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Signal log</CardTitle>
          <CardDescription>Every signal, risk decision and fill.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {latest === undefined ? <p className="text-sm text-muted-foreground">Nothing logged yet.</p> : null}
          {signals.slice(0, 30).map((s) => {
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
        </CardContent>
      </Card>
    </div>
  );
}

function Node({
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
