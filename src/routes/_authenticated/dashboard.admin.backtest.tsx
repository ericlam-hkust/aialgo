import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, Save, SlidersHorizontal } from "lucide-react";
import {
  getBacktestProtocol,
  runScheduledRevalidations,
  saveBacktestProtocol,
} from "@/lib/backtest-validation.functions";
import { DEFAULT_PROTOCOL, type BacktestProtocol } from "@/lib/backtest-protocol";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/dashboard/admin/backtest")({
  component: AdminBacktestSettings,
});

const GROUPS: { title: string; description: string; fields: { key: keyof BacktestProtocol; label: string; type?: "date" | "number" | "text" }[] }[] = [
  {
    title: "Test periods",
    description: "Identical windows for every model. The holdout is never disclosed to contributors.",
    fields: [
      { key: "inSampleStart", label: "In-sample start", type: "date" },
      { key: "inSampleEnd", label: "In-sample end", type: "date" },
      { key: "holdoutStart", label: "Holdout start", type: "date" },
      { key: "holdoutEnd", label: "Holdout end", type: "date" },
    ],
  },
  {
    title: "Execution assumptions",
    description: "Applied against the strategy on every fill.",
    fields: [
      { key: "slippagePct", label: "Slippage (%)" },
      { key: "feeBps", label: "Trading fee (bps per side)" },
      { key: "spreadBps", label: "Spread (bps)" },
      { key: "initialCapital", label: "Initial capital" },
    ],
  },
  {
    title: "Position sizing & risk",
    description: "Constraints enforced during the run.",
    fields: [
      { key: "positionSizingPct", label: "Position size (% of equity)" },
      { key: "maxPositions", label: "Max concurrent positions" },
      { key: "maxLeverage", label: "Max leverage" },
      { key: "maxDrawdownLimitPct", label: "Hard drawdown stop (%)" },
    ],
  },
  {
    title: "Pass criteria & monitoring",
    description: "Thresholds that decide publication, re-validation and divergence alerts.",
    fields: [
      { key: "minSharpe", label: "Minimum Sharpe" },
      { key: "minTrades", label: "Minimum trades" },
      { key: "maxAllowedDrawdownPct", label: "Max allowed drawdown (%)" },
      { key: "divergenceThresholdPct", label: "Divergence threshold (%)" },
      { key: "revalidationMonths", label: "Re-validation interval (months)" },
      { key: "benchmark", label: "Benchmark symbol", type: "text" },
    ],
  },
];

function AdminBacktestSettings() {
  const remote = useQuery({ queryKey: ["backtest-protocol"], queryFn: () => getBacktestProtocol() });
  const [protocol, setProtocol] = useState<BacktestProtocol>(DEFAULT_PROTOCOL);

  useEffect(() => {
    if (remote.data) setProtocol(remote.data);
  }, [remote.data]);

  const save = useMutation({
    mutationFn: () => saveBacktestProtocol({ data: { protocol } }),
    onSuccess: () => toast.success("Backtest protocol updated"),
    onError: (e: Error) => toast.error(e.message),
  });

  const reval = useMutation({
    mutationFn: () => runScheduledRevalidations(),
    onSuccess: (r) =>
      toast.success(
        `Re-validated ${r.revalidated.length} model(s) · ${r.flagged.length} divergence flag(s) · ${r.unlisted.length} unlisted`,
      ),
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (key: keyof BacktestProtocol, raw: string, isText: boolean) =>
    setProtocol({ ...protocol, [key]: isText ? raw : Number(raw) } as BacktestProtocol);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <SlidersHorizontal className="h-5 w-5 text-primary" aria-hidden /> Standardized backtest protocol
          </h1>
          <p className="text-sm text-muted-foreground">
            Every submitted model runs under these identical conditions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => reval.mutate()} disabled={reval.isPending}>
            <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
            {reval.isPending ? "Running…" : "Run re-validation sweep"}
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="mr-1.5 h-4 w-4" aria-hidden /> Save protocol
          </Button>
        </div>
      </div>

      {GROUPS.map((g) => (
        <Card key={g.title} className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">{g.title}</CardTitle>
            <CardDescription>{g.description}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {g.fields.map((f) => {
              const isText = f.type === "text" || f.type === "date";
              return (
                <div key={String(f.key)} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Input
                    className="mono"
                    type={f.type === "date" ? "date" : f.type === "text" ? "text" : "number"}
                    value={String(protocol[f.key])}
                    onChange={(e) => set(f.key, e.target.value, isText)}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
