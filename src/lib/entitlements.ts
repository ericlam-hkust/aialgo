import { CONSUMER_PLANS, planSpec, type ConsumerPlan } from "./monetization";

export type PlanTier = ConsumerPlan; // "free" | "pro" | "elite"

export type PlanLimits = {
  maxStrategies: number;
  maxBacktestsPerMonth: number;
  maxAiCallsPerMonth: number;
  /** years of history available to the backtester */
  backtestYears: number;
  walkForward: boolean;
  codeEditor: boolean;
  /** number of concurrent self-hosted deployments the release registry will serve */
  maxDeployments: number;
  /** agent may pull updates automatically instead of manual download */
  autoUpdates: boolean;
  /** guided one-click provisioning into the user's own cloud account */
  cloudDeploy: boolean;
  /** paper-run stage, canary sizing and automatic rollback */
  advancedPipeline: boolean;
  /** read-only monitoring from the local agent's telemetry */
  liveMonitoring: boolean;
  realtimeData: boolean;
  teamWorkspaces: boolean;
  marketplacePublish: boolean;
};

const UNLIMITED = Number.POSITIVE_INFINITY;

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxStrategies: UNLIMITED,
    maxBacktestsPerMonth: UNLIMITED,
    maxAiCallsPerMonth: UNLIMITED,
    backtestYears: 1,
    walkForward: false,
    codeEditor: false,
    maxDeployments: 1,
    autoUpdates: false,
    cloudDeploy: false,
    advancedPipeline: false,
    liveMonitoring: false,
    realtimeData: false,
    teamWorkspaces: false,
    marketplacePublish: true,
  },
  pro: {
    maxStrategies: UNLIMITED,
    maxBacktestsPerMonth: UNLIMITED,
    maxAiCallsPerMonth: UNLIMITED,
    backtestYears: UNLIMITED,
    walkForward: true,
    codeEditor: true,
    maxDeployments: 1,
    autoUpdates: true,
    cloudDeploy: true,
    advancedPipeline: false,
    liveMonitoring: true,
    realtimeData: true,
    teamWorkspaces: false,
    marketplacePublish: true,
  },
  elite: {
    maxStrategies: UNLIMITED,
    maxBacktestsPerMonth: UNLIMITED,
    maxAiCallsPerMonth: UNLIMITED,
    backtestYears: UNLIMITED,
    walkForward: true,
    codeEditor: true,
    maxDeployments: UNLIMITED,
    autoUpdates: true,
    cloudDeploy: true,
    advancedPipeline: true,
    liveMonitoring: true,
    realtimeData: true,
    teamWorkspaces: true,
    marketplacePublish: true,
  },
};

export const PLAN_LABEL: Record<PlanTier, string> = { free: "Starter", pro: "Pro", elite: "Elite" };

export const PLAN_PRICE_IDS = {
  pro: { monthly: "pro_monthly", yearly: "pro_yearly" },
  elite: { monthly: "elite_monthly", yearly: "elite_yearly" },
} as const;

export const PLAN_PRICE_USD = {
  pro: { monthly: planSpec("pro").monthly, yearly: planSpec("pro").annual },
  elite: { monthly: planSpec("elite").monthly, yearly: planSpec("elite").annual },
} as const;

export const PLAN_FEATURES: Record<Exclude<PlanTier, "free">, string[]> = {
  pro: planSpec("pro").features,
  elite: planSpec("elite").features,
};

export { CONSUMER_PLANS };

/** Legacy price ids (basic_*, desk_*) resolve to Pro so existing subscriptions keep working. */
export function tierFromPriceId(priceId: string | null | undefined): PlanTier {
  if (!priceId) return "free";
  if (/^(elite|team)/.test(priceId)) return "elite";
  if (/^(pro|basic|desk)/.test(priceId)) return "pro";
  return "free";
}

export function currentPeriodKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const UPGRADE_PREFIX = "UPGRADE_REQUIRED:";

export function upgradeMessage(feature: string, plan: Exclude<PlanTier, "free"> = "pro"): string {
  return `${UPGRADE_PREFIX} ${feature} requires the ${PLAN_LABEL[plan]} plan ($${planSpec(plan).monthly}/mo).`;
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
