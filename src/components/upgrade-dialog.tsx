import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StripeEmbeddedCheckout } from "@/components/stripe-embedded-checkout";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { PLAN_PRICE_HKD, PLAN_PRICE_IDS, type PlanTier } from "@/lib/entitlements";

const PLAN_FEATURES: Record<"pro" | "elite", string[]> = {
  pro: [
    "25 strategies, 500 backtests / month",
    "Live market data providers",
    "Paper trading deployments",
    "AI assistant & marketplace publishing",
  ],
  elite: [
    "Unlimited strategies & backtests",
    "Broker connections (IBKR, Futu, Tiger)",
    "Intraday data sync",
    "0% marketplace commission",
  ],
};

export function UpgradeDialog({
  open,
  onOpenChange,
  reason,
  currentTier = "free",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string | undefined;
  currentTier?: PlanTier;
}) {
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const [yearly, setYearly] = useState(false);

  const close = (next: boolean) => {
    if (!next) setCheckoutPriceId(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Upgrade your plan
          </DialogTitle>
          <DialogDescription>{reason ?? "Unlock more capacity and live trading tools."}</DialogDescription>
        </DialogHeader>

        {checkoutPriceId ? (
          <div className="space-y-3">
            <PaymentTestModeBanner />
            <StripeEmbeddedCheckout priceId={checkoutPriceId} />
            <Button variant="ghost" size="sm" onClick={() => setCheckoutPriceId(null)}>
              Back to plans
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm">
              <button
                type="button"
                className={!yearly ? "font-semibold text-foreground" : "text-muted-foreground"}
                onClick={() => setYearly(false)}
              >
                Monthly
              </button>
              <span className="text-muted-foreground">/</span>
              <button
                type="button"
                className={yearly ? "font-semibold text-foreground" : "text-muted-foreground"}
                onClick={() => setYearly(true)}
              >
                Yearly <Badge variant="secondary" className="ml-1">2 months free</Badge>
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {(["pro", "elite"] as const).map((plan) => {
                const price = yearly ? PLAN_PRICE_HKD[plan].yearly : PLAN_PRICE_HKD[plan].monthly;
                const priceId = yearly ? PLAN_PRICE_IDS[plan].yearly : PLAN_PRICE_IDS[plan].monthly;
                const isCurrent = currentTier === plan;
                return (
                  <div key={plan} className="rounded-lg border border-border/70 p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold capitalize">{plan}</h3>
                      {plan === "pro" ? <Badge>Most popular</Badge> : null}
                    </div>
                    <p className="mono mt-3 text-2xl font-semibold">
                      HK${price.toLocaleString()}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        / {yearly ? "year" : "month"}
                      </span>
                    </p>
                    <ul className="mt-4 space-y-2 text-sm">
                      {PLAN_FEATURES[plan].map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-profit" aria-hidden />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-5 w-full"
                      variant={plan === "pro" ? "default" : "outline"}
                      disabled={isCurrent}
                      onClick={() => setCheckoutPriceId(priceId)}
                    >
                      {isCurrent ? "Current plan" : `Choose ${plan}`}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
