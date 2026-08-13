import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Cloud,
  Download,
  GitBranch,
  Info,
  Lock,
  ShieldCheck,
  Sparkles,
  Terminal,
  Unlock,
} from "lucide-react";
import { getBaseModel } from "@/lib/base-models.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtNum } from "@/lib/format";

const baseQuery = (id: string) =>
  queryOptions({ queryKey: ["base-model", id], queryFn: () => getBaseModel({ data: { id } }) });

export const Route = createFileRoute("/marketplace/base-models/$id")({
  loader: async ({ context, params }) => {
    const base = await context.queryClient.ensureQueryData(baseQuery(params.id));
    if (!base) throw notFound();
    return base;
  },
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} — base model | aiAlgo` },
      {
        name: "description",
        content: `Documentation, feature schema, fine-tuning contract and published derivatives for the aiAlgo ${params.id} pretrained base trading model.`,
      },
      { property: "og:title", content: `${params.id} — base model | aiAlgo` },
      {
        property: "og:description",
        content: "Feature schema, trainable vs frozen layers, and the derivatives tree for this base model.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BaseModelDetail,
});

function BaseModelDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(baseQuery(id));
  if (!data) return null;

  const cli = `# 1. pull the base package
aialgo pull aialgo/${data.id}@${data.version}

# 2. fine-tune locally against your own data
python train.py --data ./data/ohlcv.parquet \\
  --epochs ${data.recommended_settings.epochs ?? 8} \\
  --lr ${data.recommended_settings.learningRate ?? 0.0005}

# 3. push as a derivative — validation runs automatically
aialgo push ./dist --derivative-of aialgo/${data.id}@${data.version}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <Link to="/marketplace/base-models" className="text-xs text-muted-foreground hover:underline">
            ← Base Models
          </Link>
          <h1 className="mono text-2xl font-semibold tracking-tight">{data.name}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{data.tagline}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="outline">v{data.version}</Badge>
            <Badge variant="secondary">{data.architecture}</Badge>
            <Badge variant="outline">{data.listing_kind === "algo" ? "Algo" : "AI model"}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/marketplace/fine-tuning-guide">
              <BookOpen className="mr-1.5 h-4 w-4" aria-hidden /> Guide
            </Link>
          </Button>
          <Button asChild>
            <Link to="/dashboard/models/fine-tune/$id" params={{ id: data.id }}>
              <Sparkles className="mr-1.5 h-4 w-4" aria-hidden /> Use this base
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        Not directly subscribable — fine-tune to create your model. Baseline numbers below are reference only:
        derivatives must pass their own backtest before they can be listed.
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schema">Feature schema</TabsTrigger>
          <TabsTrigger value="finetune">Fine-tune paths</TabsTrigger>
          <TabsTrigger value="derivatives">Derivatives ({data.derivatives.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documentation</CardTitle>
              <CardDescription>{data.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="whitespace-pre-line text-muted-foreground">{data.docs}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Info2 label="Pretrained on" value={data.instruments.join(", ")} />
                <Info2 label="Timeframes" value={data.timeframes.join(", ")} />
                <Info2 label="Data range" value={`${data.data_start} → ${data.data_end}`} />
                <Info2 label="Fine-tune compute estimate" value={data.compute_estimate} />
              </div>
              <div className="rounded-md border border-border/70 bg-muted/20 p-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <Metric label="Sharpe" value={fmtNum(data.baseline_metrics.sharpe ?? 0, 2)} />
                  <Metric label="CAGR" value={`${fmtNum((data.baseline_metrics.cagr ?? 0) * 100, 1)}%`} />
                  <Metric label="Max DD" value={`${fmtNum((data.baseline_metrics.maxDrawdown ?? 0) * 100, 1)}%`} />
                  <Metric label="Win rate" value={`${fmtNum((data.baseline_metrics.winRate ?? 0) * 100, 0)}%`} />
                  <Metric label="Trades" value={String(data.baseline_metrics.trades ?? 0)} />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Base performance — derivatives must pass their own backtest.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Unlock className="h-4 w-4 text-primary" aria-hidden /> Trainable
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {data.trainable.map((t) => (
                    <li key={t} className="mono text-xs">
                      {t}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="h-4 w-4 text-muted-foreground" aria-hidden /> Frozen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {data.frozen.map((t) => (
                    <li key={t} className="mono text-xs">
                      {t}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recommended fine-tune settings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
              <Info2 label="Training window" value={`${data.recommended_settings.trainingWindowMonths ?? 18} months`} />
              <Info2 label="Epochs" value={String(data.recommended_settings.epochs ?? 8)} />
              <Info2 label="Learning rate" value={String(data.recommended_settings.learningRate ?? 0.0005)} />
              <Info2 label="Entry threshold" value={String(data.recommended_settings.entryThreshold ?? 0.6)} />
              <Info2 label="Exit threshold" value={String(data.recommended_settings.exitThreshold ?? 0.4)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schema" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feature schema derivatives must conform to</CardTitle>
              <CardDescription>
                Derivatives cannot modify the input schema or the output contract — those fields are locked in the
                upload wizard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.feature_schema.map((f) => (
                    <TableRow key={f.field}>
                      <TableCell className="mono text-xs">{f.field}</TableCell>
                      <TableCell className="text-xs">{f.type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{f.note}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-3 text-xs text-muted-foreground">
                Output contract: <span className="mono">{"{ action, confidence, size }"}</span> per bar — unchanged
                across every derivative.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finetune" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Download className="h-4 w-4" aria-hidden /> Download & fine-tune locally
                </CardTitle>
                <CardDescription>Full control, your own hardware and data.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3 text-xs text-muted-foreground">
                <ul className="list-inside list-disc space-y-1">
                  {data.package_contents.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                <pre className="mono overflow-x-auto rounded-md border border-border/70 bg-muted/30 p-3 text-[11px] leading-relaxed">
                  {cli}
                </pre>
                <Button variant="outline" size="sm" className="mt-auto w-full" asChild>
                  <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(cli)}`} download={`${data.id}-quickstart.txt`}>
                    <Terminal className="mr-1.5 h-4 w-4" aria-hidden /> Download base package
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="flex flex-col border-primary/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Cloud className="h-4 w-4 text-primary" aria-hidden /> Cloud fine-tune
                </CardTitle>
                <CardDescription>No-code wizard, free for contributors.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3 text-xs text-muted-foreground">
                <p>
                  Pick instruments and a timeframe, set thresholds and a training window, and the platform trains in a
                  sandbox then pipes the result straight into backtest validation.
                </p>
                <Button asChild size="sm" className="mt-auto w-full">
                  <Link to="/dashboard/models/fine-tune/$id" params={{ id: data.id }}>
                    Start cloud fine-tune
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4" aria-hidden /> From scratch
                </CardTitle>
                <CardDescription>Bring your own model, no lineage.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3 text-xs text-muted-foreground">
                <p>Upload your own package — including multi-model pipeline bundles — through the standard wizard.</p>
                <Button asChild variant="outline" size="sm" className="mt-auto w-full">
                  <Link to="/dashboard/models/new">Open upload wizard</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Every path ends in the same mandatory platform backtest. Lineage never grants a trust badge by itself.
          </div>
        </TabsContent>

        <TabsContent value="derivatives" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitBranch className="h-4 w-4" aria-hidden /> Derivatives tree
              </CardTitle>
              <CardDescription>Published models fine-tuned from this base, with verified performance.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.derivatives.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No published derivatives yet — be the first to fine-tune this base.
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="mono text-xs text-muted-foreground">aialgo/{data.id}</div>
                  {data.derivatives.map((d, i) => (
                    <div key={d.id} className="flex flex-wrap items-center gap-3 border-l border-border/70 pl-4">
                      <span className="mono text-xs text-muted-foreground">
                        {i === data.derivatives.length - 1 ? "└─" : "├─"}
                      </span>
                      <Link to="/marketplace/$slug" params={{ slug: d.slug }} className="text-sm hover:underline">
                        {d.name}
                      </Link>
                      {d.finetune_method === "cloud" ? (
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <Cloud className="h-3 w-3" aria-hidden /> Cloud-trained
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          {d.finetune_method === "params_only" ? "Adapted" : "Local fine-tune"}
                        </Badge>
                      )}
                      <span className="mono text-xs text-muted-foreground">
                        Sharpe {fmtNum(Number(d.sharpe ?? 0), 2)} · DD {fmtNum(Number(d.max_drawdown ?? 0) * 100, 1)}% ·
                        Win {fmtNum(Number(d.win_rate ?? 0) * 100, 0)}%
                      </span>
                      {d.overfitting_risk ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Overfitting risk
                        </Badge>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info2({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/20 p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="mono text-sm">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
