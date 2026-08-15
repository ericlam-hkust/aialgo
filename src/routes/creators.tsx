import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Check, LineChart, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CONTRIBUTOR_PROMISE,
  NO_COMMISSION_PROMISE,
  PLATFORM_DISCLAIMER,
  RISK_DISCLOSURE,
  UPDATE_CONSENT_PROMISE,
} from "@/lib/monetization";

export const Route = createFileRoute("/creators")({
  head: () => ({
    meta: [
      { title: "Publish templates and models — aiAlgo for creators" },
      {
        name: "description",
        content:
          "Share algo templates and AI models with the aiAlgo community library. Listing is free and aiAlgo never takes a share of anyone's trades.",
      },
      { property: "og:title", content: "Publish templates and models — aiAlgo for creators" },
      { property: "og:description", content: "Free listings, versioned releases, no commissions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreatorsPage,
});

const FREE_ITEMS = [
  "Unlimited public algo templates and AI model listings",
  "Platform backtest validation and walk-forward reports",
  "Versioned releases with changelogs and signed packages",
  "Community profile, reviews and verified-usage badges",
  "No listing fee, no hosting fee, no revenue share",
];

const KINDS = [
  {
    icon: LineChart,
    title: "Algo templates",
    body: "Publish rule-based strategies built in the visual builder or the code editor. Subscribers clone them into their own workspace and run them on their own infrastructure.",
  },
  {
    icon: Brain,
    title: "AI models",
    body: "Publish models and fine-tunes with a documented interface manifest, resource limits and lineage back to the base model they came from.",
  },
  {
    icon: Share2,
    title: "Versioned releases",
    body: "Every update ships as a signed release. Subscribers see a diff and approve any change to strategy logic before it goes live on their machine.",
  },
];

function CreatorsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <header className="max-w-2xl">
        <Badge variant="secondary">For creators</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Share your strategies. Keep everything you build.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{CONTRIBUTOR_PROMISE}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/auth/register">Start publishing</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/marketplace">Browse the library</Link>
          </Button>
        </div>
      </header>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {KINDS.map((k) => (
          <Card key={k.title} className="border-border/70 bg-card/70">
            <CardContent className="p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <k.icon className="h-4 w-4" aria-hidden />
              </div>
              <h2 className="text-sm font-semibold">{k.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{k.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Always free for creators</CardTitle>
            <CardDescription>{NO_COMMISSION_PROMISE}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {FREE_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-profit" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">How your work reaches traders</CardTitle>
            <CardDescription>{UPDATE_CONSENT_PROMISE}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Traders subscribe to aiAlgo, clone your template or model, backtest it themselves, then download a
              self-hosted package that runs on hardware they control. aiAlgo never routes an order and never holds a
              broker credential — so no one is trading on anyone's behalf.
            </p>
            <p className="text-xs">{PLATFORM_DISCLAIMER}</p>
            <p className="text-xs">{RISK_DISCLOSURE}</p>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/pricing">See subscription plans</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
