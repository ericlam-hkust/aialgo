import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart as RLineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Loader2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { runBacktestFn } from "@/lib/backtest.functions";
import type { BacktestResult, TradeRecord } from "@/lib/backtest-engine";
import { isStrategyGraph, type StrategyGraph } from "@/lib/strategy-graph";
import { SYMBOLS } from "@/lib/market";
import { fmtDate, fmtMoney, fmtNum, fmtPct, pnlClass } from "@/lib/format";
import { MetricCard } from "@/components/metric-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/strategies/backtest")({
  validateSearch: (search: Record<string, unknown>): { id?: string } =>
    typeof search["id"] === "string" ? { id: search["id"] } : {},
  component: BacktestPage,
});

function BacktestPage() {
  const { id } = Route.useSearch();
  const run = useServerFn(runBacktestFn);

  const [strategyId, setStrategyId] = useState<string | null>(id ?? null);
  const [symbol, setSymbol] = useState("0700.HK");
  const [startDate, setStart] = useState("2024-01-01");
  const [endDate, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const [capital, setCapital] = useState(1_000_000);
  const [commission, setCommission] = useState(0.1);
  const [slippage, setSlippage] = useState(0.05);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const { data: strategies } = useQuery({
    queryKey: ["strategies-for-backtest"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("strategies")
        .select("id,name,graph")
        .eq("user_id", userData.user?.id ?? "")
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!strategyId && strategies?.length) setStrategyId(strategies[0]!.id);
  }, [strategies, strategyId]);

  const selected = strategies?.find((s) => s.id === strategyId);

  const execute = async () => {
    if (!selected) {
      toast.error("Select a strategy to test");
      return;
    }
    if (!isStrategyGraph(selected.graph)) {
      toast.error("This strategy has no valid graph yet. Open the builder and add some nodes.");
      return;
    }
    setBusy(true);
    try {
      const res = await run({
        data: {
          strategyId: selected.id,
          strategyName: selected.name,
          graph: selected.graph as unknown as StrategyGraph,
          symbol,
          startDate,
          endDate,
          initialCapital: capital,
          commissionPct: commission,
          slippagePct: slippage,
        },
      });
      setResult(res);
      toast.success("Backtest complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backtest failed");
    } finally {
      setBusy(false);
    }
  };

  const tradeColumns: Column<TradeRecord>[] = [
    { key: "entry", header: "Entry", sortValue: (t) => t.entry_date, cell: (t) => fmtDate(t.entry_date) },
    { key: "exit", header: "Exit", sortValue: (t) => t.exit_date, cell: (t) => fmtDate(t.exit_date) },
    {
      key: "in",
      header: "In",
      sortValue: (t) => t.entry_price,
      cell: (t) => <span className="mono">{fmtNum(t.entry_price)}</span>,
    },
    {
      key: "out",
      header: "Out",
      sortValue: (t) => t.exit_price,
      cell: (t) => <span className="mono">{fmtNum(t.exit_price)}</span>,
    },
    {
      key: "qty",
      header: "Qty",
      sortValue: (t) => t.quantity,
      cell: (t) => <span className="mono">{t.quantity}</span>,
    },
    {
      key: "pnl",
      header: "P&L",
      sortValue: (t) => t.pnl,
      cell: (t) => <span className={cn("mono", pnlClass(t.pnl))}>{fmtMoney(t.pnl)}</span>,
    },
    {
      key: "ret",
      header: "Return",
      sortValue: (t) => t.return_pct,
      cell: (t) => <span className={cn("mono", pnlClass(t.return_pct))}>{fmtPct(t.return_pct)}</span>,
    },
    { key: "signal", header: "Signal", cell: (t) => <span className="text-xs">{t.signal}</span> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Backtest</h1>
        <p className="text-sm text-muted-foreground">
          Replay your strategy bar by bar over historical data, with commission and slippage applied.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Strategy</Label>
            <Select value={strategyId ?? ""} onValueChange={setStrategyId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a strategy" />
              </SelectTrigger>
              <SelectContent>
                {(strategies ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Symbol</Label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SYMBOLS.map((s) => (
                  <SelectItem key={s.symbol} value={s.symbol}>
                    {s.symbol} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="start">Start date</Label>
            <Input id="start" type="date" value={startDate} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end">End date</Label>
            <Input id="end" type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capital">Initial capital</Label>
            <Input
              id="capital"
              type="number"
              min={1000}
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="commission">Commission %</Label>
            <Input
              id="commission"
              type="number"
              step="0.01"
              min={0}
              value={commission}
              onChange={(e) => setCommission(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slippage">Slippage %</Label>
            <Input
              id="slippage"
              type="number"
              step="0.01"
              min={0}
              value={slippage}
              onChange={(e) => setSlippage(Number(e.target.value))}
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={execute} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Play className="mr-1 h-4 w-4" aria-hidden />
              )}
              Run backtest
            </Button>
          </div>
        </CardContent>
      </Card>

      {!result ? (
        <EmptyState
          title="No results yet"
          description="Pick a strategy and symbol, then run the backtest to see equity, drawdown and the full trade log."
        />
      ) : (
        <div className="space-y-6">
          {result.overfitting_score >= 60 ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              <AlertTitle>Possible overfitting ({result.overfitting_score}/100)</AlertTitle>
              <AlertDescription>
                These results look unusually clean for this history. Re-test on a different symbol or date range
                before trusting them.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total Return"
              value={fmtPct(result.total_return)}
              sub={`Benchmark ${fmtPct(result.benchmark_return)}`}
              tone={result.total_return >= 0 ? "profit" : "loss"}
            />
            <MetricCard
              label="Sharpe Ratio"
              value={fmtNum(result.sharpe_ratio)}
              tone={result.sharpe_ratio >= 1 ? "profit" : "neutral"}
            />
            <MetricCard label="Max Drawdown" value={fmtPct(-Math.abs(result.max_drawdown))} tone="loss" />
            <MetricCard
              label="Win Rate"
              value={`${fmtNum(result.win_rate, 1)}%`}
              sub={`${result.total_trades} trades · PF ${fmtNum(result.profit_factor)}`}
              tone={result.win_rate >= 50 ? "profit" : "neutral"}
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Equity vs buy &amp; hold</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RLineChart data={result.equity_curve} margin={{ left: 4, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" minTickGap={40} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="var(--color-muted-foreground)"
                    width={64}
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  />
                  <RTooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => fmtMoney(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="equity"
                    name="Strategy"
                    stroke="var(--color-primary)"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="benchmark"
                    name="Buy & hold"
                    stroke="var(--color-muted-foreground)"
                    dot={false}
                    strokeDasharray="4 4"
                  />
                </RLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Drawdown</CardTitle>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RLineChart data={result.equity_curve} margin={{ left: 4, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" minTickGap={40} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      stroke="var(--color-muted-foreground)"
                      width={44}
                      tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                    />
                    <RTooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => `${fmtNum(v)}%`}
                    />
                    <Line
                      type="monotone"
                      dataKey="drawdown"
                      stroke="var(--color-destructive)"
                      dot={false}
                      strokeWidth={2}
                    />
                  </RLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Monthly returns</CardTitle>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.monthly_returns} margin={{ left: 4, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" minTickGap={20} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      stroke="var(--color-muted-foreground)"
                      width={44}
                      tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                    />
                    <RTooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => `${fmtNum(v)}%`}
                    />
                    <Bar dataKey="return_pct" fill="var(--color-chart-2)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Trade log</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                rows={result.trades_log}
                columns={tradeColumns}
                searchable={false}
                pageSize={8}
                caption="Every simulated trade produced by this backtest"
                empty="This strategy never triggered a trade in the selected window."
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
