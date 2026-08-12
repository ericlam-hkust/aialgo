import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type RiskTolerance = Database["public"]["Enums"]["risk_tolerance"];

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const EXPERIENCE = [
  { id: "new", label: "New to trading", body: "I want guided templates and plain-English explanations." },
  { id: "intermediate", label: "Some experience", body: "I know indicators and want to test my own ideas." },
  { id: "advanced", label: "Experienced", body: "I want full control over entries, exits and risk rules." },
];

const RISK: { id: RiskTolerance; label: string; body: string }[] = [
  { id: "conservative", label: "Conservative", body: "Small positions, tight stops, capital preservation first." },
  { id: "moderate", label: "Moderate", body: "Balanced sizing with sensible drawdown limits." },
  { id: "aggressive", label: "Aggressive", body: "Larger positions and wider stops to chase bigger moves." },
];

const MARKETS = [
  { id: "HK", label: "Hong Kong", body: "0700.HK, 9988.HK, 3690.HK, 2318.HK, 0005.HK" },
  { id: "US", label: "United States", body: "AAPL, TSLA, SPY, QQQ" },
  { id: "BOTH", label: "Both markets", body: "Trade and diversify across HK and US names" },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState("new");
  const [risk, setRisk] = useState<RiskTolerance>("moderate");
  const [market, setMarket] = useState("BOTH");
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setSaving(false);
      toast.error("Session expired. Please sign in again.");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ risk_tolerance: risk, onboarding_completed: true })
      .eq("id", uid);

    if (!error) {
      const pct = risk === "conservative" ? 5 : risk === "aggressive" ? 20 : 10;
      await supabase.from("risk_settings").upsert(
        {
          user_id: uid,
          max_position_size_pct: pct,
          max_daily_loss_pct: risk === "aggressive" ? 8 : risk === "conservative" ? 2 : 4,
          max_drawdown_pct: risk === "aggressive" ? 30 : risk === "conservative" ? 10 : 20,
          max_correlated_exposure_pct: risk === "aggressive" ? 60 : 35,
        },
        { onConflict: "user_id" },
      );
    }
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Workspace ready");
    navigate({ to: "/dashboard" });
  };

  const steps = [
    {
      title: "How much trading experience do you have?",
      description: "This tunes how much explanation we show alongside each strategy.",
      options: EXPERIENCE,
      value: experience,
      set: (v: string) => setExperience(v),
    },
    {
      title: "What is your risk tolerance?",
      description: "We use this to pre-fill your position sizing and drawdown limits.",
      options: RISK,
      value: risk,
      set: (v: string) => setRisk(v as RiskTolerance),
    },
    {
      title: "Which markets do you follow?",
      description: "You can change this at any time — every symbol stays available.",
      options: MARKETS,
      value: market,
      set: (v: string) => setMarket(v),
    },
  ];

  const activeStep = steps[step]!;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-xl">
        <Progress value={((step + 1) / steps.length) * 100} className="mb-8 h-1.5" />
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardDescription>
              Step {step + 1} of {steps.length}
            </CardDescription>
            <CardTitle className="text-xl">{activeStep.title}</CardTitle>
            <CardDescription>{activeStep.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeStep.options.map((opt) => {
              const selected = activeStep.value === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => activeStep.set(opt.id)}
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border",
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                    )}
                  >
                    {selected ? <Check className="h-3 w-3" aria-hidden /> : null}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{opt.label}</span>
                    <span className="block text-xs text-muted-foreground">{opt.body}</span>
                  </span>
                </button>
              );
            })}

            <div className="flex justify-between pt-4">
              <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
                Back
              </Button>
              {step < steps.length - 1 ? (
                <Button onClick={() => setStep(step + 1)}>
                  Continue <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                </Button>
              ) : (
                <Button onClick={finish} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                  Enter AlgoForge
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
