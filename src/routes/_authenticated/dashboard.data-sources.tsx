import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Database, ExternalLink, RefreshCw, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PROVIDERS, type ProviderId } from "@/lib/data-providers";
import { SYMBOLS } from "@/lib/market";
import {
  deleteDataSource,
  listDataSources,
  listSyncRuns,
  saveDataSource,
  syncHistory,
  syncIntraday,
  testDataSource,
} from "@/lib/data-sources.functions";

export const Route = createFileRoute("/_authenticated/dashboard/data-sources")({
  head: () => ({
    meta: [
      { title: "Data Sources · AlgoForge" },
      {
        name: "description",
        content: "Connect market data providers, verify API keys and run live and historical data syncs.",
      },
      { property: "og:title", content: "Data Sources · AlgoForge" },
      {
        property: "og:description",
        content: "Connect market data providers and run live and historical data syncs on AlgoForge.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DataSources,
});

const ALL_SYMBOLS = SYMBOLS.map((s) => s.symbol);

function DataSources() {
  const qc = useQueryClient();
  const list = useServerFn(listDataSources);
  const save = useServerFn(saveDataSource);
  const remove = useServerFn(deleteDataSource);
  const test = useServerFn(testDataSource);
  const runs = useServerFn(listSyncRuns);
  const history = useServerFn(syncHistory);
  const intraday = useServerFn(syncIntraday);

  const [drafts, setDrafts] = useState<Record<string, { apiKey: string; priority: string; platform: boolean }>>({});

  const { data } = useQuery({ queryKey: ["data-sources"], queryFn: () => list({ data: undefined }) });
  const { data: syncRuns } = useQuery({ queryKey: ["sync-runs"], queryFn: () => runs({ data: undefined }) });

  const connections = data?.connections ?? [];
  const platformAvailable = data?.platformAvailable ?? [];
  const byProvider = new Map(connections.map((c) => [c.provider, c]));

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["data-sources"] });
    void qc.invalidateQueries({ queryKey: ["sync-runs"] });
  };

  const saveMutation = useMutation({
    mutationFn: (vars: { provider: ProviderId; apiKey?: string; usePlatformKey: boolean; priority: number }) =>
      save({
        data: {
          provider: vars.provider,
          usePlatformKey: vars.usePlatformKey,
          priority: vars.priority,
          enabled: true,
          testSymbol: "AAPL",
          ...(vars.apiKey ? { apiKey: vars.apiKey } : {}),
        },
      }),
    onSuccess: (res) => {
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const historyMutation = useMutation({
    mutationFn: () => history({ data: { symbols: ALL_SYMBOLS, years: 2 } }),
    onSuccess: (res) => {
      const total = res.results.reduce((a, r) => a + r.rows, 0);
      const failed = res.results.filter((r) => r.error);
      toast[total > 0 ? "success" : "error"](
        total > 0
          ? `Wrote ${total} daily bars (${res.from} → ${res.to}).${failed.length ? ` ${failed.length} symbol(s) failed.` : ""}`
          : (failed[0]?.error ?? "No bars returned — check your provider keys."),
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const intradayMutation = useMutation({
    mutationFn: () => intraday({ data: { symbols: ALL_SYMBOLS.slice(0, 10), interval: "5min" } }),
    onSuccess: (res) => {
      const total = res.results.reduce((a, r) => a + r.rows, 0);
      toast[total > 0 ? "success" : "error"](
        total > 0 ? `Wrote ${total} 5-minute bars.` : (res.results[0]?.error ?? "No intraday bars returned."),
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Database className="h-5 w-5 text-primary" /> Data Sources
          </h1>
          <p className="text-sm text-muted-foreground">
            Connect market data APIs. Quotes route through your enabled providers in priority order, falling back
            automatically when one fails or lacks coverage.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => intradayMutation.mutate()} disabled={intradayMutation.isPending}>
            <RefreshCw className={intradayMutation.isPending ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
            Sync intraday
          </Button>
          <Button onClick={() => historyMutation.mutate()} disabled={historyMutation.isPending}>
            <RefreshCw className={historyMutation.isPending ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
            Sync 2y history
          </Button>
        </div>
      </div>

      <Tabs defaultValue="providers">
        <TabsList>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="runs">Sync activity</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="mt-4 grid gap-4 lg:grid-cols-2">
          {PROVIDERS.map((p) => {
            const conn = byProvider.get(p.id);
            const draft = drafts[p.id] ?? {
              apiKey: "",
              priority: String(conn?.priority ?? 100),
              platform: conn?.use_platform_key ?? false,
            };
            const setDraft = (patch: Partial<typeof draft>) =>
              setDrafts((d) => ({ ...d, [p.id]: { ...draft, ...patch } }));

            return (
              <Card key={p.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        {p.name}
                        {conn ? (
                          <Badge variant={conn.status === "connected" ? "default" : "destructive"}>
                            {conn.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not connected</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{p.note}</CardDescription>
                    </div>
                    <a
                      href={p.keyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Get key <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {p.markets.map((m) => (
                      <Badge key={m} variant="secondary">
                        {m}
                      </Badge>
                    ))}
                    <Badge variant="outline">{p.realtime}</Badge>
                    <Badge variant="outline">{p.history}</Badge>
                  </div>

                  {conn?.status_message ? (
                    <p className="text-xs text-muted-foreground">{conn.status_message}</p>
                  ) : null}

                  {platformAvailable.includes(p.id) ? (
                    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <Label htmlFor={`platform-${p.id}`} className="text-xs">
                        Use AlgoForge platform key
                      </Label>
                      <Switch
                        id={`platform-${p.id}`}
                        checked={draft.platform}
                        onCheckedChange={(v) => setDraft({ platform: v })}
                      />
                    </div>
                  ) : null}

                  <div className="grid gap-2 sm:grid-cols-[1fr_90px]">
                    <div className="space-y-1">
                      <Label htmlFor={`key-${p.id}`} className="text-xs">
                        API key {conn?.key_suffix ? `(saved ····${conn.key_suffix})` : ""}
                      </Label>
                      <Input
                        id={`key-${p.id}`}
                        type="password"
                        autoComplete="off"
                        placeholder={draft.platform ? "Using platform key" : "Paste your API key"}
                        disabled={draft.platform}
                        value={draft.apiKey}
                        onChange={(e) => setDraft({ apiKey: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`prio-${p.id}`} className="text-xs">
                        Priority
                      </Label>
                      <Input
                        id={`prio-${p.id}`}
                        inputMode="numeric"
                        value={draft.priority}
                        onChange={(e) => setDraft({ priority: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={saveMutation.isPending}
                      onClick={() =>
                        saveMutation.mutate({
                          provider: p.id,
                          usePlatformKey: draft.platform,
                          priority: Number(draft.priority) || 100,
                          ...(draft.apiKey ? { apiKey: draft.apiKey } : {}),
                        })
                      }
                    >
                      {conn ? "Update" : "Connect"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const res = await test({ data: { provider: p.id, symbol: "AAPL" } });
                        toast[res.ok ? "success" : "error"](res.message);
                      }}
                    >
                      <Zap className="mr-1.5 h-3.5 w-3.5" /> Test
                    </Button>
                    {conn ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await remove({ data: { id: conn.id } });
                          toast.success(`${p.name} disconnected.`);
                          invalidate();
                        }}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="runs" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent sync runs</CardTitle>
              <CardDescription>Every quote, history and broker sync is logged here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {(syncRuns ?? []).length === 0 ? (
                <p className="text-muted-foreground">No syncs yet.</p>
              ) : (
                (syncRuns ?? []).map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-1.5 last:border-0"
                  >
                    <span className="flex items-center gap-2">
                      <Badge variant={r.status === "success" ? "secondary" : "destructive"}>{r.status}</Badge>
                      <span className="mono text-xs">{r.kind}</span>
                      <span className="text-muted-foreground">{r.provider}</span>
                      {r.symbol ? <span className="mono text-xs">{r.symbol}</span> : null}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {r.rows_written} rows · {r.duration_ms}ms ·{" "}
                      {new Date(r.created_at).toLocaleString("en-GB")}
                      {r.error ? ` · ${r.error}` : ""}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
