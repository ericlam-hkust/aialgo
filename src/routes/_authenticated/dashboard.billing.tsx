import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, CreditCard, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModelUsageCard } from "@/components/model-usage-card";
import { UpgradeDialog } from "@/components/upgrade-dialog";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { useEntitlements } from "@/hooks/use-entitlements";
import { createPortalSession } from "@/lib/payments.functions";
import { getStripeEnvironmentSafe } from "@/lib/stripe";
import { PLAN_LABEL } from "@/lib/entitlements";
import { CONSUMER_PLANS, NO_COMMISSION_PROMISE, SELF_HOSTED_PROMISE } from "@/lib/monetization";

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  head: () => ({
    meta: [
      { title: "Subscription & Billing | aiAlgo" },
      {
        name: "description",
        content:
          "Manage your aiAlgo subscription. Subscription only — no commissions, per-trade charges or performance fees.",
      },
      { property: "og:title", content: "Subscription & Billing | aiAlgo" },
      { property: "og:description", content: "Your aiAlgo plan, invoices and feature entitlements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const { tier, subscription, refetch } = useEntitlements();
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
    <>
      <PaymentTestModeBanner />
      <div className="space-y-8 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Subscription</h1>
            <p className="text-sm text-muted-foreground">{NO_COMMISSION_PROMISE}</p>
          </div>
          <div className="flex gap-2">
            {subscription ? (
              <Button variant="outline" onClick={openPortal} disabled={portalLoading}>
                <CreditCard className="mr-2 h-4 w-4" aria-hidden /> Manage billing
                <ExternalLink className="ml-2 h-3 w-3" aria-hidden />
              </Button>
            ) : null}
            <Button onClick={() => setUpgradeOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" aria-hidden />
              {tier === "free" ? "Upgrade" : "Change plan"}
            </Button>
          </div>
        </header>

        <Card>
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
                : "You are on the Starter plan — building, 1 year of backtest history and the downloadable package are free forever."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            {CONSUMER_PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`rounded-lg border p-4 ${plan.key === tier ? "border-primary/60" : "border-border/70"}`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{plan.name}</p>
                  {plan.key === tier ? <Badge variant="outline">Current</Badge> : null}
                </div>
                <p className="mono mt-1 text-2xl">
                  ${plan.monthly}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">/mo</span>
                </p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-profit" aria-hidden />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> What you are never charged for
            </CardTitle>
            <CardDescription>{SELF_HOSTED_PROMISE}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>No commission on your trades. No per-trade fees. No performance fees. Ever.</p>
            <p>
              Invoices, payment methods and cancellation are handled in the billing portal. If your subscription lapses,
              your deployed package keeps running its current version on your own infrastructure — only updates and
              cloud features pause.
            </p>
          </CardContent>
        </Card>

        <ModelUsageCard />
      </div>

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={(next) => {
          setUpgradeOpen(next);
          if (!next) void refetch();
        }}
        currentTier={tier}
      />
    </>
  );
}
