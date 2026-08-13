import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Cloud, Download, Layers, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/marketplace/fine-tuning-guide")({
  head: () => ({
    meta: [
      { title: "Fine-tuning Guide for contributors — aiAlgo" },
      {
        name: "description",
        content:
          "How aiAlgo base models were trained, the frozen-vs-trainable contract, local and cloud fine-tuning walkthroughs, recommended data windows and the publish checklist.",
      },
      { property: "og:title", content: "Fine-tuning Guide for contributors — aiAlgo" },
      {
        property: "og:description",
        content: "Everything you need to fine-tune an aiAlgo base model and publish a verified derivative.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Guide,
});

const LOCAL = `# Local fine-tune with the aiAlgo SDK
pip install aialgo-sdk
aialgo login

aialgo pull aialgo/meanrev-gbm-base@2.1     # weights, manifest template, sample data, notebook
cd meanrev-gbm-base

# edit train.py / notebook.ipynb — only trainable layers are writable
python train.py --instruments ETH/USDT,SOL/USDT --timeframe 1h \\
  --window-months 18 --epochs 8 --lr 0.0005

aialgo validate ./dist                       # local dry-run of the platform checks
aialgo push ./dist --derivative-of aialgo/meanrev-gbm-base@2.1`;

const MANIFEST = `{
  "name": "eth-sol-meanrev",
  "base": { "id": "meanrev-gbm-base", "version": "2.1", "finetune_method": "local" },
  "resources": { "memory_mb": 1024, "max_inference_ms": 60, "requires_gpu": false }
}`;

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Layers;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" aria-hidden /> {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

function Guide() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <Badge variant="secondary">Contributor docs</Badge>
        <h1 className="text-2xl font-semibold tracking-tight">Fine-tuning Guide</h1>
        <p className="text-sm text-muted-foreground">
          Start from a platform base model, adapt it to your instruments, and publish a derivative that stands on its
          own verified backtest. Cloud fine-tuning is free for contributors — forever.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm">
            <Link to="/marketplace/base-models">Browse base models</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/marketplace/docs">Model interface docs</Link>
          </Button>
        </div>
      </div>

      <Section icon={Layers} title="How the base models were trained" description="High level, no proprietary detail.">
        <p>
          Each base was pretrained on multi-year, multi-instrument OHLCV data with a shared feature encoder: normalised
          returns, realised volatility, volume z-scores and a small set of classical indicators. Training used walk-
          forward folds with purged gaps between train and test windows so the encoder never sees leaked future bars.
          The output head is a small classifier over long / flat / short with a confidence score.
        </p>
        <p>
          Bases are deliberately generic. They are not tuned to any single symbol — that is what your fine-tune is for.
        </p>
      </Section>

      <Section icon={Lock} title="The frozen vs trainable contract">
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Frozen:</strong> the feature encoder, the input schema and the output contract (
            <span className="mono text-xs">{"{ action, confidence, size }"}</span>). Changing any of these makes your
            package a from-scratch model, not a derivative.
          </li>
          <li>
            <strong>Trainable:</strong> the head layers, regime thresholds, position-sizing parameters and the entry /
            exit cutoffs.
          </li>
          <li>
            The upload wizard locks schema and output fields when you declare a base, so a derivative can never drift
            off contract.
          </li>
        </ul>
      </Section>

      <Section icon={Download} title="Local fine-tuning with the SDK">
        <pre className="mono overflow-x-auto rounded-md border border-border/70 bg-muted/30 p-3 text-[11px] leading-relaxed">
          {LOCAL}
        </pre>
        <p>Declare the lineage in your manifest:</p>
        <pre className="mono overflow-x-auto rounded-md border border-border/70 bg-muted/30 p-3 text-[11px] leading-relaxed">
          {MANIFEST}
        </pre>
      </Section>

      <Section icon={Cloud} title="Cloud fine-tuning walkthrough">
        <ol className="list-inside list-decimal space-y-1">
          <li>Open a base model and press <strong>Use this base</strong>.</li>
          <li>Select instruments and a timeframe.</li>
          <li>Set entry / exit thresholds, the training window, epochs and learning rate.</li>
          <li>Watch the sandbox training run — train and validation loss curves stream live.</li>
          <li>The output flows automatically into backtest validation; no manual handoff.</li>
          <li>Review the report, set your performance fee (5–25%) and publish.</li>
        </ol>
      </Section>

      <Section icon={CheckCircle2} title="Recommended data windows">
        <ul className="list-inside list-disc space-y-1">
          <li>Intraday (1m–15m): 12–18 months of training data, 6 months held out.</li>
          <li>Hourly (1h–4h): 18–24 months of training data, 6–9 months held out.</li>
          <li>Daily: 3–5 years of training data, 12 months held out.</li>
          <li>Always keep the holdout period untouched until final validation.</li>
        </ul>
      </Section>

      <Section icon={AlertTriangle} title="Common pitfalls">
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Overfitting to a short window.</strong> A great 3-month result usually collapses out-of-sample.
            Watch the walk-forward consistency score — high variance across windows earns an{" "}
            <em>Overfitting Risk</em> badge.
          </li>
          <li>Tuning thresholds against the holdout. That turns your holdout into training data.</li>
          <li>Too many pipeline stages. Multi-stage bundles get extra walk-forward scrutiny for a reason.</li>
          <li>Ignoring costs. Validation applies realistic fees and slippage; so should your local runs.</li>
        </ul>
        <Button asChild size="sm" variant="outline">
          <Link to="/marketplace/verification">How verification works</Link>
        </Button>
      </Section>

      <Section icon={CheckCircle2} title="Publish checklist">
        <ul className="space-y-1">
          {[
            "Lineage declared (base id + version + fine-tune method)",
            "Feature schema and output contract unchanged",
            "Resources within limits: ≤4096 MB, ≤250 ms per bar, no GPU",
            "Backtest validation passed on platform data",
            "Walk-forward consistency reviewed, no unexplained variance",
            "Performance fee set between 5% and 25%",
            "Risk disclosure and description written for consumers",
          ].map((c) => (
            <li key={c} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
