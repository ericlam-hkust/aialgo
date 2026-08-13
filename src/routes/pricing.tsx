import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Gift, ShieldCheck, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BASE_COMMISSION,
  BATCH_RULE_COPY,
  CONSUMER_PLANS,
  CONTRIBUTOR_PROMISE,
  FEE_DISCLOSURE,
  MICRO_PROFIT_THRESHOLD,
  PLATFORM_DISCLAIMER,
  RISK_DISCLOSURE,
  WATERMARK_EXAMPLE,
  computeFee,
  usd,
} from "@/lib/monetization";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — $12/mo to trade live, fees only on winning trades" },
      {
        name: "description",
        content:
          "aiAlgo is free to browse and paper trade. Live execution is $12/month, plus a performance fee charged only on profitable closed trades.",
      },
      { property: "og:title", content: "Pricing — aiAlgo" },
      {
        property: "og:description",
        content: "Free forever for creators. $12/month for live execution plus per-trade performance fees on wins only.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const [profit, setProfit] = useState(50);
  const [feePct, setFeePct] = useState(15);
  const [cumulative, setCumulative] = useState(0);
  const outcome = computeFee({ netProfit: profit, feePct, cumulativePnlBefore: cumulative });

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <header className="max-w-2xl">
        <Badge variant="secondary">Pricing</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Free to build. $12 to go live. Fees only when you win.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Contributors are never charged. Traders pay a low monthly subscription for live execution, plus a
          performance fee on each profitable closed trade — never on losses.
        </p>
      </header>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        {CONSUMER_PLANS.map((plan) => (
          <Card key={plan.key} className={plan.key === "basic" ? "border-primary/60" : undefined}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {plan.key === "basic" ? <Badge>Live execution</Badge> : <Badge variant="secondary">Always free</Badge>}
              </div>
              <CardDescription>{plan.blurb}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mono text-3xl font-semibold">
                {plan.monthly === 0 ? "$0" : `$${plan.monthly}`}
                <span className="ml-1 text-sm font-normal text-muted-foreground">/ month</span>
              </p>
              {plan.annual > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">or ${plan.annual}/year — two months free</p>
              ) : null}
              <ul className="mt-4 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-profit" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-5 w-full" variant={plan.key === "basic" ? "default" : "outline"}>
                <Link to="/dashboard/billing">{plan.key === "basic" ? "Go live for $12" : "Start free"}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Performance fees, explained</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Only on winning trades</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Each creator sets a 5–25% fee on the profit of a closed trade. Losing trades cost nothing. Profits under
              ${MICRO_PROFIT_THRESHOLD} are always exempt.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cumulative watermark</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{WATERMARK_EXAMPLE}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Batched charges</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{BATCH_RULE_COPY}</CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Fee calculator</CardTitle>
            <CardDescription>See exactly what a trade would cost you.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <div>
              <Label htmlFor="profit">Trade profit ($)</Label>
              <Input id="profit" type="number" value={profit} onChange={(e) => setProfit(Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="fee">Creator fee (%)</Label>
              <Input id="fee" type="number" value={feePct} onChange={(e) => setFeePct(Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="cum">Cumulative P&amp;L before ($)</Label>
              <Input id="cum" type="number" value={cumulative} onChange={(e) => setCumulative(Number(e.target.value))} />
            </div>
            <div className="rounded-md border border-border/60 bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">You pay</div>
              <div className="mono text-2xl font-semibold">{usd(outcome.fee)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {outcome.feeable
                  ? `Creator ${usd(outcome.contributor)} · platform ${usd(outcome.platform)}`
                  : outcome.exemptReason}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-2">
        <Card className="border-profit/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="h-4 w-4 text-profit" aria-hidden /> Free for creators, forever
            </CardTitle>
            <CardDescription>{CONTRIBUTOR_PROMISE}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/creators">See creator economics</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" aria-hidden /> How we make money
            </CardTitle>
            <CardDescription>
              $12/month for live execution plus {Math.round(BASE_COMMISSION * 100)}% of the per-trade fees. If models
              and algos don&apos;t win trades, we earn nothing from fees.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/how-we-make-money">Read the full breakdown</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mt-12 space-y-2 rounded-lg border border-border/60 bg-muted/20 p-5 text-xs text-muted-foreground">
        <p className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {FEE_DISCLOSURE}
        </p>
        <p>{RISK_DISCLOSURE}</p>
        <p>{PLATFORM_DISCLAIMER}</p>
      </section>
    </main>
  );
}
