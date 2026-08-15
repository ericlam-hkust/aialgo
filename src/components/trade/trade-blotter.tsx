import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SourceBadge } from "@/components/trade/source-badge";
import type { DeskOrder } from "@/components/trade/order-book";
import { fmtMoney, fmtNum } from "@/lib/format";

type Props = {
  orders: DeskOrder[];
  accountName: (order: DeskOrder & { broker_connection_id?: string }) => string;
  nameFor: (o: DeskOrder) => { strategyName?: string | null; modelName?: string | null };
  currency: string;
};

/** One chronological list of every trade — human placed and strategy generated. */
export function TradeBlotter({ orders, accountName, nameFor, currency }: Props) {
  const [source, setSource] = useState("all");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toUpperCase();
    return orders.filter((o) => {
      if (source !== "all" && (o.source ?? "broker") !== source) return false;
      if (q && !o.symbol.toUpperCase().includes(q)) return false;
      return true;
    });
  }, [orders, source, search]);

  const exportCsv = () => {
    const header = ["time", "account", "symbol", "side", "type", "quantity", "filled", "price", "status", "source", "attribution"];
    const lines = rows.map((o) => {
      const meta = nameFor(o);
      return [
        new Date(o.placed_at ?? o.synced_at).toISOString(),
        accountName(o),
        o.symbol,
        o.side,
        o.order_type ?? "",
        o.quantity,
        o.filled_quantity,
        o.avg_fill_price ?? o.limit_price ?? "",
        o.status,
        o.source ?? "broker",
        meta.strategyName ?? meta.modelName ?? "human",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aialgo-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-border/70">
      <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle className="text-base">Trade blotter</CardTitle>
          <CardDescription>Every order across your accounts, with who or what placed it.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter symbol"
            className="h-9 w-36"
          />
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="manual">Manual (human)</SelectItem>
              <SelectItem value="algo">Algo strategy</SelectItem>
              <SelectItem value="ai_model">AI model</SelectItem>
              <SelectItem value="broker">Broker sync</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden /> CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="px-6 text-sm text-muted-foreground">No trades match these filters yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Executed by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 200).map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="mono text-xs text-muted-foreground">
                    {new Date(o.placed_at ?? o.synced_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs">{accountName(o)}</TableCell>
                  <TableCell className="mono">{o.symbol}</TableCell>
                  <TableCell className={o.side.toLowerCase() === "sell" ? "text-loss" : "text-profit"}>
                    {o.side.toUpperCase()}
                  </TableCell>
                  <TableCell className="mono text-right">{fmtNum(Number(o.quantity))}</TableCell>
                  <TableCell className="mono text-right">
                    {o.avg_fill_price
                      ? fmtMoney(Number(o.avg_fill_price), currency)
                      : o.limit_price
                        ? fmtMoney(Number(o.limit_price), currency)
                        : "mkt"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={o.status === "rejected" ? "destructive" : "outline"}>{o.status}</Badge>
                    {o.reject_reason ? (
                      <p className="mt-1 max-w-[220px] text-[10px] text-loss">{o.reject_reason}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <SourceBadge source={o.source} {...nameFor(o)} />
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
