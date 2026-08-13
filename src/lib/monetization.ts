/**
 * Pure, client-safe monetization model for the aiAlgo marketplace.
 * Hybrid compute: Tier 1 platform-hosted models/algos, Tier 2 remote via Signal Gateway.
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
    hint: "Every signal is timestamped in our gateway before execution, with 90+ days of unfakeable live history.",
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
  return `Remote execution via Signal Gateway (${Math.round(latencyMs)}ms measured routing latency).`;
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

export type ConsumerPlan = "free" | "pro" | "desk";

export type ConsumerPlanSpec = {
  key: ConsumerPlan;
  name: string;
  monthly: number;
  annual: number;
  blurb: string;
  features: string[];
  priceIds: { monthly: string; yearly: string } | null;
};

export const CONSUMER_PLANS: ConsumerPlanSpec[] = [
  {
    key: "free",
    name: "Free",
    monthly: 0,
    annual: 0,
    blurb: "Explore the whole marketplace and paper trade without paying anything.",
    features: [
      "Unlimited model browsing",
      "Paper trading with all models (HFT simulation requires Pro)",
      "3 sandbox backtests / month",
      "Delayed leaderboard data",
      "Community data feeds",
      "No live execution",
    ],
    priceIds: null,
  },
  {
    key: "pro",
    name: "Pro",
    monthly: 49,
    annual: 490,
    blurb: "Go live with real capital across up to three concurrent strategies.",
    features: [
      "Live execution, up to 3 concurrent strategies",
      "Real-time data (crypto + equities bundled)",
      "Unlimited sandbox backtests",
      "Priority execution slot",
      "HFT model access",
      "Full API access",
    ],
    priceIds: { monthly: "pro_monthly", yearly: "pro_yearly" },
  },
  {
    key: "desk",
    name: "Desk",
    monthly: 249,
    annual: 2490,
    blurb: "For trading desks running many strategies across multiple accounts.",
    features: [
      "Unlimited concurrent strategies",
      "Fastest execution slots",
      "Premium data feeds included",
      "Multi-account execution",
      "Dedicated support",
    ],
    priceIds: { monthly: "desk_monthly", yearly: "desk_yearly" },
  },
];

export function planSpec(key: ConsumerPlan) {
  return CONSUMER_PLANS.find((p) => p.key === key) ?? CONSUMER_PLANS[0]!;
}

/* --------------------------------------------------- contributor compute */

export type ComputePlanSpec = {
  key: ComputePlanKey;
  name: string;
  price: number;
  unit: "month" | "hour";
  forKind: ListingKind | "both";
  features: string[];
  priceId: string | null;
};

export const COMPUTE_PLANS: ComputePlanSpec[] = [
  {
    key: "shared_cpu",
    name: "Shared CPU",
    price: 0,
    unit: "month",
    forKind: "algo",
    features: ["Community compute pool", "Delayed data", "1 algo maximum"],
    priceId: null,
  },
  {
    key: "dedicated_basic",
    name: "Dedicated CPU Basic",
    price: 29,
    unit: "month",
    forKind: "algo",
    features: ["Guaranteed compute", "Real-time data", "Unlimited algos", "Priced for volume"],
    priceId: "compute_basic_monthly",
  },
  {
    key: "dedicated_pro",
    name: "Dedicated CPU Pro",
    price: 99,
    unit: "month",
    forKind: "ai_model",
    features: ["Guaranteed compute for ML inference", "Real-time data", "Faster execution"],
    priceId: "compute_pro_monthly",
  },
  {
    key: "gpu_metered",
    name: "GPU (metered)",
    price: 0.8,
    unit: "hour",
    forKind: "ai_model",
    features: ["Deep-learning inference", "Billed per GPU hour", "Monthly usage dashboard", "Spending cap"],
    priceId: "compute_gpu_hour",
  },
];

export const GPU_HOURLY_RATE = 0.8;

export function computePlansFor(kind: ListingKind) {
  return COMPUTE_PLANS.filter((p) => p.forKind === kind || p.forKind === "both");
}

export function computePlanSpec(key: ComputePlanKey) {
  return COMPUTE_PLANS.find((p) => p.key === key) ?? COMPUTE_PLANS[0]!;
}

/* ------------------------------------------------------ signal API plans */

export type SignalPlanSpec = {
  key: SignalPlanKey;
  name: string;
  price: number;
  features: string[];
  hftOnly?: boolean;
  priceId: string | null;
};

export const SIGNAL_INCLUDED_CALLS = 10_000;
export const SIGNAL_OVERAGE_PER_1K = 5;

export const SIGNAL_PLANS: SignalPlanSpec[] = [
  {
    key: "metered",
    name: "Standard (metered)",
    price: 0,
    features: [
      `First ${SIGNAL_INCLUDED_CALLS.toLocaleString()} signal calls / month free`,
      `$${SIGNAL_OVERAGE_PER_1K} per additional 1,000 calls`,
      "REST ingestion endpoint",
      "Standard routing",
    ],
    priceId: null,
  },
  {
    key: "remote_pro",
    name: "Remote Pro",
    price: 199,
    features: ["Unlimited signal calls", "REST ingestion endpoint", "Standard routing", "Flat monthly price"],
    priceId: "remote_pro_monthly",
  },
  {
    key: "remote_hft",
    name: "Remote HFT",
    price: 499,
    hftOnly: true,
    features: [
      "Unlimited signal calls",
      "WebSocket streaming endpoint",
      "Priority low-latency routing",
      "Sub-100ms latency SLA monitoring",
      "Dedicated gateway capacity",
    ],
    priceId: "remote_hft_monthly",
  },
];

export const HFT_TIER_JUSTIFICATION =
  "HFT signal volume and latency requirements need dedicated gateway capacity, so HFT-classified models must run on the Remote HFT tier.";

export function signalPlanSpec(key: SignalPlanKey) {
  return SIGNAL_PLANS.find((p) => p.key === key) ?? SIGNAL_PLANS[0]!;
}

export function signalOverage(calls: number, plan: SignalPlanKey) {
  if (plan !== "metered") return 0;
  const extra = Math.max(0, calls - SIGNAL_INCLUDED_CALLS);
  return Math.ceil(extra / 1000) * SIGNAL_OVERAGE_PER_1K;
}

/** Straight-line projection of month-end calls from the days elapsed so far. */
export function projectMonthly(callsSoFar: number, now = new Date()) {
  const day = now.getUTCDate();
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  return Math.round((callsSoFar / Math.max(1, day)) * daysInMonth);
}

/* ------------------------------------------------------- commission split */

export const BASE_COMMISSION = 0.2;
export const PRO_CREATOR_COMMISSION = 0.15;
export const PRO_CREATOR_THRESHOLD = 10_000;

export type Split = {
  gross: number;
  rate: number;
  commission: number;
  tierBonus: number;
  net: number;
  proCreator: boolean;
};

/** Identical for AI models, algos and remote HFT — only monthly volume changes the rate. */
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
        ? "Pro Creator unlocked — you keep 85% of every sale this month."
        : `$${remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })} more this month to unlock 85/15`,
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
  { key: "scheduled", label: "Payout scheduled", hint: "Batched for the monthly automated payout run." },
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

/** Contributor projected earnings for the cost calculator. */
export function projectEarnings(input: {
  subscribers: number;
  pricePerMonth: number;
  computeCost: number;
  gatewayCost?: number;
  monthlyVolume?: number;
}) {
  const gross = input.subscribers * input.pricePerMonth;
  const split = splitFor(gross, input.monthlyVolume ?? gross);
  const costs = input.computeCost + (input.gatewayCost ?? 0);
  return { ...split, costs: round2(costs), projected: round2(split.net - costs) };
}
