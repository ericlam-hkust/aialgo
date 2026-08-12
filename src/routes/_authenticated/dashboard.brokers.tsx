import { useState } from "react";
import { handleActionError } from "@/lib/upgrade-events";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PlugZap, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fmtMoney } from "@/lib/format";
import {
  disconnectBroker,
  listBrokerConnections,
  saveBrokerConnection,
  syncBroker,
} from "@/lib/brokers.functions";

export const Route = createFileRoute("/_authenticated/dashboard/brokers")({
  head: () => ({
    meta: [
      { title: "Broker Connections · AlgoForge" },
      {
        name: "description",
        content: "Connect Interactive Brokers, Futu and Tiger accounts to sync live balances, positions and orders.",
      },
      { property: "og:title", content: "Broker Connections · AlgoForge" },
      {
        property: "og:description",
        content: "Sync live balances, positions and orders from IBKR, Futu and Tiger into AlgoForge.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Brokers,
});

type BrokerId = "ibkr" | "tiger" | "futu";

const BROKERS: {
  id: BrokerId;
  name: string;
  region: string;
  note: string;
  secretLabel: string;
  secretMultiline?: boolean;
  fields: ("gatewayUrl" | "opendUrl" | "tigerId")[];
  help: string;
}[] = [
  {
    id: "ibkr",
    name: "Interactive Brokers",
    region: "Global",
    note: "Multi-market access with low FX costs.",
    secretLabel: "Client Portal session token (optional)",
    fields: ["gatewayUrl"],
    help: "Run the IBKR Client Portal Gateway and expose it over HTTPS, then paste its base URL (e.g. https://your-host:5000/v1/api).",
  },
  {
    id: "futu",
    name: "Futu / moomoo",
    region: "Hong Kong",
    note: "Popular with HK retail traders for HK and US equities.",
    secretLabel: "OpenD unlock password (optional)",
    fields: ["opendUrl"],
    help: "Futu requires the local OpenD daemon. Expose your OpenD HTTP bridge and paste its URL here.",
  },
  {
    id: "tiger",
    name: "Tiger Brokers",
    region: "Asia",
    note: "HK, US and A-share coverage.",
    secretLabel: "RSA private key (PKCS8)",
    secretMultiline: true,
    fields: ["tigerId"],
    help: "Create an Open API app in Tiger's developer console, then paste your Tiger ID and the RSA private key used to sign requests.",
  },
];

function Brokers() {
  const qc = useQueryClient();
  const list = useServerFn(listBrokerConnections);
  const save = useServerFn(saveBrokerConnection);
  const sync = useServerFn(syncBroker);
  const remove = useServerFn(disconnectBroker);

  const { data } = useQuery({ queryKey: ["brokers"], queryFn: () => list({ data: undefined }) });
  const connections = data?.connections ?? [];
  const positions = data?.positions ?? [];
  const orders = data?.orders ?? [];
  const byBroker = new Map(connections.map((c) => [c.broker_name, c]));

  const [drafts, setDrafts] = useState<
    Record<string, { secret: string; gatewayUrl: string; opendUrl: string; tigerId: string; accountId: string; live: boolean }>
  >({});

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["brokers"] });

  const saveMutation = useMutation({
    mutationFn: (vars: Parameters<typeof save>[0]) => save(vars),
    onSuccess: () => {
      toast.success("Broker connection saved.");
      invalidate();
    },
    onError: (e: Error) => handleActionError(e),
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => sync({ data: { id } }),
    onSuccess: (res) => {
      toast[res.ok ? "success" : "error"](res.message ?? "Synced.");
      invalidate();
    },
    onError: (e: Error) => handleActionError(e),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <PlugZap className="h-5 w-5 text-primary" /> Broker Connections
        </h1>
        <p className="text-sm text-muted-foreground">
          Link a live brokerage account to sync balances, positions and orders, or keep a broker in simulation mode
          for paper trading.
        </p>
      </div>

      <Alert>
        <AlertTitle>Credentials are encrypted at rest</AlertTitle>
        <AlertDescription>
          Keys and tokens are encrypted with AES-GCM before they touch the database and are only decrypted inside
          server functions during a sync. AlgoForge never places live orders on your behalf.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-3">
        {BROKERS.map((b) => {
          const conn = byBroker.get(b.id);
          const cfg = (conn?.config ?? {}) as Record<string, string>;
          const draft = drafts[b.id] ?? {
            secret: "",
            gatewayUrl: cfg["gatewayUrl"] ?? "",
            opendUrl: cfg["opendUrl"] ?? "",
            tigerId: cfg["tigerId"] ?? "",
            accountId: conn?.account_id ?? "",
            live: conn ? conn.mode === "live" : true,
          };
          const setDraft = (patch: Partial<typeof draft>) =>
            setDrafts((d) => ({ ...d, [b.id]: { ...draft, ...patch } }));

          return (
            <Card key={b.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  {b.name}
                  <Badge variant={conn?.status === "connected" ? "default" : conn ? "secondary" : "outline"}>
                    {conn?.status ?? "not connected"}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {b.region} · {b.note}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{b.help}</p>

                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <Label htmlFor={`live-${b.id}`} className="text-xs">
                    Live account sync
                  </Label>
                  <Switch id={`live-${b.id}`} checked={draft.live} onCheckedChange={(v) => setDraft({ live: v })} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`acct-${b.id}`} className="text-xs">
                    Account ID
                  </Label>
                  <Input
                    id={`acct-${b.id}`}
                    value={draft.accountId}
                    onChange={(e) => setDraft({ accountId: e.target.value })}
                    placeholder="U1234567"
                  />
                </div>

                {b.fields.includes("gatewayUrl") ? (
                  <div className="space-y-1">
                    <Label htmlFor={`gw-${b.id}`} className="text-xs">
                      Client Portal gateway URL
                    </Label>
                    <Input
                      id={`gw-${b.id}`}
                      value={draft.gatewayUrl}
                      onChange={(e) => setDraft({ gatewayUrl: e.target.value })}
                      placeholder="https://host:5000/v1/api"
                    />
                  </div>
                ) : null}

                {b.fields.includes("opendUrl") ? (
                  <div className="space-y-1">
                    <Label htmlFor={`opend-${b.id}`} className="text-xs">
                      OpenD bridge URL
                    </Label>
                    <Input
                      id={`opend-${b.id}`}
                      value={draft.opendUrl}
                      onChange={(e) => setDraft({ opendUrl: e.target.value })}
                      placeholder="https://your-host/opend"
                    />
                  </div>
                ) : null}

                {b.fields.includes("tigerId") ? (
                  <div className="space-y-1">
                    <Label htmlFor={`tid-${b.id}`} className="text-xs">
                      Tiger ID
                    </Label>
                    <Input
                      id={`tid-${b.id}`}
                      value={draft.tigerId}
                      onChange={(e) => setDraft({ tigerId: e.target.value })}
                    />
                  </div>
                ) : null}

                <div className="space-y-1">
                  <Label htmlFor={`sec-${b.id}`} className="text-xs">
                    {b.secretLabel}
                  </Label>
                  {b.secretMultiline ? (
                    <Textarea
                      id={`sec-${b.id}`}
                      rows={3}
                      value={draft.secret}
                      onChange={(e) => setDraft({ secret: e.target.value })}
                      placeholder="-----BEGIN PRIVATE KEY-----"
                    />
                  ) : (
                    <Input
                      id={`sec-${b.id}`}
                      type="password"
                      autoComplete="off"
                      value={draft.secret}
                      onChange={(e) => setDraft({ secret: e.target.value })}
                    />
                  )}
                </div>

                {conn ? (
                  <div className="rounded-md border border-border p-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="mono">{fmtMoney(Number(conn.account_balance), conn.currency ?? "USD")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Buying power</span>
                      <span className="mono">{fmtMoney(Number(conn.buying_power), conn.currency ?? "USD")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last sync</span>
                      <span className="mono">
                        {conn.last_synced_at ? new Date(conn.last_synced_at).toLocaleString("en-GB") : "never"}
                      </span>
                    </div>
                    {conn.last_error ? <p className="mt-1 text-loss">{conn.last_error}</p> : null}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={saveMutation.isPending}
                    onClick={() =>
                      saveMutation.mutate({
                        data: {
                          broker: b.id,
                          mode: draft.live ? "live" : "simulation",
                          accountId: draft.accountId,
                          currency: b.id === "ibkr" ? "USD" : "HKD",
                          autoSyncMinutes: 0,
                          ...(draft.secret ? { secret: draft.secret } : {}),
                          ...(draft.gatewayUrl ? { gatewayUrl: draft.gatewayUrl } : {}),
                          ...(draft.opendUrl ? { opendUrl: draft.opendUrl } : {}),
                          ...(draft.tigerId ? { tigerId: draft.tigerId } : {}),
                        },
                      })
                    }
                  >
                    {conn ? "Update" : "Connect"}
                  </Button>
                  {conn ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={syncMutation.isPending}
                        onClick={() => syncMutation.mutate(conn.id)}
                      >
                        <RefreshCw
                          className={syncMutation.isPending ? "mr-1.5 h-3.5 w-3.5 animate-spin" : "mr-1.5 h-3.5 w-3.5"}
                        />
                        Sync now
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await remove({ data: { id: conn.id } });
                          toast.success(`${b.name} disconnected.`);
                          invalidate();
                        }}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Synced positions</CardTitle>
            <CardDescription>Live holdings pulled from your connected brokerage accounts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {positions.length === 0 ? (
              <p className="text-muted-foreground">No broker positions synced yet.</p>
            ) : (
              positions.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b border-border/60 py-1.5 last:border-0">
                  <span className="mono">{p.symbol}</span>
                  <span className="text-muted-foreground">
                    {Number(p.quantity)} @ {Number(p.avg_cost).toFixed(2)}
                  </span>
                  <span className={Number(p.unrealized_pnl) >= 0 ? "mono text-profit" : "mono text-loss"}>
                    {fmtMoney(Number(p.unrealized_pnl), p.currency ?? "USD")}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent broker orders</CardTitle>
            <CardDescription>Read-only order history from the last sync.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {orders.length === 0 ? (
              <p className="text-muted-foreground">No broker orders synced yet.</p>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between border-b border-border/60 py-1.5 last:border-0">
                  <span className="mono">{o.symbol}</span>
                  <span className="text-muted-foreground">
                    {o.side} {Number(o.quantity)} · {o.status}
                  </span>
                  <span className="mono text-xs">
                    {o.placed_at ? new Date(o.placed_at).toLocaleString("en-GB") : ""}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
