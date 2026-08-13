import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { submitModel, type ModelDraft } from "@/lib/contributor.functions";
import { submitForValidation } from "@/lib/backtest-validation.functions";
import { BacktestConfigForm, emptyBacktestConfig } from "@/components/marketplace/backtest-config-form";
import { InterfaceDefinitionStep } from "@/components/marketplace/interface-step";
import { emptyManifest, type InterfaceManifest } from "@/lib/model-interface";
import type { BacktestConfig } from "@/lib/backtest-protocol";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { fmtMoney } from "@/lib/format";
import {
  ASSET_CLASSES,
  PLATFORM_COMMISSION,
  PRICING_MODELS,
  RISK_LEVELS,
  STRATEGY_TYPES,
  SUBMISSION_PIPELINE,
  TIMEFRAMES,
  type AssetClass,
  type ModelPricingModel,
  type ModelRiskLevel,
  type ModelStrategyType,
} from "@/lib/marketplace";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/models/new")({
  component: UploadWizard,
});

const STEPS = ["Metadata", "Package", "Interface", "Pricing", "Backtest", "Review"] as const;

function UploadWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [config, setConfig] = useState<BacktestConfig>(emptyBacktestConfig());
  const [manifest, setManifest] = useState<InterfaceManifest>(() => emptyManifest());
  const [draft, setDraft] = useState<ModelDraft>({
    name: "",
    slug: "",
    tagline: "",
    description: "",
    riskDisclosure: "",
    tags: [],
    assetClass: "stocks",
    strategyType: "momentum",
    timeframe: "1d",
    riskLevel: "medium",
    packageKind: "api",
    apiEndpoint: "",
    apiAuthToken: "",
    packagePath: "",
    parameters: [{ name: "lookback", type: "number", default: "20", min: "5", max: "200", description: "Lookback bars" }],
    pricingModel: "subscription",
    price: 199,
  });
  const set = <K extends keyof ModelDraft>(k: K, v: ModelDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const submit = useMutation({
    mutationFn: async () => {
      const model = await submitModel({ data: { ...draft, manifest } });
      await submitForValidation({ data: { modelId: model.id, config } });
      return model;
    },
    onSuccess: () => {
      toast.success("Submitted — platform backtest validation started");
      setSubmitted(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-profit" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight">{draft.name} submitted</h1>
        <div className="space-y-3 text-left">
          {SUBMISSION_PIPELINE.map((s, i) => (
            <div key={s.status} className="flex items-start gap-3 rounded-md border border-border/70 p-3">
              {i === 0 ? (
                <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-primary" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
              )}
              <div>
                <div className="text-sm font-medium">{s.label}</div>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={() => void navigate({ to: "/dashboard/models/backtests" })}>Track validation progress</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Submit a model</h1>
        <p className="text-sm text-muted-foreground">Six steps. You can edit everything before the final submit.</p>
      </div>

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s}>
            <Badge variant={i === step ? "default" : i < step ? "secondary" : "outline"}>
              {i + 1}. {s}
            </Badge>
          </li>
        ))}
      </ol>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">{STEPS[step]}</CardTitle>
          <CardDescription>
            {
              [
                "Tell buyers what the model does and who it is for.",
                "Register a live API endpoint or upload a model package.",
                "Declare your data inputs, tunable parameters and signal output contract.",
                "Choose how you charge. Platform commission is 20%.",
                "Declare what your model trades and confirm the platform holds the data it needs.",
                "Review everything before submitting for validation.",
              ][step]
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Model name" value={draft.name} onChange={(v) => set("name", v)} />
                <Field label="Slug" value={draft.slug} onChange={(v) => set("slug", v)} mono />
              </div>
              <Field label="Tagline" value={draft.tagline} onChange={(v) => set("tagline", v)} />
              <div className="space-y-1.5">
                <Label>Description (markdown)</Label>
                <Textarea rows={6} value={draft.description} onChange={(e) => set("description", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Risk disclosure</Label>
                <Textarea rows={3} value={draft.riskDisclosure} onChange={(e) => set("riskDisclosure", e.target.value)} />
              </div>
              <Field
                label="Tags (comma separated)"
                value={draft.tags.join(", ")}
                onChange={(v) => set("tags", v.split(",").map((t) => t.trim()).filter(Boolean))}
              />
              <div className="grid gap-3 sm:grid-cols-4">
                <Picker
                  label="Asset class"
                  value={draft.assetClass}
                  onChange={(v) => set("assetClass", v as AssetClass)}
                  options={ASSET_CLASSES}
                />
                <Picker
                  label="Strategy"
                  value={draft.strategyType}
                  onChange={(v) => set("strategyType", v as ModelStrategyType)}
                  options={STRATEGY_TYPES}
                />
                <Picker
                  label="Timeframe"
                  value={draft.timeframe}
                  onChange={(v) => set("timeframe", v)}
                  options={TIMEFRAMES.map((t) => ({ value: t, label: t }))}
                />
                <Picker
                  label="Risk level"
                  value={draft.riskLevel}
                  onChange={(v) => set("riskLevel", v as ModelRiskLevel)}
                  options={RISK_LEVELS}
                />
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Picker
                label="Delivery"
                value={draft.packageKind}
                onChange={(v) => set("packageKind", v as "api" | "package")}
                options={[
                  { value: "api", label: "Register an API endpoint" },
                  { value: "package", label: "Upload a model package" },
                ]}
              />
              {draft.packageKind === "api" ? (
                <>
                  <Field
                    label="Signal endpoint URL"
                    value={draft.apiEndpoint ?? ""}
                    onChange={(v) => set("apiEndpoint", v)}
                    mono
                  />
                  <Field
                    label="Auth token (encrypted at rest)"
                    value={draft.apiAuthToken ?? ""}
                    onChange={(v) => set("apiAuthToken", v)}
                    type="password"
                  />
                </>
              ) : (
                <Field
                  label="Package reference / storage path"
                  value={draft.packagePath ?? ""}
                  onChange={(v) => set("packagePath", v)}
                  mono
                />
              )}
            </>
          ) : null}

          {step === 2 ? <InterfaceDefinitionStep value={manifest} onChange={setManifest} /> : null}

          {step === 3 ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Picker
                  label="Pricing model"
                  value={draft.pricingModel}
                  onChange={(v) => set("pricingModel", v as ModelPricingModel)}
                  options={PRICING_MODELS.map((p) => ({ value: p.value, label: p.label }))}
                />
                <Field
                  label="Price (HK$)"
                  value={String(draft.price)}
                  onChange={(v) => set("price", Number(v) || 0)}
                  mono
                />
              </div>
              <div className="rounded-md border border-border/70 bg-muted/30 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Buyer pays</span>
                  <span className="mono">{fmtMoney(draft.price)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Platform commission (20%)</span>
                  <span className="mono text-loss">-{fmtMoney(draft.price * PLATFORM_COMMISSION)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>You receive</span>
                  <span className="mono text-profit">{fmtMoney(draft.price * (1 - PLATFORM_COMMISSION))}</span>
                </div>
              </div>
            </>
          ) : null}

          {step === 4 ? <BacktestConfigForm value={config} onChange={setConfig} /> : null}

          {step === 5 ? (
            <div className="space-y-2 text-sm">
              <Summary label="Name" value={draft.name} />
              <Summary label="Slug" value={draft.slug} />
              <Summary label="Asset / strategy" value={`${draft.assetClass} · ${draft.strategyType}`} />
              <Summary label="Timeframe / risk" value={`${draft.timeframe} · ${draft.riskLevel}`} />
              <Summary label="Delivery" value={draft.packageKind === "api" ? draft.apiEndpoint || "API" : draft.packagePath || "Package"} />
              <Summary label="Instruments" value={manifest.instruments.join(", ") || "—"} />
              <Summary label="Parameters" value={manifest.parameters.map((p) => p.label || p.key).filter(Boolean).join(", ") || "—"} />
              <Summary label="Output contract" value={manifest.outputConfirmed ? "Confirmed" : "Not confirmed"} />
              <Summary label="Pricing" value={`${draft.pricingModel} · ${fmtMoney(draft.price)}`} />
              <Summary label="Universe" value={config.universe.join(", ") || "—"} />
              <Summary label="Backtest inputs" value={`${config.timeframe} · ${config.signalFrequency} · ${config.dataInputs.join(", ")}`} />
              <Summary label="Minimum capital" value={fmtMoney(config.minimumCapital, "USD")} />
            </div>
          ) : null}

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)}>
                Continue <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Button>
            ) : (
              <Button onClick={() => submit.mutate()} disabled={submit.isPending || config.universe.length === 0}>
                {submit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                Submit for validation
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  mono,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input className={cn(mono && "mono")} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Picker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right">{value}</span>
    </div>
  );
}
