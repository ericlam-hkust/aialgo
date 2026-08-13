import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Check, LineChart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BASE_COMMISSION,
  BATCH_RULE_COPY,
  CONTRIBUTOR_FREE_ITEMS,
  CONTRIBUTOR_PROMISE,
  EARNINGS_SIMULATORS,
  FEE_MAX_PCT,
  FEE_MIN_PCT,
  PLATFORM_DISCLAIMER,
  PRO_CREATOR_COMMISSION,
  PRO_CREATOR_THRESHOLD,
  RISK_DISCLOSURE,
  simulateEarnings,
  usd,
} from "@/lib/monetization";

export const Route = createFileRoute("/creators")({
  head: () => ({
    meta: [
      { title: "Free for Creators, Forever — aiAlgo" },
      {
        name: "description",
        content:
          "AI model and algo creators pay nothing on aiAlgo: free hosting, free Signal Gateway, free backtest pipeline. You set a 5-25% per-trade fee and keep 80%.",
      },
      { property: "og:title", content: "Free for Creators, Forever — aiAlgo" },
      { property: "og:description", content: "No listing fees, no compute fees, no gateway fees. Keep 80% of every fee collected." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreatorsPage,
});

function SimulatorCard({ index }: { index: number }) {
  const preset = EARNINGS_SIMULATORS[index]!;
  const [trades, setTrades] = useState(preset.trades);
  const [avgProfit, setAvgProfit] = useState(preset.avgProfit);
  const [feePct, setFeePct] = useState(preset.feePct);
  const split = simulateEarnings(trades, avgProfit, feePct);
  const isAi = preset.kind === "ai_model";

  return (
    <Card className={isAi ? "border-primary/50" : "border-profit/50"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {isAi ? <Brain className="h-4 w-4 text-primary" aria-hidden /> : <LineChart className="h-4 w-4 text-profit" aria-hidden />}
          {preset.title} earnings simulator
        </CardTitle>
        <CardDescription>{preset.copy}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Profitable trades / mo</Label>
            <Input type="number" value={trades} onChange={(e) => setTrades(Number(e.target.value))} />
          </div>
          <div>
            <Label>Avg profit / trade ($)</Label>
            <Input type="number" value={avgProfit} onChange={(e) => setAvgProfit(Number(e.target.value))} />
          </div>
          <div>
            <Label>Your fee (%)</Label>
            <Input
              type="number"
              min={FEE_MIN_PCT}
              max={FEE_MAX_PCT}
              value={feePct}
              onChange={(e) => setFeePct(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-md border border-border/60 bg-muted/30 p-3 text-center">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Fees collected</div>
            <div className="mono text-lg font-semibold">{usd(split.gross)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Platform {Math.round(split.rate * 100)}%</div>
            <div className="mono text-lg font-semibold">{usd(split.commission)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">You earn</div>
            <div className="mono text-lg font-semibold text-profit">{usd(split.net)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreatorsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <header className="max-w-3xl">
        <Badge variant="secondary">For creators</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Free for Creators, Forever</h1>
        <p className="mt-3 text-sm text-muted-foreground">{CONTRIBUTOR_PROMISE}</p>
      </header>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-primary" aria-hidden /> AI / ML model creators
            </CardTitle>
            <CardDescription>
              Upload weights, ONNX or a pickle with an interface manifest. We host inference on our GPUs and feed it
              real market data — at no cost to you.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Default per-trade fee 15%. Larger, less frequent wins — you earn on trade size.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChart className="h-4 w-4 text-profit" aria-hidden /> Algo strategy creators
            </CardTitle>
            <CardDescription>
              Rule-based logic built in our visual builder or uploaded as parameters. Hosted execution, free forever —
              including remote and HFT strategies via the Signal Gateway.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Default per-trade fee 10%. Many small wins — you earn on volume. {BATCH_RULE_COPY}
          </CardContent>
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">What you never pay for</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CONTRIBUTOR_FREE_ITEMS.map((item) => (
            <div key={item.key} className="rounded-lg border border-border/60 bg-card/60 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{item.label}</span>
                <Badge variant="outline" className="mono border-profit/50 text-profit">
                  $0
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">Show me the math</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You set your per-trade fee ({FEE_MIN_PCT}–{FEE_MAX_PCT}%). You keep {Math.round((1 - BASE_COMMISSION) * 100)}%
          of every fee collected — {Math.round((1 - PRO_CREATOR_COMMISSION) * 100)}% once you pass{" "}
          {usd(PRO_CREATOR_THRESHOLD, 0)} in collected fees in a month.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <SimulatorCard index={0} />
          <SimulatorCard index={1} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Both paths reach the same payout — one on trade size, one on volume. Algo economics are equally attractive.
        </p>
      </section>

      <section className="mt-10 rounded-lg border border-border/60 bg-muted/20 p-6">
        <h2 className="text-lg font-semibold tracking-tight">Ready to publish?</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {[
            "Build or upload your model or algo",
            "Pass the free platform validation backtest",
            "Set your per-trade fee with a live projection from your verified backtest",
            "Get listed with trust badges and start earning on every winning subscriber trade",
          ].map((step) => (
            <li key={step} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-profit" aria-hidden /> {step}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <Button asChild>
            <Link to="/dashboard/models/new">Start a listing</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/how-we-make-money">How we make money</Link>
          </Button>
        </div>
      </section>

      <section className="mt-10 space-y-2 text-xs text-muted-foreground">
        <p>{RISK_DISCLOSURE}</p>
        <p>{PLATFORM_DISCLAIMER}</p>
      </section>
    </main>
  );
}
