import { createFileRoute, Link } from "@tanstack/react-router";
import { Cpu, Radio, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrustBadge } from "@/components/marketplace/trust-badges";
import { FREQUENCY_CLASSES, LIVE_VERIFIED_DAYS, PLATFORM_DISCLAIMER, RISK_DISCLOSURE, TRUST_TIERS, type FrequencyClass } from "@/lib/monetization";

export const Route = createFileRoute("/models/verification")({
  head: () => ({
    meta: [
      { title: "How model verification works — aiAlgo" },
      {
        name: "description",
        content:
          "Platform Verified, Live Verified and Unproven explained: how aiAlgo audits hosted models and timestamps remote signals so track records cannot be faked.",
      },
      { property: "og:title", content: "How model verification works — aiAlgo" },
      {
        property: "og:description",
        content: "Trust tiers, trading frequency classification and the 90-day live verification rule.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerificationPage,
});

function VerificationPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <Badge variant="secondary">Trust</Badge>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">How verification works</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Trust tiers are derived by the platform from how a model runs — a contributor can never set their own tier.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="h-4 w-4 text-primary" aria-hidden /> Tier 1 — Platform-hosted
            </CardTitle>
            <CardDescription>
              The contributor uploads the model or algo to our sandbox. We run it on our data feeds, so the backtest,
              the paper run and the live signals all come from code we execute. These listings are{" "}
              <strong>Platform Verified</strong>.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="h-4 w-4 text-primary" aria-hidden /> Tier 2 — Remote execution
            </CardTitle>
            <CardDescription>
              Latency-sensitive strategies stay on the contributor's own infrastructure and stream signals to us. We
              timestamp every signal on receipt, so the track record is built from data the contributor cannot
              backdate. After {LIVE_VERIFIED_DAYS} days it becomes <strong>Live Verified</strong>.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Trust tiers</h2>
        <div className="mt-3 space-y-3">
          {(Object.keys(TRUST_TIERS) as (keyof typeof TRUST_TIERS)[]).map((tier) => (
            <Card key={tier} className="border-border/70">
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <TrustBadge tier={tier} />
                <span className="text-sm text-muted-foreground">{TRUST_TIERS[tier].hint}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Trading frequency classification</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Contributors declare a frequency at submission. We verify it against the model's measured signal rate and
          average holding period, and the HFT-Ready label additionally requires sub-100ms measured gateway latency.
        </p>
        <Card className="mt-3 border-border/70">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Typical holding period</TableHead>
                  <TableHead>What it means for you</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Object.keys(FREQUENCY_CLASSES) as FrequencyClass[]).map((f) => (
                  <TableRow key={f}>
                    <TableCell className="font-medium">{FREQUENCY_CLASSES[f].label}</TableCell>
                    <TableCell className="mono text-muted-foreground">{FREQUENCY_CLASSES[f].holding}</TableCell>
                    <TableCell className="text-muted-foreground">{FREQUENCY_CLASSES[f].hint}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> What verification is not
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A trust tier describes how a track record was produced — not whether a strategy will make money. {RISK_DISCLOSURE}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{PLATFORM_DISCLAIMER}</p>
        <p className="mt-4 text-sm">
          <Link to="/pricing" className="text-primary underline-offset-2 hover:underline">
            See contributor pricing
          </Link>
        </p>
      </section>
    </main>
  );
}
