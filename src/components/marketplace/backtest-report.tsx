import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ShieldCheck, FlaskConical, TriangleAlert } from "lucide-react";

import type { BacktestReport } from "@/lib/backtest-protocol";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtNum, pnlClass } from "@/lib/format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const chartTooltip = {
  contentStyle: {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    fontSize: 12,
  },
} as const;

function heatColor(ret: number, max: number) {
  const scale = Math.min(1, Math.abs(ret) / (max || 1));
  const alpha = 0.15 + scale * 0.6;
  return ret >= 0
    ? { background: `color-mix(in oklab, var(--color-profit) ${alpha * 100}%, transparent)` }
    : { background: `color-mix(in oklab, var(--color-loss) ${alpha * 100}%, transparent)` };
}

export function BacktestReportView({
  report,
  variant = "verified",
  title,
}: {
  report: BacktestReport;
  variant?: "verified" | "sandbox";
  title?: string;
}) {
  const m = report.metrics;
  const years = [...new Set(report.monthly.map((x) => x.year))].sort();
  const maxAbs = Math.max(...report.monthly.map((x) => Math.abs(x.ret)), 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {variant === "verified" ? (
          <Badge className="gap-1.5 bg-primary/15 text-primary hover:bg-primary/20">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Platform Verified Backtest
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1.5 border-warning/50 text-warning">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Unverified — Self-Test
          </Badge>
        )}
        <Badge variant="outline" className="mono">
          {report.protocol.inSampleStart} → {report.protocol.holdoutEnd}
        </Badge>
        <Badge variant="outline" className="mono">
          slippage {report.protocol.slippagePct}% · fees {report.protocol.feeBps}bps · spread {report.protocol.spreadBps}bps
        </Badge>
        <Badge variant="outline" className="mono">
          holdout {report.protocol.holdoutStart}→{report.protocol.holdoutEnd}
        </Badge>
        {title ? <span className="text-sm text-muted-foreground">{title}</span> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Total return" value={`${fmtNum(m.totalReturn, 1)}%`} tone={m.totalReturn >= 0 ? "profit" : "loss"} />
        <MetricCard label="CAGR" value={`${fmtNum(m.cagr, 1)}%`} tone="profit" />
        <MetricCard label="Sharpe" value={fmtNum(m.sharpe, 2)} />
        <MetricCard label="Sortino" value={fmtNum(m.sortino, 2)} />
        <MetricCard label="Max drawdown" value={`-${fmtNum(m.maxDrawdown, 1)}%`} tone="loss" />
        <MetricCard label="Win rate" value={`${fmtNum(m.winRate, 1)}%`} />
        <MetricCard label="Profit factor" value={fmtNum(m.profitFactor, 2)} />
        <MetricCard label="Trades" value={m.trades.toLocaleString()} />
        <MetricCard label="Avg holding" value={`${fmtNum(m.avgHoldingHours, 1)}h`} />
        <MetricCard label="Exposure" value={`${fmtNum(m.exposurePct, 1)}%`} />
        <MetricCard label="Volatility" value={`${fmtNum(m.volatility, 1)}%`} />
        <MetricCard
          label={`Benchmark ${report.protocol.benchmark}`}
          value={`${fmtNum(m.benchmarkReturn, 1)}%`}
          tone={m.totalReturn >= m.benchmarkReturn ? "profit" : "warning"}
        />
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Equity curve vs {report.protocol.benchmark}</CardTitle>
          <CardDescription>
            Executed with {report.protocol.slippagePct}% slippage, {report.protocol.feeBps}bps fees and{" "}
            {report.protocol.positionSizingPct}% position sizing.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={report.equity} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="bt-eq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="t" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" minTickGap={48} />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={68} />
              <ReTooltip {...chartTooltip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area name="Strategy" type="monotone" dataKey="v" stroke="var(--color-primary)" fill="url(#bt-eq)" strokeWidth={2} />
              <Line name="Benchmark" type="monotone" dataKey="b" stroke="var(--color-muted-foreground)" dot={false} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Drawdown</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report.drawdown} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="bt-dd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-loss)" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="var(--color-loss)" stopOpacity={0.45} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" minTickGap={48} />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={50} />
                <ReTooltip {...chartTooltip} />
                <Area type="monotone" dataKey="v" stroke="var(--color-loss)" fill="url(#bt-dd)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Trade return distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.tradeDistribution} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={44} />
                <ReTooltip {...chartTooltip} />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Monthly returns</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th className="text-left text-muted-foreground">Year</th>
                {MONTHS.map((mo) => (
                  <th key={mo} className="text-muted-foreground font-medium">
                    {mo}
                  </th>
                ))}
                <th className="text-muted-foreground">Year</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => {
                const yearRow = report.years.find((x) => x.year === y);
                return (
                  <tr key={y}>
                    <td className="mono text-muted-foreground">{y}</td>
                    {MONTHS.map((_, idx) => {
                      const cell = report.monthly.find((x) => x.year === y && x.month === idx + 1);
                      return (
                        <td
                          key={idx}
                          className="mono rounded px-1 py-1 text-center"
                          style={cell ? heatColor(cell.ret, maxAbs) : undefined}
                        >
                          {cell ? fmtNum(cell.ret, 1) : "—"}
                        </td>
                      );
                    })}
                    <td className={`mono text-center font-medium ${pnlClass(yearRow?.ret ?? 0)}`}>
                      {yearRow ? `${fmtNum(yearRow.ret, 1)}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Performance by market regime</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Regime</TableHead>
                  <TableHead className="text-right">Annualised</TableHead>
                  <TableHead className="text-right">Sharpe</TableHead>
                  <TableHead className="text-right">Trades</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.regimes.map((r) => (
                  <TableRow key={r.regime}>
                    <TableCell>{r.regime}</TableCell>
                    <TableCell className={`mono text-right ${pnlClass(r.ret)}`}>{fmtNum(r.ret, 1)}%</TableCell>
                    <TableCell className="mono text-right">{fmtNum(r.sharpe, 2)}</TableCell>
                    <TableCell className="mono text-right">{r.trades}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">By year vs benchmark</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Strategy</TableHead>
                  <TableHead className="text-right">{report.protocol.benchmark}</TableHead>
                  <TableHead className="text-right">Alpha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.years.map((y) => (
                  <TableRow key={y.year}>
                    <TableCell className="mono">{y.year}</TableCell>
                    <TableCell className={`mono text-right ${pnlClass(y.ret)}`}>{fmtNum(y.ret, 1)}%</TableCell>
                    <TableCell className="mono text-right text-muted-foreground">{fmtNum(y.benchmark, 1)}%</TableCell>
                    <TableCell className={`mono text-right ${pnlClass(y.ret - y.benchmark)}`}>
                      {fmtNum(y.ret - y.benchmark, 1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {report.walkForward && report.walkForward.windows.length ? (
        <Card className="border-border/70">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Walk-forward analysis</CardTitle>
                <CardDescription>
                  Rolling {report.walkForward.trainMonths}-month train / {report.walkForward.testMonths}-month test
                  windows — {report.walkForward.windows.length} windows, {report.walkForward.positiveWindows} profitable.
                </CardDescription>
              </div>
              {report.walkForward.overfittingRisk ? (
                <Badge variant="outline" className="gap-1.5 border-warning/60 text-warning">
                  <TriangleAlert className="h-3.5 w-3.5" aria-hidden /> Overfitting Risk
                </Badge>
              ) : (
                <Badge className="gap-1.5 bg-profit/15 text-profit hover:bg-profit/20">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Consistent out of sample
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <MetricCard
                label="Consistency score"
                value={`${fmtNum(report.walkForward.consistencyScore, 0)}/100`}
                tone={report.walkForward.overfittingRisk ? "warning" : "profit"}
              />
              <MetricCard label="Mean window return" value={`${fmtNum(report.walkForward.meanReturn, 2)}%`} />
              <MetricCard label="Std deviation" value={`${fmtNum(report.walkForward.stdReturn, 2)}%`} />
              <MetricCard label="Train→test efficiency" value={fmtNum(report.walkForward.efficiency, 2)} />
            </div>

            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.walkForward.windows} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="testStart" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={44} />
                  <ReTooltip {...chartTooltip} />
                  <Bar dataKey="ret" name="Test window return %" radius={[4, 4, 0, 0]}>
                    {report.walkForward.windows.map((w) => (
                      <Cell key={w.index} fill={w.ret >= 0 ? "var(--color-profit)" : "var(--color-loss)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {report.walkForward.overfittingRisk ? (
              <p className="rounded-md border border-warning/50 bg-warning/10 p-3 text-xs text-warning">
                Results vary widely between walk-forward windows, which often indicates parameters fitted to a specific
                market period rather than a durable edge.
              </p>
            ) : null}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Train window</TableHead>
                    <TableHead>Test window</TableHead>
                    <TableHead className="text-right">Return</TableHead>
                    <TableHead className="text-right">Sharpe</TableHead>
                    <TableHead className="text-right">Max DD</TableHead>
                    <TableHead className="text-right">Win rate</TableHead>
                    <TableHead className="text-right">Trades</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.walkForward.windows.map((w) => (
                    <TableRow key={w.index}>
                      <TableCell className="mono text-muted-foreground">{w.index}</TableCell>
                      <TableCell className="mono text-xs">
                        {w.trainStart} → {w.trainEnd}
                      </TableCell>
                      <TableCell className="mono text-xs">
                        {w.testStart} → {w.testEnd}
                      </TableCell>
                      <TableCell className={`mono text-right ${pnlClass(w.ret)}`}>{fmtNum(w.ret, 2)}%</TableCell>
                      <TableCell className="mono text-right">{fmtNum(w.sharpe, 2)}</TableCell>
                      <TableCell className="mono text-right text-loss">-{fmtNum(w.maxDrawdown, 1)}%</TableCell>
                      <TableCell className="mono text-right">{fmtNum(w.winRate, 1)}%</TableCell>
                      <TableCell className="mono text-right">{w.trades}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Out-of-sample holdout</CardTitle>
          <CardDescription>
            {report.protocol.holdoutStart} → {report.protocol.holdoutEnd} — hidden from contributors during development.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-5">
          <MetricCard label="Return" value={`${fmtNum(report.holdoutMetrics.totalReturn, 1)}%`} tone={report.holdoutMetrics.totalReturn >= 0 ? "profit" : "loss"} />
          <MetricCard label="CAGR" value={`${fmtNum(report.holdoutMetrics.cagr, 1)}%`} />
          <MetricCard label="Sharpe" value={fmtNum(report.holdoutMetrics.sharpe, 2)} />
          <MetricCard label="Max DD" value={`-${fmtNum(report.holdoutMetrics.maxDrawdown, 1)}%`} tone="loss" />
          <MetricCard label="Win rate" value={`${fmtNum(report.holdoutMetrics.winRate, 1)}%`} />
        </CardContent>
      </Card>
    </div>
  );
}

