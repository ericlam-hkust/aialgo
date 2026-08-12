import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CreditCard, ExternalLink, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UpgradeDialog } from "@/components/upgrade-dialog";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { useEntitlements } from "@/hooks/use-entitlements";
import { createPortalSession } from "@/lib/payments.functions";
import { getStripeEnvironmentSafe } from "@/lib/stripe";
import { PLAN_LABEL, formatLimit } from "@/lib/entitlements";

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Plans | AlgoForge" },
      {
        name: "description",
        content: "Manage your AlgoForge subscription, monitor monthly usage, and upgrade to Pro or Elite.",
      },
      { property: "og:title", content: "Billing & Plans | AlgoForge" },
      { property: "og:description", content: "Manage your AlgoForge subscription and plan usage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BillingPage,
});

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Number.isFinite(limit) ? Math.min(100, (used / Math.max(limit, 1)) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="mono">
          {used} / {formatLimit(limit)}
        </span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

function BillingPage() {
  const { tier, limits, usage, subscription, isLoading, refetch } = useEntitlements();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const result = await createPortalSession({
        data: { returnUrl: `${window.location.origin}/dashboard/billing`, environment: getStripeEnvironmentSafe() },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank", "noopener");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <AppShell>
      <PaymentTestModeBanner />
      <div className="space-y-6 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Billing &amp; plans</h1>
            <p className="text-sm text-muted-foreground">Manage your subscription and monitor monthly usage.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openPortal} disabled={portalLoading || !subscription}>
              <CreditCard className="mr-2 h-4 w-4" aria-hidden /> Manage billing
              <ExternalLink className="ml-2 h-3 w-3" aria-hidden />
            </Button>
            <Button onClick={() => setUpgradeOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" aria-hidden /> {tier === "elite" ? "Change plan" : "Upgrade"}
            </Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Current plan <Badge variant={tier === "free" ? "secondary" : "default"}>{PLAN_LABEL[tier]}</Badge>
              </CardTitle>
              <CardDescription>
                {subscription
                  ? `Status: ${subscription.status}${
                      subscription.currentPeriodEnd
                        ? ` · ${subscription.cancelAtPeriodEnd ? "Ends" : "Renews"} ${new Date(
                            subscription.currentPeriodEnd,
                          ).toLocaleDateString()}`
                        : ""
                    }`
                  : "You are on the free plan."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Live data sources</span>
                <span>{limits.liveDataSources ? "Included" : "Pro+"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paper deployments</span>
                <span>{limits.paperDeployments ? "Included" : "Pro+"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Broker connections</span>
                <span>{limits.brokerConnections ? "Included" : "Elite"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Marketplace commission</span>
                <span className="mono">{Math.round(limits.marketplaceFeeRate * 100)}%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>This month&apos;s usage</CardTitle>
              <CardDescription>Counters reset at the start of each calendar month (UTC).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading usage…</p>
              ) : (
                <>
                  <UsageBar label="Strategies" used={usage.strategies} limit={limits.maxStrategies} />
                  <UsageBar label="Backtests" used={usage.backtestsRun} limit={limits.maxBacktestsPerMonth} />
                  <UsageBar label="AI requests" used={usage.aiCalls} limit={limits.maxAiCallsPerMonth} />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={(next) => {
          setUpgradeOpen(next);
          if (!next) void refetch();
        }}
        currentTier={tier}
      />
    </AppShell>
  );
}
