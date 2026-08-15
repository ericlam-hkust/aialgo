import { useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TicketAttribution = { kind: "manual" | "algo" | "ai_model"; strategyId?: string; activationId?: string };

export type TicketPayload = {
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  orderType: "market" | "limit";
  limitPrice: number | null;
  timeInForce: "day" | "gtc";
  attribution: TicketAttribution;
};

type Props = {
  symbols: string[];
  lastPrice: (symbol: string) => number | null;
  currency: string;
  accountLabel: string;
  simulated: boolean;
  strategies: { id: string; name: string }[];
  activations: { id: string; name: string }[];
  pending: boolean;
  onSubmit: (payload: TicketPayload) => void;
};

/** Manual order ticket with optional strategy attribution and a confirmation step. */
export function OrderTicket({
  symbols,
  lastPrice,
  currency,
  accountLabel,
  simulated,
  strategies,
  activations,
  pending,
  onSubmit,
}: Props) {
  const [symbol, setSymbol] = useState(symbols[0] ?? "");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("100");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [tif, setTif] = useState<"day" | "gtc">("day");
  const [link, setLink] = useState("manual");
  const [confirming, setConfirming] = useState(false);

  const price = lastPrice(symbol);
  const qty = Number(quantity) || 0;
  const refPrice = orderType === "limit" ? Number(limitPrice) || 0 : (price ?? 0);
  const notional = qty * refPrice;

  const attribution = useMemo<TicketAttribution>(() => {
    if (link.startsWith("algo:")) return { kind: "algo", strategyId: link.slice(5) };
    if (link.startsWith("ai:")) return { kind: "ai_model", activationId: link.slice(3) };
    return { kind: "manual" };
  }, [link]);

  const attributionLabel =
    attribution.kind === "algo"
      ? `Algo · ${strategies.find((s) => s.id === attribution.strategyId)?.name ?? ""}`
      : attribution.kind === "ai_model"
        ? `AI · ${activations.find((a) => a.id === attribution.activationId)?.name ?? ""}`
        : "Manual (human executed)";

  const invalid = !symbol || qty <= 0 || (orderType === "limit" && !(Number(limitPrice) > 0));

  const submit = () => {
    setConfirming(false);
    onSubmit({
      symbol,
      side,
      quantity: qty,
      orderType,
      limitPrice: orderType === "limit" ? Number(limitPrice) : null,
      timeInForce: tif,
      attribution,
    });
  };

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Order ticket</CardTitle>
        <CardDescription>
          {simulated ? "Simulated fills against the live feed." : "Routed live to your broker."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={side === "buy" ? "default" : "outline"}
            className={cn(side === "buy" && "bg-profit text-background hover:bg-profit/90")}
            onClick={() => setSide("buy")}
          >
            Buy
          </Button>
          <Button
            type="button"
            variant={side === "sell" ? "default" : "outline"}
            className={cn(side === "sell" && "bg-loss text-background hover:bg-loss/90")}
            onClick={() => setSide("sell")}
          >
            Sell
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ticket-symbol">Symbol</Label>
          <Input
            id="ticket-symbol"
            list="ticket-symbols"
            value={symbol}
            maxLength={24}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="AAPL"
          />
          <datalist id="ticket-symbols">
            {symbols.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <p className="text-xs text-muted-foreground">
            Last price: {price ? `${fmtMoney(price, currency)}` : "no live quote yet"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ticket-qty">Quantity</Label>
            <Input
              id="ticket-qty"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/[^\d.]/g, ""))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Order type</Label>
            <Select value={orderType} onValueChange={(v) => setOrderType(v as "market" | "limit")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="limit">Limit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {orderType === "limit" ? (
          <div className="space-y-1.5">
            <Label htmlFor="ticket-limit">Limit price</Label>
            <Input
              id="ticket-limit"
              inputMode="decimal"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder={price ? String(price) : "0.00"}
            />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label>Time in force</Label>
          <Select value={tif} onValueChange={(v) => setTif(v as "day" | "gtc")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="gtc">Good till cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Link to strategy</Label>
          <Select value={link} onValueChange={setLink}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">None — manual trade</SelectItem>
              {strategies.map((s) => (
                <SelectItem key={s.id} value={`algo:${s.id}`}>
                  Algo · {s.name}
                </SelectItem>
              ))}
              {activations.map((a) => (
                <SelectItem key={a.id} value={`ai:${a.id}`}>
                  AI · {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Linking only tags the trade for reporting — the strategy does not take over the order.
          </p>
        </div>

        <div className="rounded-md border border-border/70 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Estimated notional</span>
            <span className="mono">{notional > 0 ? fmtMoney(notional, currency) : "—"}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-muted-foreground">Attribution</span>
            <Badge variant="outline">{attributionLabel}</Badge>
          </div>
        </div>

        <Button className="w-full" disabled={invalid || pending} onClick={() => setConfirming(true)}>
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="mr-2 h-4 w-4" aria-hidden />
          )}
          {side === "buy" ? "Buy" : "Sell"} {symbol || "—"}
        </Button>
      </CardContent>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm this order</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1 text-sm">
                <p>
                  <strong className="uppercase">{side}</strong> {qty} {symbol} ·{" "}
                  {orderType === "limit" ? `limit ${limitPrice}` : "market"} · {tif.toUpperCase()}
                </p>
                <p>Account: {accountLabel}</p>
                <p>Estimated cost: {notional > 0 ? fmtMoney(notional, currency) : "unknown"}</p>
                <p>Recorded as: {attributionLabel}</p>
                <p className={simulated ? "text-muted-foreground" : "text-loss"}>
                  {simulated
                    ? "This account is in simulation mode — no real order is routed."
                    : "This sends a real order to your broker."}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submit}>Send order</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
