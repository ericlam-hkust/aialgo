import { BASE_COMMISSION, CONSUMER_PLANS, planSpec, type ConsumerPlan } from "./monetization";

export type PlanTier = ConsumerPlan; // "free" | "basic"

export type PlanLimits = {
  maxStrategies: number;
  maxBacktestsPerMonth: number;
  maxAiCallsPerMonth: number;
  /** live execution with real capital */
  liveExecution: boolean;
  maxConcurrentLive: number;
  hftAccess: boolean;
  realtimeData: boolean;
  premiumFeeds: boolean;
  multiAccount: boolean;
  liveDataSources: boolean;
  paperDeployments: boolean;
  brokerConnections: boolean;
  intradaySync: boolean;
  marketplacePublish: boolean;
  /** Platform commission taken on performance fees collected for this creator. */
  marketplaceFeeRate: number;
};

const UNLIMITED = Number.POSITIVE_INFINITY;

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxStrategies: UNLIMITED,
    maxBacktestsPerMonth: UNLIMITED,
    maxAiCallsPerMonth: UNLIMITED,
    liveExecution: false,
    maxConcurrentLive: 0,
    hftAccess: true, // paper trading with HFT listings is free
    realtimeData: false,
    premiumFeeds: false,
    multiAccount: false,
    liveDataSources: true, // contributors need their own feeds to backtest — never gated
    paperDeployments: true,
    brokerConnections: false,
    intradaySync: false,
    marketplacePublish: true,
    marketplaceFeeRate: BASE_COMMISSION,
  },
  basic: {
    maxStrategies: UNLIMITED,
    maxBacktestsPerMonth: UNLIMITED,
    maxAiCallsPerMonth: UNLIMITED,
    liveExecution: true,
    maxConcurrentLive: UNLIMITED,
    hftAccess: true,
    realtimeData: true,
    premiumFeeds: true,
    multiAccount: true,
    liveDataSources: true,
    paperDeployments: true,
    brokerConnections: true,
    intradaySync: true,
    marketplacePublish: true,
    marketplaceFeeRate: BASE_COMMISSION,
  },
};

export const PLAN_LABEL: Record<PlanTier, string> = { free: "Free", basic: "Basic" };

export const PLAN_PRICE_IDS = {
  basic: { monthly: "basic_monthly", yearly: "basic_yearly" },
} as const;

export const PLAN_PRICE_USD = {
  basic: { monthly: planSpec("basic").monthly, yearly: planSpec("basic").annual },
} as const;

export const PLAN_FEATURES: Record<Exclude<PlanTier, "free">, string[]> = {
  basic: planSpec("basic").features,
};

export { CONSUMER_PLANS };

/** Legacy price ids (pro_*, desk_*, elite_*) all resolve to Basic so old rows keep working. */
export function tierFromPriceId(priceId: string | null | undefined): PlanTier {
  if (!priceId) return "free";
  if (/^(basic|pro|desk|elite)/.test(priceId)) return "basic";
  return "free";
}

export function currentPeriodKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const UPGRADE_PREFIX = "UPGRADE_REQUIRED:";

export function upgradeMessage(feature: string, plan: Exclude<PlanTier, "free"> = "basic"): string {
  return `${UPGRADE_PREFIX} ${feature} requires the ${PLAN_LABEL[plan]} plan ($${planSpec("basic").monthly}/mo).`;
}

export function isUpgradeError(message: string | undefined | null): boolean {
  return Boolean(message?.startsWith(UPGRADE_PREFIX));
}

export function cleanUpgradeMessage(message: string): string {
  return message.replace(UPGRADE_PREFIX, "").trim();
}

export function formatLimit(value: number): string {
  return Number.isFinite(value) ? String(value) : "Unlimited";
}
