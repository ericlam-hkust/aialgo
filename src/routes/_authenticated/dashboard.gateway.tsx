import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, Copy, Gift, KeyRound, Loader2, Pause, Play, Radio, Zap } from "lucide-react";
import { getGatewayConsole, rotateGatewaySecret, setGatewayPaused } from "@/lib/gateway.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { TrustBadge } from "@/components/marketplace/trust-badges";
import { CONTRIBUTOR_FREE_ITEMS, HFT_LATENCY_MS } from "@/lib/monetization";

export const Route = createFileRoute("/_authenticated/dashboard/gateway")({
  component: GatewayPage,
  head: () => ({
    meta: [
      { title: "Signal Gateway — AlgoForge" },
      {
        name: "description",
        content: "Stream signals from your own infrastructure: endpoints, secrets, latency health and Signal API usage.",
      },
      { property: "og:title", content: "Signal Gateway — AlgoForge" },
      { property: "og:description", content: "Tier 2 remote model console with HMAC secrets and latency monitoring." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const ENDPOINT = "/api/public/v1/signals";

function GatewayPage() {
  const qc = useQueryClient();
  const console_ = useQuery({ queryKey: ["gateway-console"], queryFn: () => getGatewayConsole() });
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const rotate = useMutation({
    mutationFn: (modelId: string) => rotateGatewaySecret({ data: { modelId } }),
    onSuccess: (res, modelId) => {
      setRevealed((r) => ({ ...r, [modelId]: res.secret }));
      toast.success("New secret issued — copy it now, it is shown once");
      void qc.invalidateQueries({ queryKey: ["gateway-console"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pause = useMutation({
    mutationFn: (v: { modelId: string; paused: boolean }) => setGatewayPaused({ data: v }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["gateway-console"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const data = console_.data;
  const calls = Number(data?.usage?.calls ?? 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Radio className="h-5 w-5 text-primary" aria-hidden /> Signal Gateway
        </h1>
        <p className="text-sm text-muted-foreground">
          Tier 2 — keep the model on your own infrastructure and stream signals to us. Every signal is timestamped on
          receipt, which is what builds a Live Verified track record.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>Signal calls this month</CardDescription>
            <CardTitle className="mono text-2xl">{calls.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Unlimited signal calls, always free — including HFT.
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>p95 latency</CardDescription>
            <CardTitle className="mono text-2xl">{data?.usage?.p95_latency_ms ?? "—"} ms</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            HFT-Ready requires a measured p95 under {HFT_LATENCY_MS} ms.
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>Remote models</CardDescription>
            <CardTitle className="mono text-2xl">{data?.models.length ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Hosted listings are managed under My listings.</CardContent>
        </Card>
      </div>

      <Card className="border-profit/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4 text-profit" aria-hidden /> Gateway access is free
          </CardTitle>
          <CardDescription>
            No plans, no metering, no overage — remote models including latency-sensitive HFT connect free with
            unlimited signal calls. The platform earns only from performance fees on your subscribers&apos; winning
            trades.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CONTRIBUTOR_FREE_ITEMS.map((item) => (
            <div key={item.key} className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.label}</span>
                <Badge variant="outline" className="mono border-profit/50 text-profit">
                  $0
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Endpoints</CardTitle>
          <CardDescription>
            POST signed JSON to <code className="mono">{ENDPOINT}</code> with headers{" "}
            <code className="mono">x-model-id</code> and <code className="mono">x-signature</code> (HMAC-SHA256 of the raw
            body using your gateway secret).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="mono overflow-x-auto rounded-md bg-muted/40 p-3 text-xs">{`curl -X POST https://<your-app>${ENDPOINT} \\
  -H "content-type: application/json" \\
  -H "x-model-id: <MODEL_ID>" \\
  -H "x-signature: <HMAC_SHA256_HEX>" \\
  -d '{"symbol":"AAPL","action":"buy","confidence":0.82,"position_size_pct":5}'`}</pre>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Remote models</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {console_.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading gateway…
            </div>
          ) : (data?.models.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Radio className="h-6 w-6" aria-hidden />}
              title="No remote models yet"
              description="Submit a listing with hosting mode set to Remote to get a gateway endpoint and secret."
            />
          ) : (
            data!.models.map((m: any) => {
              const paused = m.status_row?.status === "paused";
              return (
                <div key={m.id} className="rounded-lg border border-border/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{m.name}</p>
                    <TrustBadge tier={m.derivedTier} />
                    {m.declared_frequency === "hft" ? (
                      <Badge variant="outline" className="gap-1">
                        <Zap className="h-3 w-3" aria-hidden /> HFT
                      </Badge>
                    ) : null}
                    <Badge variant="outline" className="mono">
                      p50 {m.p50 ?? "—"}ms · p95 {m.p95 ?? "—"}ms
                    </Badge>
                    <div className="ml-auto flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => pause.mutate({ modelId: m.id, paused: !paused })}
                        disabled={pause.isPending}
                      >
                        {paused ? <Play className="mr-1 h-3.5 w-3.5" aria-hidden /> : <Pause className="mr-1 h-3.5 w-3.5" aria-hidden />}
                        {paused ? "Resume" : "Pause"}
                      </Button>
                      <Button size="sm" onClick={() => rotate.mutate(m.id)} disabled={rotate.isPending}>
                        <KeyRound className="mr-1 h-3.5 w-3.5" aria-hidden />
                        {m.hasSecret ? "Rotate secret" : "Issue secret"}
                      </Button>
                    </div>
                  </div>
                  {revealed[m.id] ? (
                    <div className="mt-3 flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 p-2">
                      <code className="mono truncate text-xs">{revealed[m.id]}</code>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Copy secret"
                        onClick={() => {
                          void navigator.clipboard.writeText(revealed[m.id]!);
                          toast.success("Secret copied");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" aria-hidden /> Recent signals
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Separator />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Received</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Subscribers</TableHead>
                <TableHead className="text-right">Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.events ?? []).map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="mono text-xs">{new Date(e.received_at).toLocaleString()}</TableCell>
                  <TableCell className="mono">{e.symbol}</TableCell>
                  <TableCell className="uppercase">{e.action}</TableCell>
                  <TableCell className="mono">{e.latency_ms ?? "—"} ms</TableCell>
                  <TableCell className="mono">{e.subscribers_reached ?? 0}</TableCell>
                  <TableCell className="text-right">
                    {e.validation_ok ? (
                      <Badge variant="outline" className="text-profit">
                        accepted
                      </Badge>
                    ) : (
                      <Badge variant="destructive">{e.validation_error ?? "rejected"}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(data?.events ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No signals received yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
