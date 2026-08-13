/**
 * Pure, client-safe monetization model for the aiAlgo marketplace.
 * Hybrid compute: Tier 1 platform-hosted models/algos, Tier 2 remote execution.
 */

export type HostingMode = "hosted" | "remote";
export type ListingKind = "algo" | "ai_model";
export type TrustTier = "platform_verified" | "live_verified" | "unproven";
export type FrequencyClass = "hft" | "intraday" | "swing" | "position";
export type ComputePlanKey = "shared_cpu" | "dedicated_basic" | "dedicated_pro" | "gpu_metered";
export type SignalPlanKey = "metered" | "remote_pro" | "remote_hft";

export const LIVE_VERIFIED_DAYS = 90;
export const HFT_LATENCY_MS = 100;

/* ---------------------------------------------------------------- listings */

export const LISTING_KINDS: { value: ListingKind; label: string; icon: string; hint: string }[] = [
  {
    value: "ai_model",
    label: "AI / ML model",
    icon: "brain",
    hint: "Uploaded artifact (weights, ONNX, pickle) with the full interface manifest.",
  },
  {
    value: "algo",
    label: "Algo strategy",
    icon: "line",
    hint: "Rule-based logic — parameters and instruments only, no ML dependencies.",
  },
];

export const TRUST_TIERS: Record<TrustTier, { label: string; short: string; hint: string; tone: string }> = {
  platform_verified: {
    label: "Platform Verified",
    short: "Tier 1 · hosted",
    hint: "The code runs on aiAlgo infrastructure and passed a full backtest audit.",
    tone: "border-primary/60 text-primary",
  },
  live_verified: {
    label: "Live Verified",
    short: "Tier 2 · remote",
    hint: "Every signal is timestamped on receipt before execution, with 90+ days of unfakeable live history.",
    tone: "border-profit/60 text-profit",
  },
  unproven: {
    label: "New — Unproven",
    short: "Under 90 days",
    hint: "Less than 90 days of live history. Track record is still being established.",
    tone: "border-warning/60 text-warning",
  },
};

export const FREQUENCY_CLASSES: Record<
  FrequencyClass,
  { label: string; badge: string; icon: string; hint: string; holding: string }
> = {
  hft: {
    label: "High frequency",
    badge: "⚡ HFT-Ready",
    icon: "zap",
    hint: "Sub-minute to minute-level execution. Requires low-latency infrastructure.",
    holding: "Seconds to minutes",
  },
  intraday: {
    label: "Intraday",
    badge: "📈 Intraday",
    icon: "clock",
    hint: "Minute-to-hour signals, positions closed by the end of the session.",
    holding: "Minutes to hours",
  },
  swing: {
    label: "Swing",
    badge: "📊 Swing Trading",
    icon: "chart",
    hint: "Multi-day holds riding medium-term moves.",
    holding: "Days",
  },
  position: {
    label: "Position",
    badge: "🗓 Position",
    icon: "calendar",
    hint: "Weeks-to-months exposure, low turnover.",
    holding: "Weeks to months",
  },
};

/** A remote HFT model only earns the HFT-Ready label when measured latency backs it up. */
export function isHftReady(input: {
  hosting_mode: HostingMode;
  declared_frequency: FrequencyClass;
  measured_latency_ms: number;
}) {
  return input.hosting_mode === "remote" && input.declared_frequency === "hft" && input.measured_latency_ms < HFT_LATENCY_MS;
}

export function executionFitNote(hosting: HostingMode, frequency: FrequencyClass, latencyMs: number) {
  if (hosting === "hosted") {
    return "Standard Execution — suitable for Intraday, Swing and Position trading.";
  }
  if (frequency === "hft" && latencyMs < HFT_LATENCY_MS) {
    return `⚡ HFT-Ready — runs on the contributor's low-latency infrastructure (${Math.round(latencyMs)}ms measured).`;
  }
  return `Remote execution on the contributor's infrastructure (${Math.round(latencyMs)}ms measured routing latency).`;
}

export const HFT_APPLY_NOTE =
  "High-frequency strategies execute on the contributor's infrastructure near the exchange for minimal latency. Requires a broker account with API trading and sufficient capital for rapid execution.";

export const HFT_RISK_NOTE =
  "High-frequency strategies carry elevated execution and slippage risk. Fills may differ materially from signal prices.";

export const RISK_DISCLOSURE = "Past backtest or live performance does not guarantee future results.";

export const PLATFORM_DISCLAIMER =
  "aiAlgo is a software marketplace. Models are tools configured and controlled by users; aiAlgo does not provide investment advice or manage client funds.";

/** Broker latency above this is flagged as unsuitable for HFT models. */
export const BROKER_HFT_LATENCY_MS = 150;

/* ------------------------------------------------------- consumer plans */

export type ConsumerPlan = "free" | "basic";

export type ConsumerPlanSpec = {
  key: ConsumerPlan;
  name: string;
  monthly: number;
  annual: number;
  blurb: string;
  features: string[];
  priceIds: { monthly: string; yearly: string } | null;
};

export const BASIC_MONTHLY = 12;
export const BASIC_ANNUAL = 120;

export const CONSUMER_PLANS: ConsumerPlanSpec[] = [
  {
    key: "free",
    name: "Free",
    monthly: 0,
    annual: 0,
    blurb: "Browse everything and paper trade any model or algo — forever free.",
    features: [
      "Unlimited model and algo browsing",
      "Unlimited paper trading with every listing, including HFT",
      "Unlimited sandbox backtests",
      "Simulated performance-fee accrual so you know the cost before going live",
      "Delayed market data",
      "No live execution",
    ],
    priceIds: null,
  },
  {
    key: "basic",
    name: "Basic",
    monthly: BASIC_MONTHLY,
    annual: BASIC_ANNUAL,
    blurb: "Go live with real capital. One low price, no strategy limits.",
    features: [
      "Live execution — unlimited concurrent strategies",
      "Real-time market data",
      "Full API access",
      "All models and algos, including HFT listings",
      "Performance fees only on profitable closed trades",
      "Itemised receipts and monthly statements",
    ],
    priceIds: { monthly: "basic_monthly", yearly: "basic_yearly" },
  },
];

export function planSpec(key: ConsumerPlan) {
  return CONSUMER_PLANS.find((p) => p.key === key) ?? CONSUMER_PLANS[0]!;
}

/* -------------------------------------------------- free for contributors */

/** Everything a contributor could ever be charged for — all of it is $0. */
export const CONTRIBUTOR_FREE_ITEMS = [
  { key: "listing", label: "Listing & publishing", both: true, hint: "Unlimited listings for AI models and algo strategies." },
  { key: "hosting", label: "Platform compute (Tier 1)", both: true, hint: "Hosted inference for AI models and hosted execution for algos." },
  { key: "gpu", label: "GPU inference", both: false, hint: "Deep-learning inference on our GPUs, no metering, no cap." },
  { key: "remote", label: "Remote execution (Tier 2)", both: true, hint: "Remote and HFT models connect free with unlimited signals." },
  { key: "backtest", label: "Validation backtest pipeline", both: true, hint: "Walk-forward validation, re-validation and live track record." },
  { key: "data", label: "Execution + market data", both: true, hint: "Every feed your model needs to run on our infrastructure." },
] as const;

export const CONTRIBUTOR_PROMISE =
  "Whether you train neural networks or code rule-based algos — free hosting, free execution, free backtest pipeline, free execution data. The platform earns only when you earn.";

/* --------------------------------------------- performance fee engine */

export const FEE_MIN_PCT = 5;
export const FEE_MAX_PCT = 25;
export const MICRO_PROFIT_THRESHOLD = 1;
export const BATCH_CHARGE_THRESHOLD = 10;
export const BASE_COMMISSION = 0.2;
export const PRO_CREATOR_COMMISSION = 0.15;
export const PRO_CREATOR_THRESHOLD = 10_000;
export const PAYOUT_DELAY_DAYS = 7;

export const DEFAULT_FEE_PCT: Record<ListingKind, number> = { ai_model: 15, algo: 10 };

export const FEE_GUIDANCE: Record<ListingKind, string> = {
  ai_model:
    "AI models typically hold longer and close fewer, larger trades. 15% is the marketplace default and stays competitive on net subscriber returns.",
  algo: "Algos typically trade more frequently with smaller per-trade profits — a lower fee keeps subscriber net returns attractive.",
};

/** Marketplace averages used for the competitiveness indicator (by type + frequency). */
export const MARKET_AVG_FEE: Record<ListingKind, Record<FrequencyClass, number>> = {
  ai_model: { hft: 12, intraday: 14, swing: 15, position: 16 },
  algo: { hft: 8, intraday: 9, swing: 10, position: 12 },
};

export function feeCompetitiveness(kind: ListingKind, frequency: FrequencyClass, pct: number) {
  const avg = MARKET_AVG_FEE[kind][frequency];
  const delta = pct - avg;
  if (delta <= -2) return { tone: "profit" as const, label: `Below the ${avg}% average for ${kind === "algo" ? "algos" : "AI models"} — very competitive.` };
  if (delta >= 3) return { tone: "warning" as const, label: `Above the ${avg}% average — subscribers may pick a cheaper listing.` };
  return { tone: "muted" as const, label: `In line with the ${avg}% average for this type and frequency.` };
}

export type FeeOutcome = {
  feeable: boolean;
  exemptReason: string | null;
  grossProfit: number;
  feeableProfit: number;
  feePct: number;
  fee: number;
  contributor: number;
  platform: number;
  commissionRate: number;
  /** cumulative P&L after this trade */
  cumulativePnl: number;
  /** losses still to recover before fees resume (0 when fees are active) */
  unrecovered: number;
};

/**
 * The single fee rule, identical for AI models, algos, paper and live.
 * A fee only accrues on the portion of profit that lifts cumulative P&L above zero,
 * and never on wins under the micro-profit threshold.
 */
export function computeFee(input: {
  netProfit: number;
  feePct: number;
  cumulativePnlBefore: number;
  monthlyCollected?: number;
}): FeeOutcome {
  const { netProfit, feePct } = input;
  const before = input.cumulativePnlBefore;
  const cumulativePnl = round2(before + netProfit);
  const proCreator = (input.monthlyCollected ?? 0) >= PRO_CREATOR_THRESHOLD;
  const commissionRate = proCreator ? PRO_CREATOR_COMMISSION : BASE_COMMISSION;
  const base = {
    grossProfit: round2(netProfit),
    feePct,
    commissionRate,
    cumulativePnl,
    unrecovered: cumulativePnl < 0 ? round2(-cumulativePnl) : 0,
  };

  if (netProfit <= 0) {
    return { ...base, feeable: false, exemptReason: "Losing trade — no fee.", feeableProfit: 0, fee: 0, contributor: 0, platform: 0 };
  }
  if (netProfit < MICRO_PROFIT_THRESHOLD) {
    return {
      ...base,
      feeable: false,
      exemptReason: `Micro-profit exemption — profits under $${MICRO_PROFIT_THRESHOLD} are always fee-free.`,
      feeableProfit: 0,
      fee: 0,
      contributor: 0,
      platform: 0,
    };
  }
  // Only profit above the recovery of prior losses is fee-able.
  const feeableProfit = round2(Math.max(0, Math.min(netProfit, cumulativePnl)));
  if (feeableProfit <= 0) {
    return {
      ...base,
      feeable: false,
      exemptReason: `Watermark — $${Math.abs(cumulativePnl).toFixed(2)} of losses still to recover before fees resume.`,
      feeableProfit: 0,
      fee: 0,
      contributor: 0,
      platform: 0,
    };
  }
  const fee = round2((feeableProfit * feePct) / 100);
  const platform = round2(fee * commissionRate);
  return {
    ...base,
    feeable: true,
    exemptReason: null,
    feeableProfit,
    fee,
    contributor: round2(fee - platform),
    platform,
  };
}

export function watermarkStatus(cumulativePnl: number) {
  if (cumulativePnl >= 0) {
    return { active: true, label: "Fees active", hint: "Cumulative P&L is positive, so profitable trades accrue fees." };
  }
  const need = round2(-cumulativePnl);
  return {
    active: false,
    label: `$${need.toFixed(2)} of losses to recover before fees resume`,
    hint: "You pay nothing until this strategy has earned back its losses.",
  };
}

export const WATERMARK_EXAMPLE =
  "Trade wins $50 → fee $7.50. Trade loses $30 → no fee, and no fees until your next $30 of profits recover the loss.";

export const FEE_DISCLOSURE =
  "Fees apply to each profitable closed trade above $1, subject to your cumulative watermark; fees are charged to your payment method, not deducted from your broker account.";

export const BATCH_RULE_COPY = `Accrued fees are charged when they reach $${BATCH_CHARGE_THRESHOLD} or every Sunday, whichever comes first — one itemised receipt instead of hundreds of micro-charges.`;

/** Projection shown live in the fee-setting step, derived from the verified backtest. */
export function projectFeeOutcome(input: {
  trades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  feePct: number;
  capital?: number;
}) {
  const trades = Math.max(1, Math.round(input.trades));
  const wins = Math.round(trades * (input.winRate / 100));
  const exemptWins = Math.round(wins * Math.min(0.5, Math.max(0, 1.2 / Math.max(input.avgWin, 1))));
  const feeableTrades = Math.max(0, wins - exemptWins);
  const grossProfit = wins * input.avgWin - (trades - wins) * input.avgLoss;
  const fees = round2(feeableTrades * input.avgWin * (input.feePct / 100));
  const capital = input.capital ?? 10_000;
  return {
    feeableRate: Math.round((feeableTrades / trades) * 1000) / 10,
    exemptRate: Math.round((exemptWins / trades) * 1000) / 10,
    avgFeePerTrade: round2(feeableTrades ? fees / feeableTrades : 0),
    grossReturnPct: Math.round((grossProfit / capital) * 1000) / 10,
    netReturnPct: Math.round(((grossProfit - fees) / capital) * 1000) / 10,
    totalFees: fees,
    feesPer1kPerMonth: round2((fees / capital) * 1000 / 12),
  };
}

/** Both contributor journeys reach the same $2,400 — one on size, one on volume. */
export const EARNINGS_SIMULATORS = [
  {
    kind: "ai_model" as ListingKind,
    title: "AI model",
    trades: 500,
    avgProfit: 40,
    feePct: 15,
    copy: "Subscribers close 500 profitable trades/month averaging $40 profit at your 15% fee → $3,000 in fees → you earn $2,400.",
  },
  {
    kind: "algo" as ListingKind,
    title: "Algo strategy",
    trades: 5_000,
    avgProfit: 6,
    feePct: 10,
    copy: "Subscribers close 5,000 profitable trades/month averaging $6 profit at your 10% fee → $3,000 in fees → you earn $2,400 — algos win on volume.",
  },
];

export function simulateEarnings(trades: number, avgProfit: number, feePct: number, monthlyCollected = 0) {
  const gross = round2(trades * avgProfit * (feePct / 100));
  return splitFor(gross, monthlyCollected || gross);
}

/* ------------------------------------------------------- commission split */

export type Split = {
  gross: number;
  rate: number;
  commission: number;
  tierBonus: number;
  net: number;
  proCreator: boolean;
};

/** Identical for AI models, algos and remote HFT — only monthly fee volume changes the rate. */
export function splitFor(gross: number, monthlyVolume: number): Split {
  const proCreator = monthlyVolume >= PRO_CREATOR_THRESHOLD;
  const rate = proCreator ? PRO_CREATOR_COMMISSION : BASE_COMMISSION;
  const commission = round2(gross * rate);
  const tierBonus = proCreator ? round2(gross * (BASE_COMMISSION - PRO_CREATOR_COMMISSION)) : 0;
  return { gross: round2(gross), rate, commission, tierBonus, net: round2(gross - commission), proCreator };
}

export function proCreatorProgress(monthlyVolume: number) {
  const remaining = Math.max(0, PRO_CREATOR_THRESHOLD - monthlyVolume);
  return {
    unlocked: remaining === 0,
    remaining: round2(remaining),
    pct: Math.min(100, (monthlyVolume / PRO_CREATOR_THRESHOLD) * 100),
    label:
      remaining === 0
        ? "Pro Creator unlocked — you keep 85% of every fee collected this month."
        : `$${remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })} more in collected fees this month to unlock 85/15`,
  };
}

/* --------------------------------------------------------- data add-ons */

export type DataAddonKey = "community" | "crypto_realtime" | "equities_realtime" | "premium_tick";

export function addonBundledIn(bundled: string[], plan: ConsumerPlan) {
  return bundled.includes(plan);
}

/* --------------------------------------------------------------- payouts */

export const PAYOUT_STATES = [
  { key: "onboarding", label: "Onboarding incomplete", hint: "Finish Stripe Express onboarding and KYC to receive payouts." },
  { key: "verified", label: "Verified", hint: "Identity verified. Earnings accrue to the next payout cycle." },
  { key: "scheduled", label: "Payout scheduled", hint: `Sent ${PAYOUT_DELAY_DAYS} days after the weekly fee batch settles.` },
  { key: "paid", label: "Paid", hint: "Transferred to your bank account by Stripe." },
  { key: "failed", label: "Failed", hint: "Stripe could not complete the transfer. It retries on the next cycle." },
] as const;

export function usd(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits }).format(
    Number.isFinite(value) ? value : 0,
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
