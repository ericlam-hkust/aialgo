import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowUpRight, Boxes, Plus, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/metric-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketStore } from "@/store/market-store";
import { fmtDate, fmtMoney, fmtNum, fmtPct, pnlClass } from "@/lib/format";
import { symbolInfo } from "@/lib/market";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Overview,
});

const START_CAPITAL = 1_000_000;

function Overview() {
  const ticks = useMarketStore((s) => s.ticks);

  const { data, isLoading } = useQuery({
    queryKey: ["overview"],
    queryFn: async () => {
      const [positions, trades, strategies, deployments, events] = await Promise.all([
        supabase.from("paper_positions").select("*"),
        supabase.from("paper_trades").select("*").order("opened_at", { ascending: false }).limit(50),
        supabase.from("strategies").select("id,name,category,updated_at").eq("is_template", false),
        supabase.from("strategy_deployments").select("*"),
        supabase.from("risk_events").select("*").order("triggered_at", { ascending: false }).limit(5),
      ]);
      return {
        positions: positions.data ?? [],
        trades: trades.data ?? [],
        strategies: strategies.data ?? [],
        deployments: deployments.data ?? [],
        events: events.data ?? [],
      };
    },
  });

  const positions = data?.positions ?? [];
  const trades = data?.trades ?? [];
  const realized = trades.reduce((a, t) => a + Number(t.pnl ?? 0), 0);
  const unrealized = positions.reduce((a, p) => {
    const live = ticks[p.symbol]?.price ?? Number(p.current_price);
    return a + (live - Number(p.avg_entry_price)) * Number(p.quantity);
  }, 0);
  const equity = START_CAPITAL + realized + unrealized;
  const totalPct = ((equity - START_CAPITAL) / START_CAPITAL) * 100;

  const curve = Array.from({ length: 30 }, (_, i) => {
    const t = (i + 1) / 30;
    return {
      day: `D${i + 1}`,
      equity: START_CAPITAL + (realized + unrealized) * t,
    };
  });

  const closed = trades.filter((t) => t.status === "closed");
  const winRate = closed.length ? (closed.filter((t) => Number(t.pnl) > 0).length / closed.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio overview</h1>
          <p className="text-sm text-muted-foreground">
            Simulated capital of {fmtMoney(START_CAPITAL)} across your paper-trading desk.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/dashboard/resource-library">Browse Resource Library</Link>
          </Button>
          <Button asChild>
            <Link to="/dashboard/strategies/builder">
              <Plus className="mr-1 h-4 w-4" aria-hidden /> New strategy
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Portfolio Value"
            value={fmtMoney(equity)}
            sub={`${fmtPct(totalPct)} since inception`}
            tone={totalPct >= 0 ? "profit" : "loss"}
            tip="Starting capital plus realised and unrealised profit across all paper positions."
          />
          <MetricCard
            label="Unrealized P&L"
            value={fmtMoney(unrealized)}
            sub={`${positions.length} open position${positions.length === 1 ? "" : "s"}`}
            tone={unrealized >= 0 ? "profit" : "loss"}
          />
          <MetricCard
            label="Win Rate"
            value={`${fmtNum(winRate, 1)}%`}
            sub={`${closed.length} closed trades`}
            tone={winRate >= 50 ? "profit" : "neutral"}
          />
          <MetricCard
            label="Active Strategies"
            value={String(data?.deployments.filter((d) => d.status === "running").length ?? 0)}
            sub={`${data?.strategies.length ?? 0} saved in library`}
            icon={<Boxes className="h-4 w-4" aria-hidden />}
            tip="Strategies currently deployed to the paper-trading engine."
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Equity curve</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curve} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="var(--color-muted-foreground)"
                  width={70}
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
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#eq)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Live watchlist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.values(ticks)
              .slice(0, 7)
              .map((t) => (
                <div key={t.symbol} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="mono font-medium">{t.symbol}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {symbolInfo(t.symbol)?.name ?? ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="mono">{fmtNum(t.price)}</span>
                    <span className={cn("mono text-xs", pnlClass(t.changePct))}>{fmtPct(t.changePct)}</span>
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent activity</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard/paper-trading">
                Open desk <ArrowUpRight className="ml-1 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {trades.length === 0 ? (
              <EmptyState
                icon={<Activity className="h-6 w-6" aria-hidden />}
                title="No trades yet"
                description="Deploy a strategy to paper trading and its fills will appear here."
                action={
                  <Button asChild size="sm">
                    <Link to="/dashboard/resource-library">Start from a resource</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border text-sm">
                {trades.slice(0, 6).map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-2">
                      <Badge variant={t.side === "buy" ? "default" : "secondary"} className="uppercase">
                        {t.side}
                      </Badge>
                      <span className="mono">{t.symbol}</span>
                      <span className="text-xs text-muted-foreground">{t.strategy_name ?? "Manual"}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className={cn("mono text-xs", pnlClass(Number(t.pnl)))}>
                        {fmtMoney(Number(t.pnl))}
                      </span>
                      <span className="text-xs text-muted-foreground">{fmtDate(t.opened_at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Risk alerts</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard/risk">
                Risk centre <ArrowUpRight className="ml-1 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(data?.events.length ?? 0) === 0 ? (
              <EmptyState
                icon={<TrendingUp className="h-6 w-6" aria-hidden />}
                title="All clear"
                description="No risk limits have been breached. Alerts will show up here the moment one is."
              />
            ) : (
              <ul className="divide-y divide-border text-sm">
                {data!.events.map((e) => (
                  <li key={e.id} className="py-2.5">
                    <div className="flex items-center justify-between">
                      <Badge variant={e.severity === "critical" ? "destructive" : "secondary"}>
                        {e.event_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{fmtDate(e.triggered_at)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{e.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
