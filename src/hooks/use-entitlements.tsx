import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyEntitlements } from "@/lib/payments.functions";
import { PLAN_LIMITS, type PlanTier } from "@/lib/entitlements";

export function useEntitlements() {
  const fetchEntitlements = useServerFn(getMyEntitlements);
  const query = useQuery({
    queryKey: ["entitlements"],
    queryFn: () => fetchEntitlements(),
    staleTime: 60_000,
  });

  const tier = (query.data?.tier ?? "free") as PlanTier;
  return {
    ...query,
    tier,
    limits: query.data?.limits ?? PLAN_LIMITS[tier],
    usage: query.data?.usage ?? { backtestsRun: 0, aiCalls: 0, strategies: 0 },
    subscription: query.data?.subscription ?? null,
  };
}
