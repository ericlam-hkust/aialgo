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


export const PLATFORM_DISCLAIMER =
  "aiAlgo is a software marketplace. Models are tools configured and controlled by users; aiAlgo does not provide investment advice or manage client funds.";

/** Broker latency above this is flagged as unsuitable for HFT models. */
export const BROKER_HFT_LATENCY_MS = 150;

/* ------------------------------------------------- subscription plans */

export type ConsumerPlan = "free" | "pro" | "elite";

export type ConsumerPlanSpec = {
  key: ConsumerPlan;
  name: string;
  monthly: number;
  annual: number;
  blurb: string;
  features: string[];
  priceIds: { monthly: string; yearly: string } | null;
};

export const PRO_MONTHLY = 29;
export const PRO_ANNUAL = 290;
export const ELITE_MONTHLY = 99;
export const ELITE_ANNUAL = 990;

export const CONSUMER_PLANS: ConsumerPlanSpec[] = [
  {
    key: "free",
    name: "Starter",
    monthly: 0,
    annual: 0,
    blurb: "Build strategies, backtest a year of history and download the self-hosted package.",
    features: [
      "Strategy builder with the core indicator set",
      "Backtesting over 1 year of historical data",
      "Download the full self-hosted runner package",
      "Manual updates — you pull new versions yourself",
      "Community strategy templates",
    ],
    priceIds: null,
  },
  {
    key: "pro",
    name: "Pro",
    monthly: PRO_MONTHLY,
    annual: PRO_ANNUAL,
    blurb: "The full builder, complete history and automatic pull-based updates for your own deployment.",
    features: [
      "Full builder — every indicator plus the code editor",
      "Full backtesting history and walk-forward analysis",
      "One-click deploy to your own cloud or VPS",
      "Automatic pull-based updates (engine patches + parameters)",
      "Read-only live monitoring dashboard",
      "Data sync from your local agent",
    ],
    priceIds: { monthly: "pro_monthly", yearly: "pro_yearly" },
  },
  {
    key: "elite",
    name: "Elite / Team",
    monthly: ELITE_MONTHLY,
    annual: ELITE_ANNUAL,
    blurb: "Multiple deployments, a staged release pipeline and team collaboration.",
    features: [
      "Everything in Pro",
      "Multiple concurrent live deployments",
      "Paper-run stage, canary sizing and automatic rollback",
      "Priority template library and early access releases",
      "Team workspaces with shared roles",
    ],
    priceIds: { monthly: "elite_monthly", yearly: "elite_yearly" },
  },
];

export function planSpec(key: ConsumerPlan) {
  return CONSUMER_PLANS.find((p) => p.key === key) ?? CONSUMER_PLANS[0]!;
}

/* ------------------------------------------------------ hard constraints */

export const NO_COMMISSION_PROMISE =
  "Subscription only. aiAlgo never takes a commission, per-trade fee or performance fee — the platform is not in your trade flow.";

export const SELF_HOSTED_PROMISE =
  "Every live order is generated and sent by software running on infrastructure you own. aiAlgo never holds broker credentials, never transmits orders and never connects inbound to your machine.";

export const UPDATE_CONSENT_PROMISE =
  "Security and engine patches can auto-apply. Any change to strategy logic waits for your explicit one-tap approval, with a full diff before it goes live.";

export const CONTRIBUTOR_PROMISE =
  "Publish templates and models to the community library. Listings are free — aiAlgo charges subscriptions, never a share of anyone's trades.";

export const RISK_DISCLOSURE =
  "aiAlgo is strategy-building software. It makes no representation about future results and provides no investment advice.";

export function usd(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits }).format(
    Number.isFinite(value) ? value : 0,
  );
}
