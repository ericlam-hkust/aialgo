import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Check,
  LineChart,
  ShieldCheck,
  Store,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AlgoForge — No-Code Algorithmic Trading for HK & US Markets" },
      {
        name: "description",
        content:
          "Build, backtest and paper-trade automated strategies without code. Visual builder, AI assist and realistic HK/US market simulation.",
      },
      { property: "og:title", content: "AlgoForge — No-Code Algorithmic Trading" },
      {
        property: "og:description",
        content:
          "Design trading strategies visually, backtest them on two years of HK and US market data, and run them in paper trading.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Workflow,
    title: "Visual strategy builder",
    body: "Drag data, condition, action and risk nodes onto a canvas and wire them into a complete trading system. No code, no syntax errors.",
  },
  {
    icon: BrainCircuit,
    title: "AI strategy assist",
    body: "Describe your idea in plain English — “buy when the 50-day SMA crosses the 200-day with RSI under 70” — and apply the generated graph in one click.",
  },
  {
    icon: LineChart,
    title: "Real backtesting",
    body: "Your graph is executed bar by bar against two years of daily HK and US data, with commission, slippage and stop handling.",
  },
  {
    icon: Activity,
    title: "Paper trading",
    body: "Deploy strategies to a live simulation with streaming prices, positions, order flow and an emergency kill switch.",
  },
  {
    icon: ShieldCheck,
    title: "Risk management centre",
    body: "Daily loss caps, drawdown limits and position sizing enforced automatically, with a full risk event log.",
  },
  {
    icon: Store,
    title: "Strategy marketplace",
    body: "Publish verified strategies or subscribe to community systems and clone them into your own library.",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "HK$0",
    period: "forever",
    features: ["Visual builder", "10 backtests / hour", "Paper trading", "5 strategy templates"],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "HK$288",
    period: "per month",
    features: [
      "Unlimited backtests",
      "AI strategy assist priority",
      "Marketplace publishing & earnings",
      "Advanced risk analytics",
      "Broker connections",
    ],
    cta: "Go Pro",
    highlight: true,
  },
];

const FAQS = [
  {
    q: "Is real money at risk?",
    a: "No. AlgoForge is a simulation platform. Backtests run on stored historical data and paper trading uses simulated fills — no live orders are ever routed to an exchange.",
  },
  {
    q: "Which markets are covered?",
    a: "Hong Kong majors (0700.HK, 9988.HK, 3690.HK, 2318.HK, 0005.HK) plus US names AAPL, TSLA, SPY and QQQ, each with two years of daily OHLCV history.",
  },
  {
    q: "Do I need to know how to code?",
    a: "Not at all. Every strategy is expressed as a node graph. The AI assistant can even draft the graph from a sentence, which you then tune in the properties panel.",
  },
  {
    q: "How do you handle overfitting?",
    a: "Every backtest gets an overfitting score based on parameter count, win rate and return profile. Suspicious results trigger a warning recommending walk-forward validation.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Workflow className="h-4 w-4" aria-hidden />
            </span>
            AlgoForge
          </span>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="hero-glow relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-4 py-24 text-center md:py-32">
          <Badge variant="outline" className="mb-6 border-primary/40 text-primary">
            Built for Hong Kong retail traders
          </Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            Turn a trading idea into a tested strategy — without writing code
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
            AlgoForge gives you a visual strategy canvas, an AI co-pilot, a real backtesting engine over HK and
            US market history, and a paper-trading desk to prove it works before a single dollar moves.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth/register">
                Build your first strategy <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth/login">I already have an account</Link>
            </Button>
          </div>
          <dl className="mono mx-auto mt-14 grid max-w-2xl grid-cols-2 gap-6 text-left sm:grid-cols-4">
            {[
              ["9", "symbols"],
              ["2yr", "daily history"],
              ["30+", "node types"],
              ["<5s", "backtest"],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="text-2xl font-semibold text-foreground">{v}</dt>
                <dd className="text-xs tracking-wide text-muted-foreground uppercase">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Everything the desk needs</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          One workspace for research, validation, execution simulation and risk control.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="border-border/70 bg-card/70">
              <CardContent className="p-5">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <f.icon className="h-4.5 w-4.5" aria-hidden />
                </div>
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">Simple pricing</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {PRICING.map((p) => (
              <Card
                key={p.name}
                className={p.highlight ? "border-primary/60 shadow-[var(--shadow-glow)]" : "border-border/70"}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{p.name}</h3>
                    {p.highlight ? <Badge>Most popular</Badge> : null}
                  </div>
                  <p className="mono mt-4 text-3xl font-semibold">
                    {p.price}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">/ {p.period}</span>
                  </p>
                  <ul className="mt-5 space-y-2 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-profit" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="mt-6 w-full" variant={p.highlight ? "default" : "outline"}>
                    <Link to="/auth/register">{p.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Frequently asked</h2>
        <Accordion type="single" collapsible className="mt-6">
          {FAQS.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto max-w-6xl px-4 text-xs text-muted-foreground">
          AlgoForge is an educational simulation platform. Nothing here is investment advice, and no orders are
          routed to any exchange.
        </div>
      </footer>
    </div>
  );
}
