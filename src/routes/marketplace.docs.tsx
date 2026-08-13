import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/marketplace/docs")({
  head: () => ({
    meta: [
      { title: "Model Developer Documentation — aiAlgo" },
      {
        name: "description",
        content:
          "Model interface contract, baseline example code, backtest assumptions, data schemas and the submission checklist for aiAlgo contributors.",
      },
      { property: "og:title", content: "Model Developer Documentation — aiAlgo" },
      { property: "og:description", content: "Everything you need to ship a validated trading model on aiAlgo." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Docs,
});

const INTERFACE_CODE = `# model.py — the only contract the platform enforces
from dataclasses import dataclass

@dataclass
class Bar:
    timestamp: str   # ISO 8601, UTC
    open: float
    high: float
    low: float
    close: float
    volume: float

class Model:
    """Stateful, bar-driven. One instance per backtest run."""

    def __init__(self, params: dict): 
        self.fast, self.slow = params.get("fast", 20), params.get("slow", 50)
        self.history = []

    def on_bar(self, symbol: str, bar: Bar) -> dict | None:
        """Return a signal dict or None. Must run in < 50ms per bar."""
        self.history.append(bar.close)
        if len(self.history) < self.slow:
            return None
        fast = sum(self.history[-self.fast:]) / self.fast
        slow = sum(self.history[-self.slow:]) / self.slow
        if fast > slow:
            return {"symbol": symbol, "action": "buy", "weight": 1.0}
        return {"symbol": symbol, "action": "flat", "weight": 0.0}
`;

const OUTPUT_CODE = `{
  "symbol": "BTC/USDT",     // must be in your declared universe
  "action": "buy",           // buy | sell | flat
  "weight": 1.0,             // 0..1 fraction of allocated capital
  "stop_loss": 0.05,         // optional, fractional
  "take_profit": 0.12        // optional, fractional
}`;

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="mono overflow-x-auto rounded-lg border border-border/70 bg-card/60 p-4 text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function Docs() {
  return (
    <main className="mx-auto max-w-4xl space-y-10 px-4 py-10">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <BookOpen className="h-7 w-7 text-primary" aria-hidden /> Model developer documentation
        </h1>
        <p className="text-muted-foreground">
          Everything required to pass platform validation and list a model on the marketplace.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/marketplace/data-library">Data library</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/dashboard/models/new">Submit a model</Link>
          </Button>
        </div>
      </header>

      <Section id="contract" title="1. Model interface contract">
        <p className="text-sm text-muted-foreground">
          Models are evaluated bar-by-bar. The platform instantiates your model once per run, replays historical bars in
          chronological order and executes the signals you return on the next bar's open.
        </p>
        <Code>{INTERFACE_CODE}</Code>
        <p className="text-sm font-medium">Signal output format</p>
        <Code>{OUTPUT_CODE}</Code>
        <p className="text-sm text-muted-foreground">
          Any other shape fails validation with <span className="mono">output_format_mismatch</span>.
        </p>
      </Section>

      <Section id="assumptions" title="2. Backtest assumptions">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Assumption</TableHead>
              <TableHead>Default</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ["Slippage", "0.10% of fill price, applied against you"],
              ["Trading fees", "10 bps per side (configurable per asset class)"],
              ["Spread", "2 bps, crossed on entry and exit"],
              ["Execution", "Next bar open after the signal bar — no same-bar fills"],
              ["Position sizing", "20% of equity per position, max 100% gross exposure"],
              ["Risk constraints", "Hard stop at 40% portfolio drawdown ends the run"],
              ["Capital", "100,000 USD starting equity"],
              ["Out-of-sample holdout", "Final period is hidden from contributors before submission"],
              ["Benchmark", "Buy-and-hold of the declared universe, plus SPY reference"],
            ].map(([k, v]) => (
              <TableRow key={k}>
                <TableCell className="font-medium">{k}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{v}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section id="schemas" title="3. Data schemas">
        <p className="text-sm text-muted-foreground">
          All feeds are normalised OHLCV with UTC timestamps. Full coverage windows and per-instrument details live in
          the <Link className="text-primary underline" to="/marketplace/data-library">data library</Link>.
        </p>
        <Code>{`Bar = { timestamp: str, open: float, high: float, low: float, close: float, volume: float }
Timeframes = "1m" | "5m" | "1h" | "1d"
Indicators available on request: sma, ema, rsi, macd, atr, bbands, adx, vwap`}</Code>
      </Section>

      <Section id="checklist" title="4. Submission checklist">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Before you hit submit</CardTitle>
            <CardDescription>Each item below is checked automatically during interface validation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              "Model exposes on_bar(symbol, bar) and returns the documented signal dict or None",
              "Declared universe matches the symbols your signals reference",
              "Requested timeframe and history exist in the data library (run the availability checker)",
              "No lookahead: your model only reads bars it has already received",
              "Runtime under 50ms per bar and under 10 minutes total",
              "Minimum capital declared realistically for your position sizing",
              "At least one successful sandbox run in the playground",
            ].map((t) => (
              <p key={t} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-profit" aria-hidden />
                {t}
              </p>
            ))}
          </CardContent>
        </Card>
      </Section>

      <Section id="failures" title="5. Common failure reasons">
        <div className="flex flex-wrap gap-2">
          {[
            "output_format_mismatch",
            "insufficient_data_history",
            "runtime_timeout",
            "lookahead_detected",
            "no_trades_generated",
            "excessive_drawdown",
          ].map((f) => (
            <Badge key={f} variant="outline" className="mono">
              {f}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Failed runs can be fixed and resubmitted immediately, or appealed from the validation queue.
        </p>
      </Section>
    </main>
  );
}
