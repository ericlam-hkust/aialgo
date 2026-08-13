import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Cpu, Loader2, TrendingUp } from "lucide-react";
import { getContributorBilling, setComputePlan, setGpuSpendCap } from "@/lib/compute.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  COMPUTE_PLANS,
  GPU_HOURLY_RATE,
  PRO_CREATOR_THRESHOLD,
  proCreatorProgress,
  splitFor,
  usd,
  type ComputePlanKey,
} from "@/lib/monetization";

export const Route = createFileRoute("/_authenticated/dashboard/compute")({
  component: ComputeBillingPage,
  head: () => ({
    meta: [
      { title: "Compute & earnings — AlgoForge" },
      {
        name: "description",
        content: "Contributor cost console: hosted compute plans, GPU metering, commission split and payout history.",
      },
      { property: "og:title", content: "Compute & earnings — AlgoForge" },
      { property: "og:description", content: "See exactly what you pay to run models and what you keep from sales." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ComputeBillingPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["contributor-billing"], queryFn: () => getContributorBilling() });
  const [cap, setCap] = useState<string>("");

  const planMut = useMutation({
    mutationFn: (plan: ComputePlanKey) => setComputePlan({ data: { plan } }),
    onSuccess: () => {
      toast.success("Compute plan updated");
      void qc.invalidateQueries({ queryKey: ["contributor-billing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const capMut = useMutation({
    mutationFn: (value: number) => setGpuSpendCap({ data: { cap: value } }),
    onSuccess: () => {
      toast.success("GPU spend cap saved");
      void qc.invalidateQueries({ queryKey: ["contributor-billing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = q.data;
  const currentPlan = (data?.billing?.compute_plan ?? "shared_cpu") as ComputePlanKey;
  const txns = (data?.transactions ?? []) as any[];
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthGross = txns
    .filter((t) => String(t.created_at).slice(0, 7) === monthKey)
    .reduce((s, t) => s + Number(t.gross_amount ?? 0), 0);
  const split = splitFor(monthGross, monthGross);
  const progress = proCreatorProgress(monthGross);
  const computeRows = (data?.compute ?? []) as any[];
  const monthCost = computeRows
    .filter((r) => r.period === monthKey)
    .reduce((s, r) => s + Number(r.plan_cost ?? 0) + Number(r.gpu_cost ?? 0), 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Cpu className="h-5 w-5 text-primary" aria-hidden /> Compute &amp; earnings
        </h1>
        <p className="text-sm text-muted-foreground">
          What you pay to run hosted models, and what you keep from marketplace sales.
        </p>
      </header>

      {q.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Gross sales this month" value={usd(monthGross)} />
        <Stat label="Platform commission" value={usd(split.commission)} hint={`${Math.round(split.rate * 100)}% rate`} />
        <Stat label="Compute cost" value={usd(monthCost)} hint={`GPU ${usd(GPU_HOURLY_RATE)}/hr`} />
        <Stat label="Net to you" value={usd(split.net - monthCost)} tone="profit" />
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden /> Pro Creator status
          </CardTitle>
          <CardDescription>
            Cross {usd(PRO_CREATOR_THRESHOLD, 0)} in monthly gross sales and your commission drops from 20% to 15%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={Math.round(progress.pct * 100)} />
          <p className="text-xs text-muted-foreground">
            {split.proCreator
              ? `Pro Creator active — you saved ${usd(split.tierBonus)} this month.`
              : `${usd(progress.remaining)} of monthly sales to go.`}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Hosted compute plan</CardTitle>
          <CardDescription>Applies to Tier 1 listings we run inside the aiAlgo sandbox.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COMPUTE_PLANS.map((p) => (
            <div
              key={p.key}
              className={`rounded-lg border p-4 ${p.key === currentPlan ? "border-primary/60 bg-primary/5" : "border-border/70"}`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{p.name}</p>
                <Badge variant="outline">
                  {p.forKind === "both" ? "Any" : p.forKind === "algo" ? "Algo" : "AI"}
                </Badge>
              </div>
              <p className="mono mt-1 text-xl font-semibold">
                {p.price === 0 ? "Free" : usd(p.price, 2)}
                <span className="text-xs font-normal text-muted-foreground"> /{p.unit}</span>
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {p.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <Button
                className="mt-3 w-full"
                size="sm"
                variant={p.key === currentPlan ? "secondary" : "outline"}
                disabled={p.key === currentPlan || planMut.isPending}
                onClick={() => planMut.mutate(p.key)}
              >
                {p.key === currentPlan ? "Current plan" : "Switch"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">GPU spend cap</CardTitle>
          <CardDescription>
            Metered GPU jobs pause automatically once this monthly cap is reached. Current cap:{" "}
            <span className="mono">{usd(Number(data?.billing?.gpu_spend_cap ?? 0), 0)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cap">New cap (USD / month)</Label>
            <Input id="cap" type="number" min={0} value={cap} onChange={(e) => setCap(e.target.value)} className="w-40" />
          </div>
          <Button onClick={() => capMut.mutate(Number(cap))} disabled={cap === "" || capMut.isPending}>
            Save cap
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Usage history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>CPU hours</TableHead>
                <TableHead>GPU hours</TableHead>
                <TableHead>Plan cost</TableHead>
                <TableHead className="text-right">GPU cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {computeRows.map((r, i) => (
                <TableRow key={`${r.period}-${r.model_id ?? i}`}>
                  <TableCell className="mono">{r.period}</TableCell>
                  <TableCell className="mono">{Number(r.cpu_hours ?? 0).toFixed(1)}</TableCell>
                  <TableCell className="mono">{Number(r.gpu_hours ?? 0).toFixed(1)}</TableCell>
                  <TableCell className="mono">{usd(Number(r.plan_cost ?? 0))}</TableCell>
                  <TableCell className="mono text-right">{usd(Number(r.gpu_cost ?? 0))}</TableCell>
                </TableRow>
              ))}
              {computeRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No compute usage recorded yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Payout history</CardTitle>
          <CardDescription>Payouts settle automatically via Stripe Connect, net of commission and costs.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {((data?.payouts ?? []) as any[]).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="mono">{p.period}</TableCell>
                  <TableCell className="mono">{usd(Number(p.amount ?? 0))}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.status}</Badge>
                  </TableCell>
                  <TableCell className="mono text-right">
                    {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {((data?.payouts ?? []) as any[]).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No payouts yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "profit" }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={`mono text-2xl ${tone === "profit" ? "text-profit" : ""}`}>{value}</CardTitle>
      </CardHeader>
      {hint ? <CardContent className="text-xs text-muted-foreground">{hint}</CardContent> : null}
    </Card>
  );
}
