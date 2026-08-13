import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StripeEmbeddedCheckout } from "@/components/stripe-embedded-checkout";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { PLAN_FEATURES, PLAN_PRICE_USD, PLAN_PRICE_IDS, type PlanTier } from "@/lib/entitlements";
import { FEE_DISCLOSURE } from "@/lib/monetization";

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

  const price = yearly ? PLAN_PRICE_USD.basic.yearly : PLAN_PRICE_USD.basic.monthly;
  const priceId = yearly ? PLAN_PRICE_IDS.basic.yearly : PLAN_PRICE_IDS.basic.monthly;
  const isCurrent = currentTier === "basic";

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Go live with Basic
          </DialogTitle>
          <DialogDescription>
            {reason ?? "Paper trading is always free. Live execution needs the Basic plan."}
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

            <div className="rounded-lg border border-primary/50 p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Basic</h3>
                <Badge>The only plan</Badge>
              </div>
              <p className="mono mt-3 text-3xl font-semibold">
                ${price.toLocaleString()}
                <span className="ml-1 text-sm font-normal text-muted-foreground">/ {yearly ? "year" : "month"}</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {PLAN_FEATURES.basic.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-profit" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="mt-5 w-full" disabled={isCurrent} onClick={() => setCheckoutPriceId(priceId)}>
                {isCurrent ? "Current plan" : "Upgrade to Basic"}
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">{FEE_DISCLOSURE}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
