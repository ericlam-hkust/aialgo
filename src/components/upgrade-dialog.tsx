import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StripeEmbeddedCheckout } from "@/components/stripe-embedded-checkout";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { PLAN_FEATURES, PLAN_LABEL, PLAN_PRICE_USD, PLAN_PRICE_IDS, type PlanTier } from "@/lib/entitlements";
import { NO_COMMISSION_PROMISE } from "@/lib/monetization";

const PAID_TIERS = ["pro", "elite"] as const;

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
            <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Choose your plan
          </DialogTitle>
          <DialogDescription>
            {reason ?? "Subscription only — aiAlgo never takes a commission or per-trade fee."}
          </DialogDescription>
        </DialogHeader>

        {checkoutPriceId ? (
          <div className="space-y-3">
            <PaymentTestModeBanner />
            <StripeEmbeddedCheckout priceId={checkoutPriceId} />
            <Button variant="ghost" size="sm" onClick={() => setCheckoutPriceId(null)}>
              Back
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

            <div className="grid gap-4 sm:grid-cols-2">
              {PAID_TIERS.map((key) => {
                const price = yearly ? PLAN_PRICE_USD[key].yearly : PLAN_PRICE_USD[key].monthly;
                const priceId = yearly ? PLAN_PRICE_IDS[key].yearly : PLAN_PRICE_IDS[key].monthly;
                const isCurrent = currentTier === key;
                return (
                  <div
                    key={key}
                    className={`rounded-lg border p-5 ${key === "pro" ? "border-primary/50" : "border-border/70"}`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{PLAN_LABEL[key]}</h3>
                      {key === "pro" ? <Badge>Most popular</Badge> : null}
                    </div>
                    <p className="mono mt-3 text-3xl font-semibold">
                      ${price.toLocaleString()}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        / {yearly ? "year" : "month"}
                      </span>
                    </p>
                    <ul className="mt-4 space-y-2 text-sm">
                      {PLAN_FEATURES[key].map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-profit" aria-hidden />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-5 w-full"
                      variant={key === "pro" ? "default" : "outline"}
                      disabled={isCurrent}
                      onClick={() => setCheckoutPriceId(priceId)}
                    >
                      {isCurrent ? "Current plan" : `Upgrade to ${PLAN_LABEL[key]}`}
                    </Button>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{NO_COMMISSION_PROMISE}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
