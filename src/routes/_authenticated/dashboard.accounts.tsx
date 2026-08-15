import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  Plug,
  RefreshCw,
  Star,
  Trash2,
  Unplug,
  Wallet,
} from "lucide-react";
import {
  connectTradingAccount,
  createPaperAccount,
  getAccountDependencies,
  listTradingAccounts,
  removeTradingAccount,
  setDefaultTradingAccount,
  testTradingAccount,
  toggleAccountDataSource,
} from "@/lib/trading-accounts.functions";
import {
  ACCOUNT_PROVIDERS,
  PAPER_STARTING_BALANCE,
  PERMISSION_CHECKLIST,
  accountStatus,
  providerLabel,
  providerMeta,
} from "@/lib/trading-accounts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConnectionGuide } from "@/components/accounts/connection-guide";
import { fmtMoney } from "@/lib/format";


export const Route = createFileRoute("/_authenticated/dashboard/accounts")({
  component: AccountsPage,
  head: () => ({
    meta: [
      { title: "Trading Accounts — aiAlgo" },
      {
        name: "description",
        content:
          "Link Futu, Tiger, IBKR, Alpaca and exchange accounts, use them as backtest data sources, and disconnect them safely.",
      },
      { property: "og:title", content: "Trading Accounts — aiAlgo" },
      {
        property: "og:description",
        content: "Link brokers with encrypted trade-only keys, monitor live connectivity, and disconnect safely.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const toneClass: Record<string, string> = {
  connected: "border-profit/40 text-profit",
  simulated: "border-border text-muted-foreground",
  error: "border-loss/50 text-loss",
  idle: "border-border text-muted-foreground",
};

function AccountsPage() {
  const qc = useQueryClient();
  const accounts = useQuery({ queryKey: ["trading-accounts"], queryFn: () => listTradingAccounts() });
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["trading-accounts"] });

  const [provider, setProvider] = useState<string>("futu");
  const [nickname, setNickname] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [ack, setAck] = useState(false);
  const [makeDefault, setMakeDefault] = useState(false);
  const [useForData, setUseForData] = useState(true);
  const [disconnectId, setDisconnectId] = useState<string | null>(null);

  const meta = useMemo(() => providerMeta(provider)!, [provider]);
  const setField = (id: string, v: string) => setFields((f) => ({ ...f, [id]: v }));

  const connect = useMutation({
    mutationFn: () =>
      connectTradingAccount({
        data: {
          provider,
          nickname,
          currency: meta.currency,
          fields,
          acknowledged: ack,
          makeDefault,
          useForData: useForData && meta.dataCapable,
        },
      }),
    onSuccess: () => {
      toast.success(`${meta.label} account linked`);
      setFields({});
      setNickname("");
      setAck(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const paper = useMutation({
    mutationFn: () => createPaperAccount(),
    onSuccess: (r) => {
      toast.success(r.created ? "Paper account created" : "You already have a paper account");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: (id: string) => testTradingAccount({ data: { id } }),
    onSuccess: (r) => {
      r.ok ? toast.success(r.message) : toast.error(r.message);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const makeDefaultMut = useMutation({
    mutationFn: (id: string) => setDefaultTradingAccount({ data: { id } }),
    onSuccess: () => {
      toast.success("Default account updated");
      invalidate();
    },
  });

  const dataToggle = useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) => toggleAccountDataSource({ data: v }),
    onSuccess: (r) => {
      toast.success(r.enabled ? "Account added as a market data source" : "Removed from market data sources");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = accounts.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trading accounts</h1>
        <p className="text-sm text-muted-foreground">
          Link the brokers and exchanges that hold your money. Credentials are encrypted before they are stored and are
          never shown again. Many brokers can also feed historical data into backtests.
        </p>
      </div>

      <Card className="border-border/70">
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" aria-hidden /> Paper trading account
            </CardTitle>
            <CardDescription>
              Simulated account with {fmtMoney(PAPER_STARTING_BALANCE, "USD")} virtual balance. Default for new models.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => paper.mutate()} disabled={paper.isPending}>
            {paper.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Create paper account
          </Button>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plug className="h-4 w-4" aria-hidden /> Connect a broker or exchange
            </CardTitle>
            <CardDescription>{meta.setup}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Venue</Label>
                <Select
                  value={provider}
                  onValueChange={(v) => {
                    setProvider(v);
                    setFields({});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label} · {p.region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nickname</Label>
                <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder={meta.label} />
              </div>
            </div>

            <ConnectionGuide meta={meta} />

            <div className="grid gap-3">

              {meta.fields.map((f) => (
                <div key={f.id} className="space-y-1.5">
                  <Label>
                    {f.label}
                    {f.required ? <span className="text-loss"> *</span> : null}
                  </Label>
                  {f.kind === "textarea" ? (
                    <Textarea
                      className="mono min-h-24 text-xs"
                      value={fields[f.id] ?? ""}
                      onChange={(e) => setField(f.id, e.target.value)}
                      placeholder={f.placeholder}
                    />
                  ) : (
                    <Input
                      className="mono"
                      type={f.kind === "password" ? "password" : "text"}
                      value={fields[f.id] ?? ""}
                      onChange={(e) => setField(f.id, e.target.value)}
                      placeholder={f.placeholder}
                    />
                  )}
                  {f.help ? <p className="text-xs text-muted-foreground">{f.help}</p> : null}
                </div>
              ))}
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" aria-hidden />
              <AlertTitle>Trade-only keys required</AlertTitle>
              <AlertDescription>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                  {PERMISSION_CHECKLIST.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs">
                  Secrets are encrypted with AES-GCM before being written to the database and are only decrypted inside
                  a signed request to your broker.
                </p>
              </AlertDescription>
            </Alert>

            {meta.dataCapable ? (
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={useForData} onCheckedChange={(v) => setUseForData(v === true)} />
                <span>
                  Also use this account as a market data source for backtests.
                  <span className="block text-xs text-muted-foreground">{meta.dataNote}</span>
                </span>
              </label>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} />
              <span>I confirm withdrawals are disabled on this key.</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={makeDefault} onCheckedChange={(v) => setMakeDefault(v === true)} />
              <span>Set as my default account</span>
            </label>

            <Button className="w-full" onClick={() => connect.mutate()} disabled={connect.isPending || !ack}>
              {connect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Connect account
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Linked accounts</CardTitle>
            <CardDescription>
              {rows.length} account{rows.length === 1 ? "" : "s"} · live link status and data usage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No accounts yet. Create the paper account to get started.</p>
            ) : (
              rows.map((a) => {
                const st = accountStatus(a);
                const pm = providerMeta(a.broker_name);
                return (
                  <div key={a.id} className="space-y-2 rounded-md border border-border/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {a.nickname || providerLabel(a.broker_name)}
                          {a.is_default ? <Badge variant="secondary">Default</Badge> : null}
                        </div>
                        <p className="mono text-xs text-muted-foreground">
                          {providerLabel(a.broker_name)} · {a.account_id ?? "—"} ·{" "}
                          {fmtMoney(Number(a.account_balance), a.currency ?? "USD")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {st.detail}
                          {a.last_synced_at ? ` · last checked ${new Date(a.last_synced_at).toLocaleString()}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline" className={toneClass[st.tone]}>
                        {st.tone === "error" ? (
                          <AlertTriangle className="mr-1 h-3 w-3" aria-hidden />
                        ) : (
                          <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden />
                        )}
                        {st.label}
                      </Badge>
                    </div>

                    {pm?.dataCapable ? (
                      <div className="flex items-center justify-between rounded border border-border/60 px-2.5 py-1.5">
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Database className="h-3.5 w-3.5" aria-hidden /> Use for backtest market data
                        </span>
                        <Switch
                          checked={Boolean(a.data_source?.enabled)}
                          onCheckedChange={(v) => dataToggle.mutate({ id: a.id, enabled: v })}
                        />
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => test.mutate(a.id)} disabled={test.isPending}>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Test connection
                      </Button>
                      {!a.is_default ? (
                        <Button size="sm" variant="ghost" onClick={() => makeDefaultMut.mutate(a.id)}>
                          <Star className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Make default
                        </Button>
                      ) : null}
                      <Button size="sm" variant="ghost" onClick={() => setDisconnectId(a.id)}>
                        <Unplug className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Disconnect
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
            <p className="pt-1 text-xs text-muted-foreground">
              Provider API keys for market data live under{" "}
              <Link to="/dashboard/data-sources" className="underline">
                Data sources
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>

      <DisconnectDialog
        id={disconnectId}
        onClose={() => setDisconnectId(null)}
        onDone={() => {
          setDisconnectId(null);
          invalidate();
        }}
      />
    </div>
  );
}

function DisconnectDialog({ id, onClose, onDone }: { id: string | null; onClose: () => void; onDone: () => void }) {
  const deps = useQuery({
    queryKey: ["account-deps", id],
    queryFn: () => getAccountDependencies({ data: { id: id! } }),
    enabled: Boolean(id),
  });

  const remove = useMutation({
    mutationFn: () => removeTradingAccount({ data: { id: id!, pauseStrategies: true } }),
    onSuccess: () => {
      toast.success("Account disconnected");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const d = deps.data;
  const risky = Boolean(d && (d.activeStrategies > 0 || d.openOrders > 0 || d.openPositions > 0));

  return (
    <Dialog open={Boolean(id)} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect this trading account?</DialogTitle>
          <DialogDescription>
            Stored credentials are deleted immediately. You can relink the account later with fresh API keys.
          </DialogDescription>
        </DialogHeader>

        {deps.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
        ) : risky ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            <AlertTitle>Active trading will be interrupted</AlertTitle>
            <AlertDescription className="space-y-1 text-xs">
              <p>
                {d!.activeStrategies} running strateg{d!.activeStrategies === 1 ? "y" : "ies"} · {d!.openOrders} working
                order{d!.openOrders === 1 ? "" : "s"} · {d!.openPositions} open position
                {d!.openPositions === 1 ? "" : "s"}.
              </p>
              <p>
                Running Algo and AI strategies on this account will be paused. Working orders and open positions stay
                with your broker and will no longer be managed by aiAlgo — close or transfer them yourself.
              </p>
              {d!.strategies.length > 0 ? (
                <ul className="list-disc pl-4">
                  {d!.strategies.map((s) => (
                    <li key={s.id}>
                      {s.name} ({s.kind === "ai_model" ? "AI model" : "Algo"}) — {s.status}
                    </li>
                  ))}
                </ul>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-sm text-muted-foreground">
            No active strategies, working orders or open positions are tied to this account.
            {d?.isDataSource ? " It will also stop being used as a backtest data source." : ""}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Keep account
          </Button>
          <Button variant="destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>
            {remove.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : (
              <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            )}
            Disconnect anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
