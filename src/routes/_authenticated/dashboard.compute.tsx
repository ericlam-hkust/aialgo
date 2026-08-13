import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Cpu, Gift, Loader2, TrendingUp } from "lucide-react";
import { getContributorBilling } from "@/lib/compute.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CONTRIBUTOR_FREE_ITEMS,
  PRO_CREATOR_THRESHOLD,
  proCreatorProgress,
  splitFor,
  usd,
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
  const q = useQuery({ queryKey: ["contributor-billing"], queryFn: () => getContributorBilling() });


  const data = q.data;
  const txns = (data?.transactions ?? []) as any[];
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthGross = txns
    .filter((t) => String(t.created_at).slice(0, 7) === monthKey)
    .reduce((s, t) => s + Number(t.gross_amount ?? 0), 0);
  const split = splitFor(monthGross, monthGross);
  const progress = proCreatorProgress(monthGross);
  const computeRows = (data?.compute ?? []) as any[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Cpu className="h-5 w-5 text-primary" aria-hidden /> Compute &amp; earnings
        </h1>
        <p className="text-sm text-muted-foreground">
          Hosted compute is free for every contributor. This console shows your usage and what you keep from
          performance fees.
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
        <Stat label="Compute cost" value="$0.00" hint="Free for all contributors" />
        <Stat label="Net to you" value={usd(split.net)} tone="profit" />
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden /> Pro Creator status
          </CardTitle>
          <CardDescription>
            Cross {usd(PRO_CREATOR_THRESHOLD, 0)} in collected performance fees in a month and your commission drops
            from 20% to 15%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={Math.round(progress.pct * 100)} />
          <p className="text-xs text-muted-foreground">
            {split.proCreator
              ? `Pro Creator active — you saved ${usd(split.tierBonus)} this month.`
              : `${usd(progress.remaining)} of collected fees to go.`}
          </p>
        </CardContent>
      </Card>

      <Card className="border-profit/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4 text-profit" aria-hidden /> Free for creators, forever
          </CardTitle>
          <CardDescription>
            No listing fees, no compute fees, no gateway fees — for AI models and algo strategies alike. The platform
            earns only when you earn.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CONTRIBUTOR_FREE_ITEMS.map((item) => (
            <div key={item.key} className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.label}</span>
                <Badge variant="outline" className="mono border-profit/50 text-profit">
                  $0
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
            </div>
          ))}
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
