import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote, ExternalLink, Package, Plus } from "lucide-react";
import {
  getContributorProfile,
  listMyModels,
  saveContributorProfile,
  setModelStatus,
  publishModelVersion,
} from "@/lib/contributor.functions";
import { createConnectOnboardingLink } from "@/lib/marketplace-payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { MetricCard } from "@/components/metric-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setModelNamespace, setModelVisibility } from "@/lib/model-access.functions";
import { listMyTeams } from "@/lib/teams.functions";
import { VISIBILITY_OPTIONS, namespacedSlug, type ModelVisibility } from "@/lib/teams";
import { ModelAccessDialog } from "@/components/marketplace/model-access-dialog";
import { fmtDate, fmtMoney } from "@/lib/format";
import { PLATFORM_COMMISSION, pricingLabel } from "@/lib/marketplace";

export const Route = createFileRoute("/_authenticated/dashboard/models/")({
  component: ContributorDashboard,
});

function ContributorDashboard() {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["contributor-profile"], queryFn: () => getContributorProfile() });
  const mine = useQuery({ queryKey: ["my-models"], queryFn: () => listMyModels() });

  const totals = useMemo(() => {
    const tx = mine.data?.transactions ?? [];
    const month = new Date().toISOString().slice(0, 7);
    const thisMonth = tx.filter((t) => String(t.created_at).startsWith(month));
    const sum = (rows: typeof tx) => rows.reduce((a, t) => a + Number(t.net_amount), 0);
    const pending = (mine.data?.payouts ?? [])
      .filter((p) => p.status !== "paid")
      .reduce((a, p) => a + Number(p.amount), 0);
    return { month: sum(thisMonth), all: sum(tx), pending, executions: tx.length };
  }, [mine.data]);

  if (!profile.data) {
    return <ContributorOnboarding onDone={() => void qc.invalidateQueries()} />;
  }

  const models = mine.data?.models ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contributor dashboard</h1>
          <p className="text-sm text-muted-foreground">
            You keep {Math.round((1 - PLATFORM_COMMISSION) * 100)}% of every sale. Payouts run monthly.
          </p>
        </div>
        <div className="flex gap-2">
          <PayoutButton />
          <Button asChild>
            <Link to="/dashboard/models/new">
              <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Submit a model
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricCard label="Earnings this month" value={fmtMoney(totals.month)} tone="profit" />
        <MetricCard label="All-time earnings" value={fmtMoney(totals.all)} />
        <MetricCard label="Pending payout" value={fmtMoney(totals.pending)} tone="warning" />
        <MetricCard label="Transactions" value={totals.executions.toLocaleString()} />
      </div>

      <Tabs defaultValue="models">
        <TabsList>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="mt-4 space-y-3">
          {models.length === 0 ? (
            <EmptyState
              icon={<Package className="h-6 w-6" aria-hidden />}
              title="No models yet"
              description="Submit your first model to start earning from the marketplace."
            />
          ) : (
            models.map((m) => <ModelRow key={m.id} model={m} onChanged={() => void qc.invalidateQueries()} />)
          )}
        </TabsContent>

        <TabsContent value="revenue" className="mt-4">
          <Card className="border-border/70">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(mine.data?.transactions ?? []).slice(0, 100).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="mono text-xs">{fmtDate(t.created_at)}</TableCell>
                      <TableCell>{t.model_name}</TableCell>
                      <TableCell className="mono text-right">{fmtMoney(Number(t.gross_amount), t.currency)}</TableCell>
                      <TableCell className="mono text-right text-loss">
                        -{fmtMoney(Number(t.commission_amount), t.currency)}
                      </TableCell>
                      <TableCell className="mono text-right text-profit">
                        {fmtMoney(Number(t.net_amount), t.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="mt-4">
          <Card className="border-border/70">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(mine.data?.payouts ?? []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="mono">{p.period}</TableCell>
                      <TableCell className="mono text-right">{fmtMoney(Number(p.amount), p.currency)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={p.status === "paid" ? "secondary" : "outline"}>{p.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions" className="mt-4 space-y-3">
          {(mine.data?.submissions ?? []).map((s) => (
            <Card key={s.id} className="border-border/70">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="text-sm font-medium">Submission {s.id.slice(0, 8)}</div>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(s.created_at)} {s.reviewer_notes ? `· ${s.reviewer_notes}` : ""}
                  </p>
                </div>
                <Badge variant="outline">{String(s.status).replace(/_/g, " ")}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ModelRow({
  model,
  onChanged,
}: {
  model: {
    id: string;
    slug: string;
    name: string;
    status: string;
    active_users: number;
    price: number;
    currency: string;
    pricing_model: string;
    visibility?: ModelVisibility;
    team_id?: string | null;
  };
  onChanged: () => void;
}) {
  const [version, setVersion] = useState("");
  const [changelog, setChangelog] = useState("");
  const teams = useQuery({ queryKey: ["my-teams"], queryFn: () => listMyTeams() });
  const teamSlug = (teams.data ?? []).find((t) => t.id === model.team_id)?.slug ?? null;
  const visibility: ModelVisibility = model.visibility ?? "public";

  const status = useMutation({
    mutationFn: (s: "live" | "paused" | "delisted") => setModelStatus({ data: { modelId: model.id, status: s } }),
    onSuccess: () => {
      toast.success("Model updated");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const release = useMutation({
    mutationFn: () => publishModelVersion({ data: { modelId: model.id, version, changelog } }),
    onSuccess: () => {
      toast.success("New version published");
      setVersion("");
      setChangelog("");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-border/70">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{model.name}</span>
            <Badge variant="outline">{String(model.status).replace(/_/g, " ")}</Badge>
          </div>
          <p className="mono mt-1 text-xs text-muted-foreground">
            {namespacedSlug(teamSlug, model.slug)} ·{" "}
            {pricingLabel(model.pricing_model as never, Number(model.price), model.currency)} ·{" "}
            {model.active_users.toLocaleString()} active users
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Select
              value={model.team_id ?? "none"}
              onValueChange={async (v) => {
                try {
                  await setModelNamespace({ data: { modelId: model.id, teamId: v === "none" ? null : v } });
                  toast.success("Namespace updated");
                  onChanged();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not update namespace");
                }
              }}
            >
              <SelectTrigger className="h-8 w-44">
                <SelectValue placeholder="Personal namespace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Personal namespace</SelectItem>
                {(teams.data ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={visibility}
              onValueChange={async (v) => {
                try {
                  await setModelVisibility({ data: { modelId: model.id, visibility: v as ModelVisibility } });
                  toast.success("Visibility updated");
                  onChanged();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not update visibility");
                }
              }}
            >
              <SelectTrigger className="h-8 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ModelAccessDialog modelId={model.id} modelName={model.name} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/models/$slug" params={{ slug: model.slug }}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden /> View listing
            </Link>
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                New version
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Publish new version of {model.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Version</Label>
                  <Input className="mono" placeholder="1.1.0" value={version} onChange={(e) => setVersion(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Changelog</Label>
                  <Textarea value={changelog} onChange={(e) => setChangelog(e.target.value)} rows={4} />
                </div>
                <Button className="w-full" onClick={() => release.mutate()} disabled={release.isPending || !version}>
                  Publish
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          {model.status === "live" ? (
            <Button variant="outline" size="sm" onClick={() => status.mutate("paused")}>
              Pause
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => status.mutate("live")}>
              Resume
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-loss" onClick={() => status.mutate("delisted")}>
            Delist
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PayoutButton() {
  const onboard = useMutation({
    mutationFn: async () => {
      const res = await createConnectOnboardingLink({
        data: { returnUrl: `${window.location.origin}/dashboard/models`, environment: getStripeEnvironment() },
      });
      if ("error" in res) throw new Error(res.error);
      return res.url;
    },
    onSuccess: (url) => window.open(url, "_blank", "noopener"),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Button variant="outline" onClick={() => onboard.mutate()} disabled={onboard.isPending}>
      <Banknote className="mr-1.5 h-4 w-4" aria-hidden /> Payout settings
    </Button>
  );
}

function ContributorOnboarding({ onDone }: { onDone: () => void }) {
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("HK");
  const [payoutEmail, setPayoutEmail] = useState("");

  const save = useMutation({
    mutationFn: () => saveContributorProfile({ data: { handle, displayName, bio, country, payoutEmail } }),
    onSuccess: () => {
      toast.success("Contributor profile created");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Become a contributor</h1>
        <p className="text-sm text-muted-foreground">
          List your AI trading models and earn {Math.round((1 - PLATFORM_COMMISSION) * 100)}% of every sale.
        </p>
      </div>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Contributor profile</CardTitle>
          <CardDescription>This is what buyers see on your model cards.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Handle</Label>
            <Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="quant-lab" />
          </div>
          <div className="space-y-1.5">
            <Label>Display name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Quant Lab HK" />
          </div>
          <div className="space-y-1.5">
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Payout email</Label>
              <Input value={payoutEmail} onChange={(e) => setPayoutEmail(e.target.value)} type="email" />
            </div>
          </div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending || !handle || !displayName}>
            Create contributor profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
