export type PlanTier = "free" | "pro" | "elite";

export type PlanLimits = {
  maxStrategies: number;
  maxBacktestsPerMonth: number;
  maxAiCallsPerMonth: number;
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
    maxStrategies: 1,
    maxBacktestsPerMonth: 5,
    maxAiCallsPerMonth: 5,
    liveDataSources: false,
    paperDeployments: false,
    brokerConnections: false,
    intradaySync: false,
    marketplacePublish: false,
    marketplaceFeeRate: 0.2,
  },
  pro: {
    maxStrategies: 25,
    maxBacktestsPerMonth: 500,
    maxAiCallsPerMonth: 300,
    liveDataSources: true,
    paperDeployments: true,
    brokerConnections: false,
    intradaySync: false,
    marketplacePublish: true,
    marketplaceFeeRate: 0.2,
  },
  elite: {
    maxStrategies: Number.POSITIVE_INFINITY,
    maxBacktestsPerMonth: Number.POSITIVE_INFINITY,
    maxAiCallsPerMonth: Number.POSITIVE_INFINITY,
    liveDataSources: true,
    paperDeployments: true,
    brokerConnections: true,
    intradaySync: true,
    marketplacePublish: true,
    marketplaceFeeRate: 0,
  },
};

export const PLAN_LABEL: Record<PlanTier, string> = {
  free: "Free",
  pro: "Pro",
  elite: "Elite",
};

export const PLAN_PRICE_IDS = {
  pro: { monthly: "pro_monthly", yearly: "pro_yearly" },
  elite: { monthly: "elite_monthly", yearly: "elite_yearly" },
} as const;

export const PLAN_PRICE_HKD = {
  pro: { monthly: 299, yearly: 2990 },
  elite: { monthly: 799, yearly: 7990 },
} as const;

export function tierFromPriceId(priceId: string | null | undefined): PlanTier {
  if (!priceId) return "free";
  if (priceId.startsWith("elite")) return "elite";
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
