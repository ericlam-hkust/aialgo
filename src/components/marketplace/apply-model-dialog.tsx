import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, CreditCard, Loader2, SlidersHorizontal } from "lucide-react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createModelCheckoutSession } from "@/lib/marketplace-payments.functions";
import { activateModel, getMyModelAccess } from "@/lib/models.functions";
import { listBrokerConnections } from "@/lib/brokers.functions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { pricingLabel, type ModelPricingModel } from "@/lib/marketplace";

type Step = "pay" | "configure" | "done";

export function ApplyModelDialog({
  open,
  onOpenChange,
  model,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  model: { id: string; slug: string; name: string; pricing_model: ModelPricingModel; price: number; currency: string };
}) {
  const navigate = useNavigate();
  const access = useQuery({ queryKey: ["model-access"], queryFn: () => getMyModelAccess(), enabled: open });
  const owned = (access.data?.purchases ?? []).some((p) => p.model_id === model.id);
  const [step, setStep] = useState<Step>("pay");
  const current: Step = step === "pay" && owned ? "configure" : step;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {current === "pay" ? <CreditCard className="h-4 w-4" aria-hidden /> : null}
            {current === "configure" ? <SlidersHorizontal className="h-4 w-4" aria-hidden /> : null}
            {current === "done" ? <CheckCircle2 className="h-4 w-4 text-profit" aria-hidden /> : null}
            Use {model.name}
          </DialogTitle>
          <DialogDescription>
            {current === "pay"
              ? `Unlock this model — ${pricingLabel(model.pricing_model, Number(model.price), model.currency)}`
              : current === "configure"
                ? "Choose where it runs and set your risk limits."
                : "Model activated."}
          </DialogDescription>
        </DialogHeader>

        {access.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : current === "pay" ? (
          <PayStep model={model} />
        ) : current === "configure" ? (
          <ConfigureStep modelId={model.id} onDone={() => setStep("done")} />
        ) : (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-profit" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {model.name} is now running. Track it from My Strategies with pause and stop controls.
            </p>
            <Button
              onClick={() => {
                onOpenChange(false);
                void navigate({ to: "/dashboard/strategies" });
              }}
            >
              Go to My Strategies
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PayStep({ model }: { model: { id: string; slug: string } }) {
  const fetchClientSecret = async () => {
    const res = await createModelCheckoutSession({
      data: {
        modelId: model.id,
        returnUrl: `${window.location.origin}/models/${model.slug}?purchase=done`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in res) throw new Error(res.error);
    return res.clientSecret;
  };
  return (
    <div id="checkout" className="min-h-[520px]">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

function ConfigureStep({ modelId, onDone }: { modelId: string; onDone: () => void }) {
  const brokers = useQuery({ queryKey: ["broker-connections"], queryFn: () => listBrokerConnections() });
  const [mode, setMode] = useState<"paper" | "live">("paper");
  const [broker, setBroker] = useState<string>("none");
  const [capital, setCapital] = useState("100000");
  const [maxPos, setMaxPos] = useState("10");
  const [dailyLoss, setDailyLoss] = useState("3");
  const [stopLoss, setStopLoss] = useState("5");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await activateModel({
        data: {
          modelId,
          brokerConnectionId: mode === "live" && broker !== "none" ? broker : null,
          mode,
          capitalAllocation: Number(capital),
          maxPositionSizePct: Number(maxPos),
          dailyLossLimitPct: Number(dailyLoss),
          stopLossPct: Number(stopLoss),
        },
      });
      toast.success("Model activated");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not activate model");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Execution mode</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as "paper" | "live")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paper">Paper trading (simulated)</SelectItem>
              <SelectItem value="live">Live broker execution</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Account</Label>
          <Select value={broker} onValueChange={setBroker} disabled={mode === "paper"}>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Paper account</SelectItem>
              {(brokers.data ?? []).map((b: { id: string; broker_name: string; status: string }) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.broker_name} · {b.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Field label="Capital allocation (HK$)" value={capital} onChange={setCapital} />
        <Field label="Max position size %" value={maxPos} onChange={setMaxPos} />
        <Field label="Daily loss limit %" value={dailyLoss} onChange={setDailyLoss} />
        <Field label="Stop loss %" value={stopLoss} onChange={setStopLoss} />
      </div>
      <Badge variant="secondary">Risk limits are enforced by the platform risk engine.</Badge>
      <Button className="w-full" onClick={submit} disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
        Activate model
      </Button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input className="mono" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
