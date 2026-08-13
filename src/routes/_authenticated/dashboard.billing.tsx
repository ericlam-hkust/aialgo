import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, CreditCard, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ModelUsageCard } from "@/components/model-usage-card";
import { ContributorEarnings } from "@/components/contributor-earnings";
import { UpgradeDialog } from "@/components/upgrade-dialog";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { useEntitlements } from "@/hooks/use-entitlements";
import { createPortalSession, getMyFeeSummary } from "@/lib/payments.functions";
import { getStripeEnvironmentSafe } from "@/lib/stripe";
import { PLAN_LABEL } from "@/lib/entitlements";
import { usd } from "@/lib/monetization";

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Earnings | aiAlgo" },
      {
        name: "description",
        content:
          "Manage your aiAlgo plan, track performance fees charged only on winning trades, and see your contributor earnings.",
      },
      { property: "og:title", content: "Billing & Earnings | aiAlgo" },
      { property: "og:description", content: "Your plan, performance fees and contributor earnings in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BillingPage,
});

const BASIC_UNLOCKS = [
  "Live execution with real capital",
  "Real-time market data",
  "Premium data feeds",
  "Multiple trading accounts",
  "Broker connections",
  "Intraday sync",
];

function BillingPage() {
  const { tier, subscription, refetch } = useEntitlements();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const fees = useQuery({ queryKey: ["fee-summary"], queryFn: () => getMyFeeSummary() });

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

  const nextCharge = new Date();
  nextCharge.setUTCMonth(nextCharge.getUTCMonth() + 1, 1);

  return (
    <>
      <PaymentTestModeBanner />
      <div className="space-y-8 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Billing &amp; earnings</h1>
            <p className="text-sm text-muted-foreground">
              What you pay, and — if you publish on the marketplace — what you earn.
            </p>
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
              {tier === "basic" ? "Change plan" : "Go live for $12"}
            </Button>
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">What you pay</h2>

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
                    : "You are on the free plan — browsing, backtesting and paper trading are unlimited."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-xs text-muted-foreground">Basic — $12/month unlocks:</p>
                {BASIC_UNLOCKS.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 text-profit" aria-hidden />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Performance fees this period</CardTitle>
                <CardDescription>
                  You are charged only on new profit above your previous peak (high-water mark). Losing trades are never
                  charged, and nothing is billed until the next batch runs on{" "}
                  {nextCharge.toLocaleDateString(undefined, { month: "short", day: "numeric" })}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Accrued fees</p>
                    <p className="mono text-2xl">{usd(fees.data?.accrued ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Profit generated</p>
                    <p className="mono text-2xl text-profit">{usd(fees.data?.grossProfit ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Profitable exits</p>
                    <p className="mono text-2xl">{fees.data?.chargedTrades ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Charge history</CardTitle>
              <CardDescription>Performance-fee batches charged to your card.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(fees.data?.batches ?? []).map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="mono">
                        {new Date(b.charged_at ?? b.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{b.trigger}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{b.status}</Badge>
                      </TableCell>
                      <TableCell className="mono text-right">{usd(Number(b.amount ?? 0))}</TableCell>
                    </TableRow>
                  ))}
                  {(fees.data?.batches ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        No charges yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <ModelUsageCard />
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">What you earn</h2>
          <ContributorEarnings />
        </section>
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
