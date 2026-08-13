import { CONSUMER_PLANS, planSpec, type ConsumerPlan } from "./monetization";

export type PlanTier = ConsumerPlan; // "free" | "pro" | "desk"

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
  /** Platform commission taken on marketplace sales by this creator. */
  marketplaceFeeRate: number;
};

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxStrategies: Number.POSITIVE_INFINITY,
    maxBacktestsPerMonth: 3,
    maxAiCallsPerMonth: 20,
    liveExecution: false,
    maxConcurrentLive: 0,
    hftAccess: false,
    realtimeData: false,
    premiumFeeds: false,
    multiAccount: false,
    liveDataSources: false,
    paperDeployments: true,
    brokerConnections: false,
    intradaySync: false,
    marketplacePublish: true,
    marketplaceFeeRate: 0.2,
  },
  pro: {
    maxStrategies: Number.POSITIVE_INFINITY,
    maxBacktestsPerMonth: Number.POSITIVE_INFINITY,
    maxAiCallsPerMonth: 1000,
    liveExecution: true,
    maxConcurrentLive: 3,
    hftAccess: true,
    realtimeData: true,
    premiumFeeds: false,
    multiAccount: false,
    liveDataSources: true,
    paperDeployments: true,
    brokerConnections: true,
    intradaySync: true,
    marketplacePublish: true,
    marketplaceFeeRate: 0.2,
  },
  desk: {
    maxStrategies: Number.POSITIVE_INFINITY,
    maxBacktestsPerMonth: Number.POSITIVE_INFINITY,
    maxAiCallsPerMonth: Number.POSITIVE_INFINITY,
    liveExecution: true,
    maxConcurrentLive: Number.POSITIVE_INFINITY,
    hftAccess: true,
    realtimeData: true,
    premiumFeeds: true,
    multiAccount: true,
    liveDataSources: true,
    paperDeployments: true,
    brokerConnections: true,
    intradaySync: true,
    marketplacePublish: true,
    marketplaceFeeRate: 0.2,
  },
};

export const PLAN_LABEL: Record<PlanTier, string> = { free: "Free", pro: "Pro", desk: "Desk" };

export const PLAN_PRICE_IDS = {
  pro: { monthly: "pro_monthly", yearly: "pro_yearly" },
  desk: { monthly: "desk_monthly", yearly: "desk_yearly" },
} as const;

export const PLAN_PRICE_USD = {
  pro: { monthly: planSpec("pro").monthly, yearly: planSpec("pro").annual },
  desk: { monthly: planSpec("desk").monthly, yearly: planSpec("desk").annual },
} as const;

export const PLAN_FEATURES: Record<Exclude<PlanTier, "free">, string[]> = {
  pro: planSpec("pro").features,
  desk: planSpec("desk").features,
};

export { CONSUMER_PLANS };

export function tierFromPriceId(priceId: string | null | undefined): PlanTier {
  if (!priceId) return "free";
  if (priceId.startsWith("desk") || priceId.startsWith("elite")) return "desk";
  if (priceId.startsWith("pro")) return "pro";
  return "free";
}

export function currentPeriodKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const UPGRADE_PREFIX = "UPGRADE_REQUIRED:";

export function upgradeMessage(feature: string, plan: Exclude<PlanTier, "free">): string {
  return `${UPGRADE_PREFIX} ${feature} requires the ${PLAN_LABEL[plan]} plan.`;
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
