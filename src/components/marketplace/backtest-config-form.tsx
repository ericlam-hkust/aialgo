import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Database, XCircle } from "lucide-react";
import { checkDataAvailability } from "@/lib/backtest-validation.functions";
import { listDataCatalog } from "@/lib/data-library.functions";
import { listDataSources } from "@/lib/data-sources.functions";
import { PROVIDERS } from "@/lib/data-providers";
import { DATA_INPUTS, SIGNAL_FREQUENCIES, TIMEFRAMES, type BacktestConfig } from "@/lib/backtest-protocol";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export const emptyBacktestConfig = (assetClass = "stocks"): BacktestConfig => ({
  assetClass,
  universe: [],
  timeframe: "1d",
  signalFrequency: "daily",
  minimumCapital: 10_000,
  dataInputs: ["ohlcv"],
  dataSourceKind: "platform",
  dataSourceLabel: "aiAlgo platform market data",
});

export function BacktestConfigForm({
  value,
  onChange,
  showDateRange = false,
}: {
  value: BacktestConfig;
  onChange: (next: BacktestConfig) => void;
  showDateRange?: boolean;
}) {
  const catalog = useQuery({ queryKey: ["data-catalog"], queryFn: () => listDataCatalog() });
  const sources = useQuery({ queryKey: ["data-sources"], queryFn: () => listDataSources() });
  const [checked, setChecked] = useState<Awaited<ReturnType<typeof checkDataAvailability>> | null>(null);

  const feeds = useMemo(
    () => (catalog.data ?? []).filter((f) => f.asset_class === value.assetClass),
    [catalog.data, value.assetClass],
  );

  const connections = sources.data?.connections ?? [];

  const check = useMutation({
    mutationFn: () => checkDataAvailability({ data: { symbols: value.universe, timeframe: value.timeframe } }),
    onSuccess: setChecked,
  });

  const set = (patch: Partial<BacktestConfig>) => {
    setChecked(null);
    onChange({ ...value, ...patch });
  };

  const toggleSymbol = (symbol: string) => {
    const next = value.universe.includes(symbol)
      ? value.universe.filter((s) => s !== symbol)
      : [...value.universe, symbol];
    set({ universe: next });
  };

  const selectSource = (id: string) => {
    if (id === "platform") {
      setChecked(null);
      const { dataSourceId: _omit, ...rest } = value;
      onChange({ ...rest, dataSourceKind: "platform", dataSourceLabel: "aiAlgo platform market data" });
      return;
    }

    const conn = connections.find((c) => c.id === id);
    if (!conn) return;
    const providerName = PROVIDERS.find((p) => p.id === conn.provider)?.name ?? conn.provider;
    set({
      dataSourceKind: "contributor",
      dataSourceId: conn.id,
      dataSourceLabel: conn.label ? `${providerName} — ${conn.label}` : providerName,
    });
  };

  return (
    <div className="space-y-5">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" aria-hidden /> Data source
          </CardTitle>
          <CardDescription>
            Every run is stamped with the feed that produced it, and buyers see this on the listing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <button
            type="button"
            onClick={() => selectSource("platform")}
            className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
              value.dataSourceKind !== "contributor"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <span>
              <span className="font-medium">aiAlgo platform market data</span>
              <span className="block text-xs text-muted-foreground">Verified platform feeds from the data library.</span>
            </span>
            <Badge variant="secondary">Platform verified</Badge>
          </button>

          {connections.map((conn) => {
            const usable = conn.enabled && conn.status === "connected";
            const providerName = PROVIDERS.find((p) => p.id === conn.provider)?.name ?? conn.provider;
            const active = value.dataSourceId === conn.id;
            return (
              <button
                key={conn.id}
                type="button"
                disabled={!usable}
                onClick={() => selectSource(conn.id)}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  active ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                } ${usable ? "" : "cursor-not-allowed opacity-50"}`}
              >
                <span>
                  <span className="font-medium">{providerName}</span>
                  {conn.label ? <span className="text-muted-foreground"> · {conn.label}</span> : null}
                  <span className="block text-xs text-muted-foreground">
                    {usable
                      ? `Connection tested OK${conn.last_checked_at ? ` · ${new Date(conn.last_checked_at).toLocaleDateString()}` : ""}`
                      : conn.status_message || "Not tested yet — test this connection under Data sources."}
                  </span>
                </span>
                <Badge variant={usable ? "outline" : "destructive"}>{usable ? "Your feed" : conn.status ?? "untested"}</Badge>
              </button>
            );
          })}

          <p className="text-xs text-muted-foreground">
            Want to use your own feed?{" "}
            <Link to="/dashboard/data-sources" className="text-primary underline-offset-2 hover:underline">
              Connect and test it under Data sources
            </Link>{" "}
            first — only passing connections can run a backtest.
          </p>
        </CardContent>
      </Card>


      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Asset class</Label>
          <Select value={value.assetClass} onValueChange={(v) => set({ assetClass: v, universe: [] })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["stocks", "crypto", "forex", "futures"].map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Timeframe</Label>
          <Select value={value.timeframe} onValueChange={(v) => set({ timeframe: v as BacktestConfig["timeframe"] })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Signal frequency</Label>
          <Select value={value.signalFrequency} onValueChange={(v) => set({ signalFrequency: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIGNAL_FREQUENCIES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Minimum capital required</Label>
          <Input
            className="mono"
            inputMode="numeric"
            value={String(value.minimumCapital)}
            onChange={(e) => set({ minimumCapital: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })}
          />
        </div>
        {showDateRange ? (
          <>
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input type="date" value={value.startDate ?? ""} onChange={(e) => set({ startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>End date</Label>
              <Input type="date" value={value.endDate ?? ""} onChange={(e) => set({ endDate: e.target.value })} />
            </div>
          </>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Instruments / universe</Label>
        <div className="flex flex-wrap gap-2">
          {feeds.map((f) => {
            const active = value.universe.includes(f.symbol);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => toggleSymbol(f.symbol)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {f.symbol}
              </button>
            );
          })}
          {feeds.length === 0 ? <p className="text-sm text-muted-foreground">Loading feeds…</p> : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Required data inputs</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {DATA_INPUTS.map((d) => (
            <label key={d.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={value.dataInputs.includes(d.value)}
                onCheckedChange={(c) =>
                  set({
                    dataInputs: c
                      ? [...value.dataInputs, d.value]
                      : value.dataInputs.filter((x) => x !== d.value),
                  })
                }
              />
              {d.label}
            </label>
          ))}
        </div>
      </div>

      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" aria-hidden /> Data availability checker
            </CardTitle>
            <CardDescription>Confirms the platform holds the history your configuration needs.</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => check.mutate()}
            disabled={check.isPending || value.universe.length === 0}
          >
            {check.isPending ? "Checking…" : "Check coverage"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {!checked ? (
            <p className="text-sm text-muted-foreground">
              Select instruments and a timeframe, then run the check before submitting.
            </p>
          ) : (
            checked.map((r) => (
              <div key={r.symbol} className="flex items-start gap-2 text-sm">
                {r.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-profit" aria-hidden />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-loss" aria-hidden />
                )}
                <span className={r.ok ? "" : "text-loss"}>{r.message}</span>
                {r.rowCount ? (
                  <Badge variant="outline" className="mono ml-auto shrink-0">
                    {Number(r.rowCount).toLocaleString()} rows
                  </Badge>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
