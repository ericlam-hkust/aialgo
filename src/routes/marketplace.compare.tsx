import { useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, GitCompare, TriangleAlert, X } from "lucide-react";
import { compareModelsData, listPublicModels, type PublicModel } from "@/lib/models.functions";
import type { BacktestReport } from "@/lib/backtest-protocol";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { fmtNum, pnlClass } from "@/lib/format";
import { labelFor, ASSET_CLASSES, STRATEGY_TYPES } from "@/lib/marketplace";

const LINE_COLORS = ["var(--color-primary)", "var(--color-chart-2, #60a5fa)", "var(--color-warning)"];

const catalogQuery = queryOptions({
  queryKey: ["public-models"],
  queryFn: () => listPublicModels(),
});

const compareQuery = (slugs: string[]) =>
  queryOptions({
    queryKey: ["compare-models", slugs.join(",")],
    queryFn: () => compareModelsData({ data: { slugs } }),
  });

function parseSlugs(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw) return [];
  return raw.split(",").filter(Boolean).slice(0, 3);
}

export const Route = createFileRoute("/marketplace/compare")({
  validateSearch: (search: Record<string, unknown>) => ({ models: typeof search["models"] === "string" ? (search["models"] as string) : "" }),
  head: () => ({
    meta: [
      { title: "Compare AI trading models — aiAlgo" },
      {
        name: "description",
        content:
          "Compare up to three verified AI trading models side by side: overlaid equity curves, full metrics table, walk-forward consistency and market-regime breakdown.",
      },
      { property: "og:title", content: "Compare AI trading models — aiAlgo" },
      { property: "og:description", content: "Side-by-side verified backtest comparison for aiAlgo marketplace models." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const slugs = parseSlugs(search.models);
  const catalog = useSuspenseQuery(catalogQuery).data as PublicModel[];
  const { data: rows } = useSuspenseQuery(compareQuery(slugs));

  const setSlugs = (next: string[]) =>
    navigate({ search: { models: [...new Set(next)].slice(0, 3).join(",") } });

  const reports = useMemo(
    () => rows.map((r) => ({ row: r, report: (r.report?.results as unknown as BacktestReport | null) ?? null })),
    [rows],
  );

  const overlay = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    reports.forEach(({ row, report }, i) => {
      if (!report) return;
      const base = report.equity[0]?.v || 1;
      for (const p of report.equity) {
        const entry = map.get(p.t) ?? { t: p.t };
        entry[`m${i}`] = Number((((p.v - base) / base) * 100).toFixed(2));
        map.set(p.t, entry);
      }
    });
    return [...map.values()].sort((a, b) => String(a["t"]).localeCompare(String(b["t"])));
  }, [reports]);

  const regimes = useMemo(() => {
    const names = [...new Set(reports.flatMap(({ report }) => report?.regimes.map((r) => r.regime) ?? []))];
    return names.map((regime) => ({
      regime,
      values: reports.map(({ report }) => report?.regimes.find((r) => r.regime === regime) ?? null),
    }));
  }, [reports]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/marketplace">
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> All models
        </Link>
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="secondary" className="gap-1.5">
            <GitCompare className="h-3.5 w-3.5" aria-hidden /> Comparison
          </Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Compare verified backtests</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick up to three live models. Equity curves are rebased to 0% so shapes are directly comparable.
          </p>
        </div>
      </div>

      <Card className="mt-6 border-border/70 bg-card/60">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-1">
              <Select
                value={slugs[i] ?? ""}
                onValueChange={(v) => {
                  const next = [...slugs];
                  next[i] = v;
                  setSlugs(next.filter(Boolean));
                }}
              >
                <SelectTrigger className="w-[230px]" aria-label={`Model ${i + 1}`}>
                  <SelectValue placeholder={`Select model ${i + 1}`} />
                </SelectTrigger>
                <SelectContent>
                  {catalog
                    .filter((m) => m.slug === slugs[i] || !slugs.includes(m.slug))
                    .map((m) => (
                      <SelectItem key={m.slug} value={m.slug}>
                        {m.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {slugs[i] ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove model ${i + 1}`}
                  onClick={() => setSlugs(slugs.filter((_, idx) => idx !== i))}
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      {reports.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<GitCompare className="h-6 w-6" aria-hidden />}
            title="Nothing selected yet"
            description="Choose models above, or tick “Compare” on cards in the catalog."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {reports.map(({ row }, i) => (
              <Card key={row.slug} className="border-border/70">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: LINE_COLORS[i] }} aria-hidden />
                    <Link to="/marketplace/$slug" params={{ slug: row.slug }} className="font-semibold hover:text-primary">
                      {row.name}
                    </Link>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.tagline}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="outline">{labelFor(ASSET_CLASSES, row.asset_class)}</Badge>
                    <Badge variant="outline">{labelFor(STRATEGY_TYPES, row.strategy_type)}</Badge>
                    <Badge variant="outline" className="mono">
                      {row.timeframe}
                    </Badge>
                    {row.overfitting_risk ? (
                      <Badge variant="outline" className="gap-1 border-warning/60 text-warning">
                        <TriangleAlert className="h-3 w-3" aria-hidden /> Overfitting risk
                      </Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Equity curves (rebased %)</CardTitle>
              <CardDescription>Verified platform backtests under identical execution assumptions.</CardDescription>
            </CardHeader>
            <CardContent className="h-[340px]">
              {overlay.length === 0 ? (
                <p className="text-sm text-muted-foreground">No verified reports for the selected models yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overlay} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="t" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" minTickGap={48} />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={56} />
                    <ReTooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {reports.map(({ row }, i) => (
                      <Line
                        key={row.slug}
                        type="monotone"
                        dataKey={`m${i}`}
                        name={row.name}
                        stroke={LINE_COLORS[i]}
                        dot={false}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Metrics</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    {reports.map(({ row }) => (
                      <TableHead key={row.slug} className="text-right">
                        {row.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {METRIC_ROWS.map((m) => (
                    <TableRow key={m.key}>
                      <TableCell className="text-muted-foreground">{m.label}</TableCell>
                      {reports.map(({ row, report }) => {
                        const raw = m.get(report, row);
                        return (
                          <TableCell
                            key={row.slug}
                            className={`mono text-right ${m.tone && typeof raw === "number" ? pnlClass(raw) : ""}`}
                          >
                            {raw === null ? "—" : typeof raw === "number" ? `${fmtNum(raw, m.digits ?? 2)}${m.suffix ?? ""}` : raw}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Performance by market regime</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Regime</TableHead>
                    {reports.map(({ row }) => (
                      <TableHead key={row.slug} className="text-right">
                        {row.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regimes.map((r) => (
                    <TableRow key={r.regime}>
                      <TableCell>{r.regime}</TableCell>
                      {r.values.map((v, i) => (
                        <TableCell key={i} className={`mono text-right ${v ? pnlClass(v.ret) : ""}`}>
                          {v ? `${fmtNum(v.ret, 1)}% · Sharpe ${fmtNum(v.sharpe, 2)}` : "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}

type MetricRow = {
  key: string;
  label: string;
  digits?: number;
  suffix?: string;
  tone?: boolean;
  get: (r: BacktestReport | null, row: { cagr: number; sharpe: number; max_drawdown: number; consistency_score?: number | null }) => number | string | null;
};

const METRIC_ROWS: MetricRow[] = [
  { key: "cagr", label: "CAGR", suffix: "%", digits: 1, tone: true, get: (r, row) => r?.metrics.cagr ?? Number(row.cagr) },
  { key: "total", label: "Total return", suffix: "%", digits: 1, tone: true, get: (r) => r?.metrics.totalReturn ?? null },
  { key: "sharpe", label: "Sharpe", get: (r, row) => r?.metrics.sharpe ?? Number(row.sharpe) },
  { key: "sortino", label: "Sortino", get: (r) => r?.metrics.sortino ?? null },
  { key: "dd", label: "Max drawdown", suffix: "%", digits: 1, get: (r, row) => -(r?.metrics.maxDrawdown ?? Number(row.max_drawdown)) },
  { key: "win", label: "Win rate", suffix: "%", digits: 1, get: (r) => r?.metrics.winRate ?? null },
  { key: "pf", label: "Profit factor", get: (r) => r?.metrics.profitFactor ?? null },
  { key: "trades", label: "Trades", digits: 0, get: (r) => r?.metrics.trades ?? null },
  { key: "hold", label: "Avg holding (h)", digits: 1, get: (r) => r?.metrics.avgHoldingHours ?? null },
  { key: "exp", label: "Exposure", suffix: "%", digits: 1, get: (r) => r?.metrics.exposurePct ?? null },
  { key: "vol", label: "Volatility", suffix: "%", digits: 1, get: (r) => r?.metrics.volatility ?? null },
  { key: "bench", label: "Benchmark return", suffix: "%", digits: 1, get: (r) => r?.metrics.benchmarkReturn ?? null },
  {
    key: "consistency",
    label: "Walk-forward consistency",
    digits: 0,
    get: (r, row) => r?.walkForward?.consistencyScore ?? (row.consistency_score != null ? Number(row.consistency_score) : null),
  },
  {
    key: "wf",
    label: "Positive WF windows",
    get: (r) => (r?.walkForward ? `${r.walkForward.positiveWindows}/${r.walkForward.windows.length}` : null),
  },
  { key: "holdout", label: "Holdout return", suffix: "%", digits: 1, tone: true, get: (r) => r?.holdoutMetrics.totalReturn ?? null },
];
