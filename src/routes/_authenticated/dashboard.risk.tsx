import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/risk")({
  component: RiskCentre,
});

const LIMITS = [
  { key: "max_position_size_pct", label: "Max position size", max: 50, help: "Largest share of capital in one position." },
  { key: "max_daily_loss_pct", label: "Max daily loss", max: 20, help: "Trading halts once this daily loss is hit." },
  { key: "max_drawdown_pct", label: "Max drawdown", max: 50, help: "Strategies stop if equity falls this far from its peak." },
  { key: "max_correlated_exposure_pct", label: "Max correlated exposure", max: 100, help: "Cap on capital in one sector or correlated basket." },
] as const;

type Settings = Record<(typeof LIMITS)[number]["key"], number>;

function RiskCentre() {
  const qc = useQueryClient();
  const [values, setValues] = useState<Settings>({
    max_position_size_pct: 10,
    max_daily_loss_pct: 4,
    max_drawdown_pct: 20,
    max_correlated_exposure_pct: 35,
  });
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["risk"],
    queryFn: async () => {
      const [settings, events] = await Promise.all([
        supabase.from("risk_settings").select("*").maybeSingle(),
        supabase.from("risk_events").select("*").order("triggered_at", { ascending: false }).limit(20),
      ]);
      return { settings: settings.data, events: events.data ?? [] };
    },
  });

  useEffect(() => {
    if (data?.settings) {
      setValues({
        max_position_size_pct: Number(data.settings.max_position_size_pct),
        max_daily_loss_pct: Number(data.settings.max_daily_loss_pct),
        max_drawdown_pct: Number(data.settings.max_drawdown_pct),
        max_correlated_exposure_pct: Number(data.settings.max_correlated_exposure_pct),
      });
    }
  }, [data?.settings]);

  const save = async () => {
    setSaving(true);
    const uid = (await supabase.auth.getUser()).data.user?.id ?? "";
    const { error } = await supabase
      .from("risk_settings")
      .upsert({ user_id: uid, ...values }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Risk limits updated");
    qc.invalidateQueries({ queryKey: ["risk"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Risk centre</h1>
        <p className="text-sm text-muted-foreground">
          Hard limits applied to every strategy you deploy to the paper desk.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Limits</CardTitle>
            <CardDescription>Changes apply to new signals immediately.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {LIMITS.map((limit) => (
              <div key={limit.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={limit.key}>{limit.label}</Label>
                  <span className="mono text-sm">{values[limit.key]}%</span>
                </div>
                <Slider
                  id={limit.key}
                  min={1}
                  max={limit.max}
                  step={1}
                  value={[values[limit.key]]}
                  onValueChange={([v]) => setValues((s) => ({ ...s, [limit.key]: v ?? 1 }))}
                />
                <p className="text-xs text-muted-foreground">{limit.help}</p>
              </div>
            ))}
            <Button onClick={save} disabled={saving} className="w-full">
              Save limits
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Risk event log</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.events.length ?? 0) === 0 ? (
              <EmptyState
                icon={<ShieldCheck className="h-6 w-6" aria-hidden />}
                title="No breaches recorded"
                description="Every time a limit stops a trade, it is logged here with full context."
              />
            ) : (
              <ul className="divide-y divide-border text-sm">
                {data!.events.map((e) => (
                  <li key={e.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={e.severity === "critical" ? "destructive" : "secondary"}>
                        {e.event_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{fmtDate(e.triggered_at)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{e.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
