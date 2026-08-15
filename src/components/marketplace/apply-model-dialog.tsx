import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, Loader2, ShieldAlert, SlidersHorizontal, Wallet } from "lucide-react";
import { activateModel, getMyModelAccess } from "@/lib/models.functions";
import { listTradingAccounts } from "@/lib/trading-accounts.functions";
import { providerLabel } from "@/lib/trading-accounts";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ParameterForm } from "@/components/marketplace/parameter-form";
import { defaultParamValues, normalizeManifest, type ParamValues } from "@/lib/model-interface";
import { pricingLabel, type ModelPricingModel } from "@/lib/marketplace";
import { fmtMoney } from "@/lib/format";

type Step = "pay" | "parameters" | "account" | "risk" | "review" | "done";
const FLOW: Step[] = ["pay", "parameters", "account", "risk", "review"];

const TITLES: Record<Step, string> = {
  pay: "Payment",
  parameters: "Model parameters",
  account: "Account & capital",
  risk: "Risk limits",
  review: "Review & activate",
  done: "Activated",
};

export function ApplyModelDialog({
  open,
  onOpenChange,
  model,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  model: {
    id: string;
    slug: string;
    name: string;
    pricing_model: ModelPricingModel;
    price: number;
    currency: string;
    interface_manifest?: unknown;
  };
}) {
  const navigate = useNavigate();
  const access = useQuery({ queryKey: ["model-access"], queryFn: () => getMyModelAccess(), enabled: open });
  const accounts = useQuery({ queryKey: ["trading-accounts"], queryFn: () => listTradingAccounts(), enabled: open });
  const owned = true;

  const manifest = useMemo(() => normalizeManifest(model.interface_manifest), [model.interface_manifest]);
  const [params, setParams] = useState<ParamValues>(() => defaultParamValues(manifest));
  const [step, setStep] = useState<Step>("pay");
  const current: Step = step === "pay" && owned ? "parameters" : step;

  const [accountId, setAccountId] = useState<string>("paper");
  const [capital, setCapital] = useState("100000");
  const [maxPos, setMaxPos] = useState("10");
  const [dailyLoss, setDailyLoss] = useState("3");
  const [maxOpen, setMaxOpen] = useState("5");
  const [killSwitch, setKillSwitch] = useState("20");
  const [stopLoss, setStopLoss] = useState("5");
  const [busy, setBusy] = useState(false);

  const accountRows = accounts.data ?? [];
  const selected = accountRows.find((a) => a.id === accountId);
  const mode: "paper" | "live" = !selected || selected.mode === "simulation" ? "paper" : "live";

  const idx = FLOW.indexOf(current);
  const goNext = () => setStep(FLOW[Math.min(FLOW.length - 1, idx + 1)] as Step);
  const goBack = () => setStep(FLOW[Math.max(owned ? 1 : 0, idx - 1)] as Step);

  const activate = async () => {
    setBusy(true);
    try {
      await activateModel({
        data: {
          modelId: model.id,
          brokerConnectionId: selected ? selected.id : null,
          mode,
          capitalAllocation: Number(capital),
          maxPositionSizePct: Number(maxPos),
          dailyLossLimitPct: Number(dailyLoss),
          stopLossPct: Number(stopLoss),
          maxOpenPositions: Number(maxOpen),
          killSwitchDrawdownPct: Number(killSwitch),
          parameters: params,
        },
      });
      toast.success("Model activated");
      setStep("done");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not activate model");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {current === "pay" ? <CreditCard className="h-4 w-4" aria-hidden /> : null}
            {current === "parameters" ? <SlidersHorizontal className="h-4 w-4" aria-hidden /> : null}
            {current === "account" ? <Wallet className="h-4 w-4" aria-hidden /> : null}
            {current === "risk" ? <ShieldAlert className="h-4 w-4" aria-hidden /> : null}
            {current === "done" ? <CheckCircle2 className="h-4 w-4 text-profit" aria-hidden /> : null}
            Use {model.name}
          </DialogTitle>
          <DialogDescription>
            {current === "pay"
              ? `Unlock this model — ${pricingLabel(model.pricing_model, Number(model.price), model.currency)}`
              : current === "done"
                ? "Your model is live in the execution chain."
                : `Step ${idx + 1} of ${FLOW.length} · ${TITLES[current]}`}
          </DialogDescription>
        </DialogHeader>

        {current !== "done" ? (
          <ol className="flex flex-wrap gap-1.5">
            {FLOW.map((s, i) => (
              <li key={s}>
                <Badge variant={i === idx ? "default" : i < idx ? "secondary" : "outline"}>
                  {i + 1}. {TITLES[s]}
                </Badge>
              </li>
            ))}
          </ol>
        ) : null}

        {access.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : current === "pay" ? (
          <PayStep model={model} />
        ) : current === "parameters" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generated from the contributor's interface manifest — defaults are pre-filled.
            </p>
            <ParameterForm manifest={manifest} values={params} onChange={setParams} />
          </div>
        ) : current === "account" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Execution account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paper">Built-in paper account (simulated)</SelectItem>
                  {accountRows.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {(a.nickname || providerLabel(a.broker_name)) + ` · ${a.status}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Mode: <span className="mono">{mode}</span>
              </p>
            </div>
            <Field label="Capital allocation" value={capital} onChange={setCapital} />
          </div>
        ) : current === "risk" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Max position size %" value={maxPos} onChange={setMaxPos} />
            <Field label="Daily loss limit %" value={dailyLoss} onChange={setDailyLoss} />
            <Field label="Max open positions" value={maxOpen} onChange={setMaxOpen} />
            <Field label="Kill-switch drawdown %" value={killSwitch} onChange={setKillSwitch} />
            <Field label="Stop loss %" value={stopLoss} onChange={setStopLoss} />
            <div className="sm:col-span-2">
              <Badge variant="secondary">Every signal passes the platform risk engine before it becomes an order.</Badge>
            </div>
          </div>
        ) : current === "review" ? (
          <div className="space-y-3 text-sm">
            <Chain
              model={model.name}
              account={selected ? selected.nickname || providerLabel(selected.broker_name) : "Paper account"}
              mode={mode}
            />
            <Separator />
            <Row label="Parameters" value={Object.entries(params).map(([k, v]) => `${k}=${String(v)}`).join(", ") || "Defaults"} />
            <Row label="Capital" value={fmtMoney(Number(capital))} />
            <Row label="Risk limits" value={`${maxPos}% pos · ${dailyLoss}% daily · ${maxOpen} open · ${killSwitch}% kill`} />
            <Row label="Account" value={selected ? `${providerLabel(selected.broker_name)} · ${selected.status}` : "Simulated"} />
          </div>
        ) : (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-profit" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {model.name} is now {mode === "paper" ? "paper" : "live"}. Monitor signals, orders and the kill switch on
              the execution dashboard.
            </p>
            <div className="flex justify-center gap-2">
              <Button
                onClick={() => {
                  onOpenChange(false);
                  void navigate({ to: "/dashboard/execution" });
                }}
              >
                Open execution dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  void navigate({ to: "/dashboard/strategies" });
                }}
              >
                My Strategies
              </Button>
            </div>
          </div>
        )}

        {current !== "pay" && current !== "done" ? (
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={goBack} disabled={idx <= (owned ? 1 : 0)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Back
            </Button>
            {current === "review" ? (
              <Button onClick={activate} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                Activate model
              </Button>
            ) : (
              <Button onClick={goNext}>
                Continue <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Button>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Chain({ model, account, mode }: { model: string; account: string; mode: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 p-3 text-xs">
      <span className="rounded bg-primary/15 px-2 py-1 text-primary">{model}</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <span className="rounded bg-chart-4/15 px-2 py-1 text-chart-4">Risk engine</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <span className="rounded bg-chart-2/15 px-2 py-1 text-chart-2">
        {account} ({mode})
      </span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6">
      <span className="text-muted-foreground">{label}</span>
      <span className="mono text-right">{value}</span>
    </div>
  );
}

function PayStep({ model }: { model: { id: string; slug: string } }) {
  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-6 text-sm">
      <p className="font-medium">Included in your subscription</p>
      <p className="text-muted-foreground">
        Marketplace strategies are unlocked by your aiAlgo plan — there are no per-strategy charges, commissions or
        performance fees. Continue to add this strategy to your workspace.
      </p>
      <p className="mono text-xs text-muted-foreground">{model.slug}</p>
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
