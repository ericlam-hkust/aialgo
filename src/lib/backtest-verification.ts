/**
 * Client-safe derivation of the public-listing criteria from a stored backtest
 * report. Used by both the playground report panel and the server-side publish
 * gate, so the UI and the database agree on what "successfully verified" means.
 */
import { DEFAULT_PROTOCOL, OVERFITTING_CONSISTENCY_THRESHOLD, type BacktestProtocol, type BacktestReport } from "@/lib/backtest-protocol";

export type ChecklistItem = {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
};

export type VerificationResult = {
  verified: boolean;
  items: ChecklistItem[];
  passedCount: number;
};

export function verificationChecklist(
  report: BacktestReport | null | undefined,
  kind: string | null | undefined,
  protocolOverride?: Partial<BacktestProtocol>,
): VerificationResult {
  const protocol: BacktestProtocol = { ...DEFAULT_PROTOCOL, ...(report?.protocol ?? {}), ...(protocolOverride ?? {}) };

  if (!report) {
    return { verified: false, items: [], passedCount: 0 };
  }

  const m = report.metrics;
  const cfg = report.config;
  const wf = report.walkForward;
  const holdoutDays =
    (new Date(protocol.holdoutEnd).getTime() - new Date(protocol.holdoutStart).getTime()) / 86_400_000;
  const costsOk = protocol.slippagePct > 0 && protocol.feeBps > 0 && protocol.spreadBps > 0;

  const items: ChecklistItem[] = [
    {
      key: "mode",
      label: "Verification run on the locked platform protocol",
      ok: kind !== "sandbox",
      detail: kind === "sandbox" ? "This was a private self-test run." : "Ran under the standard platform protocol.",
    },
    {
      key: "data_source",
      label: "Data source recorded",
      ok: Boolean(cfg?.dataSourceLabel),
      detail: cfg?.dataSourceLabel
        ? `${cfg.dataSourceKind === "contributor" ? "Contributor feed" : "Platform feed"} — ${cfg.dataSourceLabel}`
        : "No data source attribution was stamped on this run.",
    },
    {
      key: "holdout",
      label: "Out-of-sample holdout period",
      ok: holdoutDays >= 180 && new Date(protocol.holdoutStart) >= new Date(protocol.inSampleEnd),
      detail: `In-sample ${protocol.inSampleStart} → ${protocol.inSampleEnd}, holdout ${protocol.holdoutStart} → ${protocol.holdoutEnd}.`,
    },
    {
      key: "costs",
      label: "Realistic trading costs applied",
      ok: costsOk,
      detail: `Slippage ${protocol.slippagePct}% · fees ${protocol.feeBps} bps · spread ${protocol.spreadBps} bps.`,
    },
    {
      key: "trades",
      label: `Minimum ${protocol.minTrades} trades`,
      ok: m.trades >= protocol.minTrades,
      detail: `${m.trades} trades in the tested period.`,
    },
    {
      key: "sharpe",
      label: `Sharpe at or above ${protocol.minSharpe}`,
      ok: m.sharpe >= protocol.minSharpe,
      detail: `Sharpe ${m.sharpe}.`,
    },
    {
      key: "drawdown",
      label: `Max drawdown within ${protocol.maxAllowedDrawdownPct}%`,
      ok: Math.abs(m.maxDrawdown) <= protocol.maxAllowedDrawdownPct,
      detail: `Max drawdown ${m.maxDrawdown}%.`,
    },
    {
      key: "walkforward",
      label: "Walk-forward consistency, no overfitting flag",
      ok: Boolean(wf) && !wf?.overfittingRisk && (wf?.consistencyScore ?? 0) >= OVERFITTING_CONSISTENCY_THRESHOLD,
      detail: wf
        ? `Consistency ${wf.consistencyScore}/100 across ${wf.windows.length} windows${wf.overfittingRisk ? " — overfitting risk flagged." : "."}`
        : "No walk-forward analysis in this run.",
    },
    {
      key: "passed",
      label: "Passed the platform thresholds",
      ok: report.passed,
      detail: report.passed ? "All platform checks cleared." : (report.failureCode ?? "Run failed.").replace(/_/g, " "),
    },
  ];

  const passedCount = items.filter((i) => i.ok).length;
  return { verified: passedCount === items.length, items, passedCount };
}
