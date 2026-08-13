/**
 * Transparent pricing suggestion for marketplace listings.
 *
 * Every factor is scored 0-100, weighted, and summed. The resulting score maps
 * to a monthly price band so contributors always see *why* a price was
 * suggested — no black box.
 */

export type PricingInputs = {
  sharpe: number;
  maxDrawdown: number; // positive percentage, e.g. 18 means -18%
  winRate: number; // percentage
  profitFactor: number;
  consistencyScore: number; // 0-100 walk-forward consistency
  trades: number;
  overfittingRisk?: boolean;
  cagr?: number;
};

export type PricingFactor = {
  key: string;
  label: string;
  weight: number;
  score: number; // 0-100
  detail: string;
};

export type PricingSuggestion = {
  score: number; // 0-100
  grade: "excellent" | "strong" | "fair" | "weak";
  factors: PricingFactor[];
  penalties: string[];
  /** Suggested monthly subscription price, in the listing currency. */
  suggested: number;
  min: number;
  max: number;
  listable: boolean;
  summary: string;
};

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const scale = (v: number, lo: number, hi: number) => clamp(((v - lo) / (hi - lo)) * 100);

export function suggestPricing(input: PricingInputs, currency = "HKD"): PricingSuggestion {
  const sharpe = Number(input.sharpe) || 0;
  const dd = Math.abs(Number(input.maxDrawdown) || 0);
  const winRate = Number(input.winRate) || 0;
  const pf = Number(input.profitFactor) || 0;
  const consistency = Number(input.consistencyScore) || 0;
  const trades = Number(input.trades) || 0;

  const factors: PricingFactor[] = [
    {
      key: "sharpe",
      label: "Risk-adjusted return (Sharpe)",
      weight: 0.3,
      score: scale(sharpe, 0.3, 2.5),
      detail: `Sharpe ${sharpe.toFixed(2)} — 2.0+ is top tier, below 0.8 fails validation.`,
    },
    {
      key: "drawdown",
      label: "Max drawdown",
      weight: 0.2,
      score: scale(40 - dd, 5, 35),
      detail: `Worst peak-to-trough loss ${dd.toFixed(1)}% — shallower drawdowns command higher prices.`,
    },
    {
      key: "quality",
      label: "Trade quality (win rate + profit factor)",
      weight: 0.2,
      score: clamp(scale(winRate, 35, 70) * 0.5 + scale(pf, 1, 2.5) * 0.5),
      detail: `Win rate ${winRate.toFixed(1)}% with profit factor ${pf.toFixed(2)}.`,
    },
    {
      key: "consistency",
      label: "Walk-forward consistency",
      weight: 0.2,
      score: clamp(consistency),
      detail: `Consistency score ${consistency.toFixed(0)}/100 across rolling out-of-sample windows.`,
    },
    {
      key: "sample",
      label: "Sample size",
      weight: 0.1,
      score: scale(trades, 30, 400),
      detail: `${trades} trades in the tested period.`,
    },
  ];

  let score = factors.reduce((acc, f) => acc + f.score * f.weight, 0);

  const penalties: string[] = [];
  if (input.overfittingRisk) {
    penalties.push("Overfitting risk flagged — results vary widely across walk-forward windows (-20).");
    score -= 20;
  }
  if (dd > 35) {
    penalties.push(`Drawdown of ${dd.toFixed(1)}% exceeds the platform limit of 35% (-15).`);
    score -= 15;
  }
  if (trades < 30) {
    penalties.push(`Only ${trades} trades — below the 30-trade minimum for a meaningful result (-15).`);
    score -= 15;
  }
  score = clamp(score);

  const grade: PricingSuggestion["grade"] =
    score >= 80 ? "excellent" : score >= 60 ? "strong" : score >= 40 ? "fair" : "weak";

  // 0 → 49/mo, 100 → 899/mo, curved so strong results are rewarded.
  const raw = 49 + Math.pow(score / 100, 1.6) * 850;
  const suggested = Math.max(0, Math.round(raw / 10) * 10);
  const min = Math.max(0, Math.round((suggested * 0.7) / 10) * 10);
  const max = Math.round((suggested * 1.35) / 10) * 10;

  const money = (v: number) =>
    new Intl.NumberFormat("en-HK", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);

  const listable = score >= 25 && trades >= 30 && dd <= 35;

  return {
    score: Math.round(score),
    grade,
    factors,
    penalties,
    suggested,
    min,
    max,
    listable,
    summary: listable
      ? `Score ${Math.round(score)}/100 (${grade}). Suggested range ${money(min)}–${money(max)} per month.`
      : `Score ${Math.round(score)}/100 — these results are not strong enough to price confidently yet. Improve consistency or run a longer test.`,
  };
}

export const gradeTone = (grade: PricingSuggestion["grade"]) =>
  grade === "excellent" || grade === "strong" ? "profit" : grade === "fair" ? "warning" : "loss";
