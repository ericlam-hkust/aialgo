import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAdminOverview, reviewSubmission, setCommissionRate, setContributorVerified } from "@/lib/admin.functions";
import { MetricCard } from "@/components/metric-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate, fmtMoney } from "@/lib/format";
import { SUBMISSION_PIPELINE, type ModelListingStatus } from "@/lib/marketplace";

export const Route = createFileRoute("/_authenticated/dashboard/admin")({
  component: AdminPanel,
});

function AdminPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: () => getAdminOverview() });
  const [rate, setRate] = useState("");

  const commission = useMutation({
    mutationFn: () => setCommissionRate({ data: { rate: Number(rate) / 100 } }),
    onSuccess: () => {
      toast.success("Commission rate updated");
      void qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revenue = useMemo(() => {
    const rows = data && data.isAdmin ? data.transactions : [];
    const byMonth = new Map<string, number>();
    for (const t of rows) {
      const m = String(t.created_at).slice(0, 7);
      byMonth.set(m, (byMonth.get(m) ?? 0) + Number(t.commission_amount));
    }
    return [...byMonth.entries()].sort().map(([month, commission]) => ({ month, commission }));
  }, [data]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data?.isAdmin) {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-6 w-6" aria-hidden />}
        title="Admins only"
        description="Your account does not have the admin role."
      />
    );
  }

  const totalCommission = data.transactions.reduce((a, t) => a + Number(t.commission_amount), 0);
  const gross = data.transactions.reduce((a, t) => a + Number(t.gross_amount), 0);
  const pending = data.queue.filter((q) => q.status !== "live" && q.status !== "rejected").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Review queue, commissions, contributors and revenue.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricCard label="Gross marketplace volume" value={fmtMoney(gross)} />
        <MetricCard label="Commission earned" value={fmtMoney(totalCommission)} tone="profit" />
        <MetricCard label="Pending reviews" value={pending.toLocaleString()} tone="warning" />
        <MetricCard label="Commission rate" value={`${(data.commissionRate * 100).toFixed(0)}%`} />
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Review queue</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="contributors">Contributors</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4 space-y-3">
          {data.queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Queue is empty.</p>
          ) : (
            data.queue.map((s) => (
              <SubmissionCard key={s.id} submission={s} onDone={() => void qc.invalidateQueries({ queryKey: ["admin-overview"] })} />
            ))
          )}
        </TabsContent>

        <TabsContent value="revenue" className="mt-4 space-y-4">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Commission by month</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={70} />
                  <ReTooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="commission" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transactions.slice(0, 100).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="mono text-xs">{fmtDate(t.created_at)}</TableCell>
                      <TableCell>{t.model_name}</TableCell>
                      <TableCell className="mono text-right">{fmtMoney(Number(t.gross_amount), t.currency)}</TableCell>
                      <TableCell className="mono text-right text-profit">
                        {fmtMoney(Number(t.commission_amount), t.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contributors" className="mt-4">
          <Card className="border-border/70">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contributor</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Payouts</TableHead>
                    <TableHead className="text-right">Verified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.contributors.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <span className="font-medium">{c.display_name}</span>
                        <span className="mono block text-xs text-muted-foreground">@{c.handle}</span>
                      </TableCell>
                      <TableCell className="mono text-xs">{c.country ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.payout_status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <VerifyButton id={c.id} verified={c.verified} onDone={() => void qc.invalidateQueries({ queryKey: ["admin-overview"] })} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card className="max-w-md border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Commission rate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Platform commission (%)</Label>
                <Input
                  className="mono"
                  inputMode="decimal"
                  placeholder={(data.commissionRate * 100).toFixed(0)}
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              </div>
              <Button onClick={() => commission.mutate()} disabled={!rate || commission.isPending}>
                Save rate
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VerifyButton({ id, verified, onDone }: { id: string; verified: boolean; onDone: () => void }) {
  const m = useMutation({
    mutationFn: () => setContributorVerified({ data: { contributorId: id, verified: !verified } }),
    onSuccess: onDone,
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Button variant={verified ? "secondary" : "outline"} size="sm" onClick={() => m.mutate()} disabled={m.isPending}>
      {verified ? "Verified" : "Verify"}
    </Button>
  );
}

function SubmissionCard({
  submission,
  onDone,
}: {
  submission: {
    id: string;
    model_id: string;
    status: string;
    created_at: string;
    reviewer_notes: string | null;
    model: { name: string; slug: string; asset_class: string; strategy_type: string; price: number } | null;
  };
  onDone: () => void;
}) {
  const [status, setStatus] = useState<ModelListingStatus>("backtest_validation");
  const [notes, setNotes] = useState("");
  const m = useMutation({
    mutationFn: () =>
      reviewSubmission({ data: { submissionId: submission.id, modelId: submission.model_id, status, notes } }),
    onSuccess: () => {
      toast.success("Submission updated");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-border/70">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-medium">{submission.model?.name ?? "Unknown model"}</span>
            <p className="text-xs text-muted-foreground">
              {submission.model?.asset_class} · {submission.model?.strategy_type} · {fmtDate(submission.created_at)}
            </p>
          </div>
          <Badge variant="outline">{submission.status.replace(/_/g, " ")}</Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-[220px_1fr_auto]">
          <Select value={status} onValueChange={(v) => setStatus(v as ModelListingStatus)}>
            <SelectTrigger aria-label="New status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBMISSION_PIPELINE.map((s) => (
                <SelectItem key={s.status} value={s.status}>
                  {s.label}
                </SelectItem>
              ))}
              <SelectItem value="rejected">Reject</SelectItem>
            </SelectContent>
          </Select>
          <Textarea rows={1} placeholder="Reviewer notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
            Apply
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
