export type ModelBadge = { key: string; label: string; hint: string };

export type BadgeInput = {
  hasBacktest: boolean;
  liveDays: number;
  rating: number;
  ratingCount: number;
};

/** Verified-performance badges shown on cards and the detail page. */
export function modelBadges(input: BadgeInput): ModelBadge[] {
  const badges: ModelBadge[] = [];
  if (input.hasBacktest) {
    badges.push({
      key: "backtest",
      label: "Backtest Verified",
      hint: "AlgoForge re-ran this strategy out of sample and stored the equity curve.",
    });
  }
  if (input.liveDays >= 30) {
    badges.push({
      key: "live30",
      label: "30-Day Live Track Record",
      hint: "The model has been running live on the platform for at least 30 days.",
    });
  }
  if (input.rating >= 4.5 && input.ratingCount >= 5) {
    badges.push({
      key: "top",
      label: "Top Rated",
      hint: "4.5+ stars from five or more verified subscribers.",
    });
  }
  return badges;
}

export function daysSince(iso: string | null | undefined) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

export const REVIEW_MIN_DAYS = 7;
