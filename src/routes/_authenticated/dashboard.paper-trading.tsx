import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, OctagonX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMarketStore } from "@/store/market-store";
import { MetricCard } from "@/components/metric-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDate, fmtMoney, fmtNum, fmtPct, pnlClass } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/paper-trading")({
  component: PaperTrading,
});

type Position = {
  id: string;
  symbol: string;
  quantity: number;
  avg_entry_price: number;
  current_price: number;
  strategy_name: string | null;
  market: string;
};

type Trade = {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number;
  exit_price: number | null;
  pnl: number;
  pnl_percent: number;
  status: string;
  opened_at: string;
  strategy_name: string | null;
};

function PaperTrading() {
  const qc = useQueryClient();
  const ticks = useMarketStore((s) => s.ticks);

  const { data } = useQuery({
    queryKey: ["paper-desk"],
    queryFn: async () => {
      const [positions, trades, deployments] = await Promise.all([
        supabase.from("paper_positions").select("*"),
        supabase.from("paper_trades").select("*").order("opened_at", { ascending: false }).limit(100),
        supabase.from("strategy_deployments").select("*").order("deployed_at", { ascending: false }),
      ]);
      return {
        positions: (positions.data ?? []) as Position[],
        trades: (trades.data ?? []) as Trade[],
        deployments: deployments.data ?? [],
      };
    },
  });

  const positions = data?.positions ?? [];
  const trades = data?.trades ?? [];

  const livePrice = (p: Position) => ticks[p.symbol]?.price ?? Number(p.current_price);
  const unrealized = positions.reduce(
    (a, p) => a + (livePrice(p) - Number(p.avg_entry_price)) * Number(p.quantity),
    0,
  );
  const exposure = positions.reduce((a, p) => a + livePrice(p) * Number(p.quantity), 0);
  const realized = trades.reduce((a, t) => a + Number(t.pnl), 0);

  const closePosition = useMutation({
    mutationFn: async (p: Position) => {
      const price = livePrice(p);
      const pnl = (price - Number(p.avg_entry_price)) * Number(p.quantity);
      const { error } = await supabase.from("paper_trades").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id ?? "",
        symbol: p.symbol,
        side: "sell",
        order_type: "market",
        quantity: p.quantity,
        entry_price: p.avg_entry_price,
        exit_price: price,
        pnl,
        pnl_percent: ((price - Number(p.avg_entry_price)) / Number(p.avg_entry_price)) * 100,
        status: "closed",
        closed_at: new Date().toISOString(),
        strategy_name: p.strategy_name,
      });
      if (error) throw new Error(error.message);
      const { error: delError } = await supabase.from("paper_positions").delete().eq("id", p.id);
      if (delError) throw new Error(delError.message);
    },
    onSuccess: () => {
      toast.success("Position closed");
      qc.invalidateQueries({ queryKey: ["paper-desk"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const killSwitch = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("strategy_deployments")
        .update({ status: "stopped" })
        .eq("status", "running");
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("All strategies halted");
      qc.invalidateQueries({ queryKey: ["paper-desk"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const posColumns: Column<Position>[] = [
    { key: "symbol", header: "Symbol", sortValue: (p) => p.symbol, cell: (p) => <span className="mono font-medium">{p.symbol}</span> },
    { key: "qty", header: "Qty", sortValue: (p) => p.quantity, cell: (p) => <span className="mono">{p.quantity}</span> },
    { key: "entry", header: "Avg entry", cell: (p) => <span className="mono">{fmtNum(Number(p.avg_entry_price))}</span> },
    { key: "last", header: "Last", cell: (p) => <span className="mono">{fmtNum(livePrice(p))}</span> },
    {
      key: "pnl",
      header: "Unrealised",
      sortValue: (p) => (livePrice(p) - Number(p.avg_entry_price)) * Number(p.quantity),
      cell: (p) => {
        const v = (livePrice(p) - Number(p.avg_entry_price)) * Number(p.quantity);
        return <span className={cn("mono", pnlClass(v))}>{fmtMoney(v)}</span>;
      },
    },
    { key: "strategy", header: "Strategy", cell: (p) => <span className="text-xs">{p.strategy_name ?? "Manual"}</span> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (p) => (
        <Button size="sm" variant="outline" onClick={() => closePosition.mutate(p)}>
          Close
        </Button>
      ),
    },
  ];

  const tradeColumns: Column<Trade>[] = [
    { key: "time", header: "Opened", sortValue: (t) => new Date(t.opened_at).getTime(), cell: (t) => fmtDate(t.opened_at) },
    { key: "symbol", header: "Symbol", cell: (t) => <span className="mono">{t.symbol}</span> },
    { key: "side", header: "Side", cell: (t) => <Badge variant={t.side === "buy" ? "default" : "secondary"} className="uppercase">{t.side}</Badge> },
    { key: "qty", header: "Qty", cell: (t) => <span className="mono">{t.quantity}</span> },
    { key: "pnl", header: "P&L", sortValue: (t) => Number(t.pnl), cell: (t) => <span className={cn("mono", pnlClass(Number(t.pnl)))}>{fmtMoney(Number(t.pnl))}</span> },
    { key: "ret", header: "Return", cell: (t) => <span className={cn("mono", pnlClass(Number(t.pnl_percent)))}>{fmtPct(Number(t.pnl_percent))}</span> },
    { key: "status", header: "Status", cell: (t) => <Badge variant="outline">{t.status}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Paper trading desk</h1>
          <p className="text-sm text-muted-foreground">Simulated fills against a live-updating price feed.</p>
        </div>
        <Button variant="destructive" onClick={() => killSwitch.mutate()}>
          <OctagonX className="mr-1 h-4 w-4" aria-hidden /> Emergency stop
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Unrealized P&L" value={fmtMoney(unrealized)} tone={unrealized >= 0 ? "profit" : "loss"} />
        <MetricCard label="Realised P&L" value={fmtMoney(realized)} tone={realized >= 0 ? "profit" : "loss"} tip="Profit and loss from trades that are already closed." />
        <MetricCard label="Buying Power" value={fmtMoney(Math.max(0, 1_000_000 + realized - exposure))} />
        <MetricCard label="Open positions" value={String(positions.length)} tip="Positions currently held by the simulator." />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Open positions</CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-6 w-6" aria-hidden />}
              title="No open positions"
              description="Positions opened by your deployed strategies will appear here in real time."
            />
          ) : (
            <DataTable rows={positions} columns={posColumns} searchable={false} caption="Open paper positions" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Order history</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={trades}
            columns={tradeColumns}
            searchKeys={(t) => `${t.symbol} ${t.side} ${t.strategy_name ?? ""}`}
            caption="Simulated order history"
            empty="No orders have been filled yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
