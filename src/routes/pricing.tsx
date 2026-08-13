import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Cpu, Radio, ShieldCheck, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BASE_COMMISSION,
  COMPUTE_PLANS,
  CONSUMER_PLANS,
  GPU_HOURLY_RATE,
  HFT_TIER_JUSTIFICATION,
  PLATFORM_DISCLAIMER,
  PRO_CREATOR_COMMISSION,
  PRO_CREATOR_THRESHOLD,
  RISK_DISCLOSURE,
  SIGNAL_PLANS,
  projectEarnings,
  usd,
} from "@/lib/monetization";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — aiAlgo trading model marketplace" },
      {
        name: "description",
        content:
          "Free to explore, $49/mo to trade live. Contributors pay only for compute or gateway access and keep 80-85% of every sale.",
      },
      { property: "og:title", content: "Pricing — aiAlgo trading model marketplace" },
      {
        property: "og:description",
        content: "Consumer plans, contributor compute pricing, Signal Gateway tiers and the aiAlgo revenue split.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const [subs, setSubs] = useState(50);
  const [price, setPrice] = useState(29);
  const [computeCost, setComputeCost] = useState(99);
  const projection = projectEarnings({ subscribers: subs, pricePerMonth: price, computeCost });

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <header className="max-w-2xl">
        <Badge variant="secondary">Pricing</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Free to explore. Pay when you trade or earn.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Traders subscribe for live execution. Contributors pay only for the compute or gateway capacity they use, and
          keep {Math.round((1 - BASE_COMMISSION) * 100)}% of every sale — {Math.round((1 - PRO_CREATOR_COMMISSION) * 100)}%
          once they pass {usd(PRO_CREATOR_THRESHOLD, 0)} in monthly gross.
        </p>
      </header>

      <Tabs defaultValue="traders" className="mt-8">
        <TabsList>
          <TabsTrigger value="traders">For traders</TabsTrigger>
          <TabsTrigger value="contributors">For contributors</TabsTrigger>
        </TabsList>

        <TabsContent value="traders" className="mt-6 space-y-8">
          <div className="grid gap-4 md:grid-cols-3">
            {CONSUMER_PLANS.map((plan) => (
              <Card key={plan.key} className={plan.key === "pro" ? "border-primary/60" : "border-border/70"}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.key === "pro" ? <Badge>Most popular</Badge> : null}
                  </div>
                  <p className="mono text-3xl font-semibold">
                    {plan.monthly === 0 ? "Free" : usd(plan.monthly, 0)}
                    {plan.monthly ? <span className="text-sm font-normal text-muted-foreground"> / month</span> : null}
                  </p>
                  <CardDescription>{plan.blurb}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-profit" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full" variant={plan.key === "pro" ? "default" : "outline"}>
                    <Link to="/dashboard/billing">{plan.monthly === 0 ? "Start free" : `Choose ${plan.name}`}</Link>
                  </Button>
                  {plan.annual ? (
                    <p className="text-center text-xs text-muted-foreground">or {usd(plan.annual, 0)} billed yearly</p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> What you never pay for
              </CardTitle>
              <CardDescription>
                Browsing, backtesting in the sandbox, paper trading and comparing models stay free on every plan. We only
                charge for live execution capacity, premium data and marketplace sales.
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="contributors" className="mt-6 space-y-8">
          <section>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Cpu className="h-4 w-4 text-primary" aria-hidden /> Tier 1 — platform-hosted compute
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your code runs in the aiAlgo sandbox on our data feeds. Hosted listings are Platform Verified because we
              execute them ourselves.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {COMPUTE_PLANS.map((plan) => (
                <Card key={plan.key} className="border-border/70">
                  <CardHeader>
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <p className="mono text-2xl font-semibold">
                      {plan.price === 0 ? "Free" : usd(plan.price, 2)}
                      <span className="text-sm font-normal text-muted-foreground"> / {plan.unit}</span>
                    </p>
                    <CardDescription>
                      {plan.forKind === "algo" ? "Traditional algos" : plan.forKind === "ai_model" ? "AI / ML models" : "Any listing"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {plan.features.map((f) => (
                        <li key={f}>· {f}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Radio className="h-4 w-4 text-primary" aria-hidden /> Tier 2 — Signal Gateway (remote models)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Run the model on your own infrastructure — typically colocated near the exchange — and stream signals to
              our gateway. We timestamp every signal, which is what earns the Live Verified badge after 90 days.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {SIGNAL_PLANS.map((plan) => (
                <Card key={plan.key} className={plan.hftOnly ? "border-primary/60" : "border-border/70"}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      {plan.hftOnly ? (
                        <Badge className="gap-1">
                          <Zap className="h-3 w-3" aria-hidden /> HFT
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mono text-2xl font-semibold">
                      {plan.price === 0 ? "Usage-based" : `${usd(plan.price, 0)} / month`}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {plan.features.map((f) => (
                        <li key={f}>· {f}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{HFT_TIER_JUSTIFICATION}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Revenue split</h2>
            <Card className="mt-3 border-border/70">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Monthly gross sales</TableHead>
                      <TableHead>You keep</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead className="text-right">Applies to</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Under {usd(PRO_CREATOR_THRESHOLD, 0)}</TableCell>
                      <TableCell className="mono text-profit">80%</TableCell>
                      <TableCell className="mono">20%</TableCell>
                      <TableCell className="text-right text-muted-foreground">AI models, algos, remote HFT</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{usd(PRO_CREATOR_THRESHOLD, 0)}+ (Pro Creator)</TableCell>
                      <TableCell className="mono text-profit">85%</TableCell>
                      <TableCell className="mono">15%</TableCell>
                      <TableCell className="text-right text-muted-foreground">AI models, algos, remote HFT</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Earnings calculator</h2>
            <Card className="mt-3 border-border/70">
              <CardContent className="grid gap-4 p-5 md:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="subs">Subscribers</Label>
                  <Input id="subs" type="number" min={0} value={subs} onChange={(e) => setSubs(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="price">Price / month (USD)</Label>
                  <Input id="price" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="compute">Compute cost / month</Label>
                  <Input
                    id="compute"
                    type="number"
                    min={0}
                    value={computeCost}
                    onChange={(e) => setComputeCost(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground">GPU metered at {usd(GPU_HOURLY_RATE)} / hour</p>
                </div>
                <div className="rounded-md border border-border/70 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Projected monthly take-home</p>
                  <p className="mono text-2xl font-semibold text-profit">{usd(projection.projected)}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Gross {usd(projection.gross)} · commission {usd(projection.commission)} ({Math.round(projection.rate * 100)}%) ·
                    costs {usd(projection.costs)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>
      </Tabs>

      <footer className="mt-12 space-y-2 border-t border-border/60 pt-6 text-xs text-muted-foreground">
        <p>{PLATFORM_DISCLAIMER}</p>
        <p>{RISK_DISCLOSURE}</p>
        <p>
          Learn how listings are verified on the{" "}
          <Link to="/models/verification" className="text-primary underline-offset-2 hover:underline">
            verification page
          </Link>
          .
        </p>
      </footer>
    </main>
  );
}
