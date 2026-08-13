import { createFileRoute, Link } from "@tanstack/react-router";
import { Coins, HandCoins, Handshake, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BASE_COMMISSION,
  BASIC_MONTHLY,
  FEE_DISCLOSURE,
  PLATFORM_DISCLAIMER,
  RISK_DISCLOSURE,
  WATERMARK_EXAMPLE,
} from "@/lib/monetization";

export const Route = createFileRoute("/how-we-make-money")({
  head: () => ({
    meta: [
      { title: "How aiAlgo makes money — aligned incentives" },
      {
        name: "description",
        content:
          "aiAlgo earns $12/month for live execution plus 20% of the per-trade performance fees. If models and algos don't win trades, we earn nothing from fees.",
      },
      { property: "og:title", content: "How aiAlgo makes money" },
      { property: "og:description", content: "$12/month + 20% of per-trade fees. No fees on losing trades — incentives aligned." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowWeMakeMoneyPage,
});

const STREAMS = [
  {
    icon: Coins,
    title: `Basic subscription — $${BASIC_MONTHLY}/month`,
    body: "The only platform subscription. It unlocks live execution, real-time data and API access. Browsing, paper trading and sandbox backtests stay free forever.",
    primary: true,
  },
  {
    icon: HandCoins,
    title: `${Math.round(BASE_COMMISSION * 100)}% of per-trade performance fees`,
    body: "Creators set a 5–25% fee on the profit of each winning closed trade. We take 20% of that fee (15% for Pro Creators); the creator keeps the rest. Losing trades generate nothing for anyone.",
    primary: true,
  },
  {
    icon: Handshake,
    title: "Broker referrals — disclosed",
    body: "aiAlgo may receive referral compensation from broker partners. This never influences broker rankings, and every partner offer is labelled on the Connected Accounts page.",
    primary: false,
  },
  {
    icon: Megaphone,
    title: "Promoted listings — labelled, never ranked",
    body: "Optional paid visibility open to both AI model and algo creators. Promoted placements are always labelled and never change search ranking or leaderboard order.",
    primary: false,
  },
];

function HowWeMakeMoneyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <header className="max-w-2xl">
        <Badge variant="secondary">Transparency</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">How we make money</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          ${BASIC_MONTHLY}/month for live execution + {Math.round(BASE_COMMISSION * 100)}% of the per-trade fees. If
          models and algos don&apos;t win trades, we earn nothing from fees — our incentives are aligned with yours.
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {STREAMS.map((s) => (
          <Card key={s.title} className={s.primary ? "border-primary/50" : undefined}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <s.icon className="h-4 w-4 text-primary" aria-hidden /> {s.title}
              </CardTitle>
              <CardDescription>{s.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">What we never charge for</h2>
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {[
            "Listing an AI model or an algo strategy",
            "Platform compute — hosted inference and hosted execution",
            "Unlimited live execution and signal delivery to subscribers",
            "The validation backtest pipeline and re-validation",
            "Paper trading, on every listing, forever",
            "Losing trades — no fee, ever",
          ].map((item) => (
            <li key={item} className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded-lg border border-border/60 bg-card/60 p-6">
        <h2 className="text-lg font-semibold tracking-tight">A worked example</h2>
        <p className="mt-2 text-sm text-muted-foreground">{WATERMARK_EXAMPLE}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          On that $7.50 fee, the creator receives $6.00 and aiAlgo receives $1.50.
        </p>
        <div className="mt-4 flex gap-2">
          <Button asChild>
            <Link to="/pricing">See pricing</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/creators">Free for creators</Link>
          </Button>
        </div>
      </section>

      <section className="mt-10 space-y-2 text-xs text-muted-foreground">
        <p>{FEE_DISCLOSURE}</p>
        <p>{RISK_DISCLOSURE}</p>
        <p>{PLATFORM_DISCLAIMER}</p>
      </section>
    </main>
  );
}
