import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Download, ServerCog, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CONSUMER_PLANS,
  CONTRIBUTOR_PROMISE,
  NO_COMMISSION_PROMISE,
  PLATFORM_DISCLAIMER,
  RISK_DISCLOSURE,
  SELF_HOSTED_PROMISE,
  UPDATE_CONSENT_PROMISE,
} from "@/lib/monetization";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — subscription only, no commissions | aiAlgo" },
      {
        name: "description",
        content:
          "aiAlgo pricing: Starter free, Pro $29/month, Elite/Team $99/month. Subscriptions only — no commissions, per-trade charges or performance fees.",
      },
      { property: "og:title", content: "Pricing — aiAlgo" },
      {
        property: "og:description",
        content: "Starter free, Pro $29/mo, Elite/Team $99/mo. Strategy-building software you run on your own infrastructure.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

const GUARANTEES = [
  { icon: ShieldCheck, title: "No commissions, ever", body: NO_COMMISSION_PROMISE },
  { icon: ServerCog, title: "You own the execution", body: SELF_HOSTED_PROMISE },
  { icon: Download, title: "Updates on your terms", body: UPDATE_CONSENT_PROMISE },
];

function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <header className="max-w-2xl">
        <Badge variant="secondary">Pricing</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Subscription only. No commissions, no per-trade fees.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          aiAlgo is strategy-building software. You pay for the builder, the backtesting data and the release pipeline —
          never for the trades your own deployment places.
        </p>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        {CONSUMER_PLANS.map((plan) => (
          <Card key={plan.key} className={plan.key === "pro" ? "border-primary/60 shadow-[var(--shadow-glow)]" : undefined}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {plan.key === "pro" ? (
                  <Badge>Most popular</Badge>
                ) : plan.key === "free" ? (
                  <Badge variant="secondary">Always free</Badge>
                ) : (
                  <Badge variant="outline">Teams</Badge>
                )}
              </div>
              <CardDescription>{plan.blurb}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mono text-3xl font-semibold">
                ${plan.monthly}
                <span className="ml-1 text-sm font-normal text-muted-foreground">/ month</span>
              </p>
              {plan.annual > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">or ${plan.annual}/year — two months free</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">No card required</p>
              )}
              <ul className="mt-5 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-profit" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full" variant={plan.key === "pro" ? "default" : "outline"}>
                <Link to="/auth/register">{plan.key === "free" ? "Start free" : `Choose ${plan.name}`}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {GUARANTEES.map((g) => (
          <Card key={g.title} className="border-border/70 bg-card/70">
            <CardContent className="p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <g.icon className="h-4 w-4" aria-hidden />
              </div>
              <h2 className="text-sm font-semibold">{g.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{g.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-12">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">What happens if I cancel?</CardTitle>
            <CardDescription>
              Your deployed package keeps running its current version on your own infrastructure — it is yours. Updates,
              new templates, cloud deploy and monitoring pause until you renew.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>{CONTRIBUTOR_PROMISE}</p>
            <p>{PLATFORM_DISCLAIMER}</p>
            <p>{RISK_DISCLOSURE}</p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
