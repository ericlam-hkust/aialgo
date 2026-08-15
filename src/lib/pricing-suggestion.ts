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

/* ------------------------------------------------------------------ *
 * Community-aware automatic pricing (platform-set mode)
 *
 * The performance engine above stays the baseline. On top of it we blend
 * community demand (likes + comment sentiment + reviews), traction and
 * freshness, then clamp movement so a like campaign can never distort a
 * weak strategy into a premium price.
 * ------------------------------------------------------------------ */

export type DemandInputs = {
  likes: number;
  verifiedLikes: number;
  commentCount: number;
  /** Rolling average sentiment, -1 (negative) … 1 (positive). */
  sentimentAvg: number;
  rating: number; // 0-5
  ratingCount: number;
  activeUsers: number;
  executions: number;
  backtestRanAt?: string | null;
  liveSince?: string | null;
  overfittingRisk?: boolean;
};

export type AutoPriceGroup = {
  key: string;
  label: string;
  weight: number;
  score: number;
  detail: string;
};

export type AutoPrice = {
  price: number;
  baseline: number;
  score: number;
  groups: AutoPriceGroup[];
  capped: boolean;
  summary: string;
};

/** Max move allowed per repricing cycle. */
export const REPRICE_STEP_CAP = 0.15;

const daysAgo = (iso?: string | null) => {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
};

export function computeAutoPrice(
  perf: PricingInputs,
  demand: DemandInputs,
  opts: { currentPrice?: number; currency?: string } = {},
): AutoPrice {
  const currency = opts.currency ?? "HKD";
  const base = suggestPricing(perf, currency);

  const weightedLikes = Number(demand.verifiedLikes || 0) * 3 + Math.max(0, Number(demand.likes || 0) - Number(demand.verifiedLikes || 0));
  const likeScore = scale(weightedLikes, 0, 60);
  const sentiment = clamp(((Number(demand.sentimentAvg) || 0) + 1) * 50);
  const volumeWeight = clamp(scale(Number(demand.commentCount) || 0, 0, 25)) / 100;
  const sentimentScore = 50 + (sentiment - 50) * volumeWeight;
  const reviewScore = demand.ratingCount > 0 ? scale(Number(demand.rating) || 0, 2.5, 5) : 50;

  const demandScore = clamp(likeScore * 0.4 + sentimentScore * 0.4 + reviewScore * 0.2);
  const tractionScore = clamp(scale(Number(demand.activeUsers) || 0, 0, 250) * 0.6 + scale(Number(demand.executions) || 0, 0, 5000) * 0.4);

  const btAge = daysAgo(demand.backtestRanAt);
  const liveDays = demand.liveSince ? daysAgo(demand.liveSince) : 0;
  let freshness = clamp(scale(120 - Math.min(btAge, 400), 0, 120) * 0.6 + scale(Math.min(liveDays, 365), 0, 180) * 0.4);
  if (demand.overfittingRisk) freshness = clamp(freshness - 30);

  const groups: AutoPriceGroup[] = [
    {
      key: "performance",
      label: "Verified performance",
      weight: 0.55,
      score: base.score,
      detail: `Backtest score ${base.score}/100 (${base.grade}) — Sharpe, drawdown, trade quality, consistency and sample size.`,
    },
    {
      key: "demand",
      label: "Community demand",
      weight: 0.25,
      score: demandScore,
      detail: `${demand.likes} likes (${demand.verifiedLikes} from owners), ${demand.commentCount} comments, sentiment ${(Number(demand.sentimentAvg) || 0).toFixed(2)}, rating ${(Number(demand.rating) || 0).toFixed(1)}/5.`,
    },
    {
      key: "traction",
      label: "Traction",
      weight: 0.15,
      score: tractionScore,
      detail: `${demand.activeUsers} active users and ${demand.executions} executions.`,
    },
    {
      key: "freshness",
      label: "Freshness & risk",
      weight: 0.05,
      score: freshness,
      detail: Number.isFinite(btAge)
        ? `Verified backtest ${Math.round(btAge)} days old${demand.overfittingRisk ? " · overfitting risk flagged" : ""}.`
        : "No verified backtest on record.",
    },
  ];

  const score = clamp(groups.reduce((acc, g) => acc + g.score * g.weight, 0));

  // Community + traction can move the price up to ±50% around the performance baseline.
  const nonPerf = clamp(demandScore * 0.55 + tractionScore * 0.35 + freshness * 0.1);
  const multiplier = 0.7 + (nonPerf / 100) * 0.6; // 0.7 … 1.3
  let target = base.suggested * multiplier;
  target = Math.max(base.suggested * 0.5, Math.min(base.suggested * 2, target));

  let capped = false;
  const current = Number(opts.currentPrice) || 0;
  if (current > 0) {
    const hi = current * (1 + REPRICE_STEP_CAP);
    const lo = current * (1 - REPRICE_STEP_CAP);
    if (target > hi) { target = hi; capped = true; }
    if (target < lo) { target = lo; capped = true; }
  }

  const price = Math.max(0, Math.round(target / 10) * 10);
  const money = (v: number) =>
    new Intl.NumberFormat("en-HK", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);

  return {
    price,
    baseline: base.suggested,
    score: Math.round(score),
    groups,
    capped,
    summary: `${money(price)} — combined score ${Math.round(score)}/100 from a ${money(base.suggested)} performance baseline${
      capped ? ", limited to a 15% move this cycle" : ""
    }.`,
  };
}
