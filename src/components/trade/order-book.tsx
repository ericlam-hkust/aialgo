import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SourceBadge } from "@/components/trade/source-badge";
import { fmtMoney, fmtNum, pnlClass } from "@/lib/format";

export type DeskOrder = {
  id: string;
  symbol: string;
  side: string;
  order_type: string | null;
  status: string;
  quantity: number;
  filled_quantity: number;
  limit_price: number | null;
  avg_fill_price: number | null;
  reject_reason?: string | null;
  source: string | null;
  strategy_id: string | null;
  model_id: string | null;
  activation_id: string | null;
  placed_at: string | null;
  synced_at: string;
};

export type DeskPosition = {
  id: string;
  symbol: string;
  quantity: number;
  avg_cost: number;
  market_price: number;
  market_value: number;
  unrealized_pnl: number;
  currency: string | null;
};

export const WORKING_STATUSES = ["submitted", "pending", "presubmitted", "accepted", "new", "partially_filled", "open", "working"];

export function isWorking(status: string): boolean {
  return WORKING_STATUSES.includes(status.toLowerCase());
}

export function OrderBook({
  orders,
  currency,
  nameFor,
  onCancel,
  cancellingId,
}: {
  orders: DeskOrder[];
  currency: string;
  nameFor: (o: DeskOrder) => { strategyName?: string | null; modelName?: string | null };
  onCancel: (id: string) => void;
  cancellingId: string | null;
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Live order book</CardTitle>
        <CardDescription>Working orders on the selected account.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {orders.length === 0 ? (
          <p className="px-6 text-sm text-muted-foreground">No working orders right now.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Filled / Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Source</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="mono text-xs text-muted-foreground">
                    {new Date(o.placed_at ?? o.synced_at).toLocaleTimeString()}
                  </TableCell>
                  <TableCell className="mono">{o.symbol}</TableCell>
                  <TableCell className={o.side.toLowerCase() === "sell" ? "text-loss" : "text-profit"}>
                    {o.side.toUpperCase()}
                  </TableCell>
                  <TableCell className="text-xs">
                    {o.order_type ?? "—"} <Badge variant="outline">{o.status}</Badge>
                  </TableCell>
                  <TableCell className="mono text-right">
                    {fmtNum(Number(o.filled_quantity))} / {fmtNum(Number(o.quantity))}
                  </TableCell>
                  <TableCell className="mono text-right">
                    {o.avg_fill_price
                      ? fmtMoney(Number(o.avg_fill_price), currency)
                      : o.limit_price
                        ? fmtMoney(Number(o.limit_price), currency)
                        : "mkt"}
                  </TableCell>
                  <TableCell>
                    <SourceBadge source={o.source} {...nameFor(o)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => onCancel(o.id)} disabled={cancellingId === o.id}>
                      {cancellingId === o.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <X className="h-3.5 w-3.5" aria-hidden />
                      )}
                      <span className="sr-only">Cancel order</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function PositionsTable({ positions, currency }: { positions: DeskPosition[]; currency: string }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Positions</CardTitle>
        <CardDescription>Marked against the live feed.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {positions.length === 0 ? (
          <p className="px-6 text-sm text-muted-foreground">No open positions on this account.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Avg cost</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Unrealised</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="mono">{p.symbol}</TableCell>
                  <TableCell className="mono text-right">{fmtNum(Number(p.quantity))}</TableCell>
                  <TableCell className="mono text-right">{fmtMoney(Number(p.avg_cost), p.currency ?? currency)}</TableCell>
                  <TableCell className="mono text-right">
                    {fmtMoney(Number(p.market_price), p.currency ?? currency)}
                  </TableCell>
                  <TableCell className="mono text-right">
                    {fmtMoney(Number(p.market_value), p.currency ?? currency)}
                  </TableCell>
                  <TableCell className={`mono text-right ${pnlClass(Number(p.unrealized_pnl))}`}>
                    {fmtMoney(Number(p.unrealized_pnl), p.currency ?? currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
