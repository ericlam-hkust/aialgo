import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, Plug, Star, Trash2, Wallet } from "lucide-react";
import {
  connectTradingAccount,
  createPaperAccount,
  listTradingAccounts,
  removeTradingAccount,
  setDefaultTradingAccount,
  testTradingAccount,
} from "@/lib/trading-accounts.functions";
import { ACCOUNT_PROVIDERS, PAPER_STARTING_BALANCE, PERMISSION_CHECKLIST, providerLabel } from "@/lib/trading-accounts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fmtMoney } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrokersPanel } from "@/components/brokers-panel";

export const Route = createFileRoute("/_authenticated/dashboard/accounts")({
  component: AccountsPage,
  head: () => ({
    meta: [
      { title: "Trading Accounts — aiAlgo" },
      { name: "description", content: "Link your broker and exchange accounts, or trade models risk-free on the built-in paper account." },
      { property: "og:title", content: "Trading Accounts — aiAlgo" },
      { property: "og:description", content: "Link brokers and exchanges with trade-only API keys, or use the paper account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function AccountsPage() {
  const qc = useQueryClient();
  const accounts = useQuery({ queryKey: ["trading-accounts"], queryFn: () => listTradingAccounts() });
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["trading-accounts"] });

  const [provider, setProvider] = useState<string>("binance");
  const [nickname, setNickname] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [ack, setAck] = useState(false);
  const [makeDefault, setMakeDefault] = useState(false);
  const [tested, setTested] = useState<Record<string, string>>({});

  const connect = useMutation({
    mutationFn: () =>
      connectTradingAccount({
        data: {
          provider,
          nickname,
          apiKey,
          apiSecret,
          currency: ACCOUNT_PROVIDERS.find((p) => p.value === provider)?.currency ?? "USD",
          acknowledged: ack,
          makeDefault,
        },
      }),
    onSuccess: () => {
      toast.success("Account connected");
      setApiKey("");
      setApiSecret("");
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
    onSuccess: (r, id) => {
      setTested((t) => ({ ...t, [id]: `${r.nickname} · ${r.accountId} · ${fmtMoney(r.balance, r.currency)}` }));
      r.ok ? toast.success(r.message) : toast.error(r.message);
      invalidate();
    },
  });

  const makeDefaultMut = useMutation({
    mutationFn: (id: string) => setDefaultTradingAccount({ data: { id } }),
    onSuccess: () => {
      toast.success("Default account updated");
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeTradingAccount({ data: { id } }),
    onSuccess: () => {
      toast.success("Account removed");
      invalidate();
    },
  });

  const rows = accounts.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trading accounts</h1>
        <p className="text-sm text-muted-foreground">
          Where your orders and balances live. Use <strong>Accounts</strong> for the paper account and exchange API keys,
          and <strong>Broker sync</strong> for IBKR, Futu and Tiger. Market data provider keys live under Build &rarr; Data.
        </p>
      </div>

      <Tabs defaultValue="accounts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="sync">Broker sync</TabsTrigger>
        </TabsList>
        <TabsContent value="sync">
          <BrokersPanel />
        </TabsContent>
        <TabsContent value="accounts" className="space-y-6">

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

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plug className="h-4 w-4" aria-hidden /> Connect a broker or exchange
            </CardTitle>
            <CardDescription>Mock integrations — no real orders are placed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Venue</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nickname</Label>
                <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Main trading" />
              </div>
              <div className="space-y-1.5">
                <Label>API key</Label>
                <Input className="mono" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>API secret</Label>
                <Input
                  className="mono"
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                />
              </div>
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
              </AlertDescription>
            </Alert>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} />
              <span>I confirm withdrawals are disabled on this key.</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={makeDefault} onCheckedChange={(v) => setMakeDefault(v === true)} />
              <span>Set as my default account</span>
            </label>

            <Button className="w-full" onClick={() => connect.mutate()} disabled={connect.isPending}>
              {connect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Connect account
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Your accounts</CardTitle>
            <CardDescription>{rows.length} linked</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No accounts yet. Create the paper account to get started.</p>
            ) : (
              rows.map((a) => (
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
                    </div>
                    <Badge variant={a.status === "error" ? "destructive" : "outline"}>
                      {a.status === "error" ? (
                        <AlertTriangle className="mr-1 h-3 w-3" aria-hidden />
                      ) : (
                        <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden />
                      )}
                      {a.status}
                    </Badge>
                  </div>
                  {tested[a.id] ? <p className="mono text-xs text-profit">{tested[a.id]}</p> : null}
                  {a.last_error ? <p className="text-xs text-loss">{a.last_error}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => test.mutate(a.id)} disabled={test.isPending}>
                      Test connection
                    </Button>
                    {!a.is_default ? (
                      <Button size="sm" variant="ghost" onClick={() => makeDefaultMut.mutate(a.id)}>
                        <Star className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Make default
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(a.id)}>
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Remove
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
