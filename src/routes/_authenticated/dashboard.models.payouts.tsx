import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote, Download, ExternalLink, FileText, ShieldCheck } from "lucide-react";
import { getPayoutOverview, setTaxFormStatus } from "@/lib/contributor.functions";
import { createConnectOnboardingLink, refreshConnectStatus } from "@/lib/marketplace-payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { MetricCard } from "@/components/metric-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubscriberUsageCard } from "@/components/subscriber-usage-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate, fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/models/payouts")({
  component: PayoutsPage,
});

type Tx = {
  id: string;
  model_id: string | null;
  model_name: string | null;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  currency: string;
  created_at: string;
};

function statusTone(status: string) {
  return status === "active" || status === "verified" || status === "submitted"
    ? "text-profit"
    : status === "in_review"
      ? "text-warning"
      : "text-muted-foreground";
}

function PayoutsPage() {
  const qc = useQueryClient();
  const overview = useQuery({ queryKey: ["payout-overview"], queryFn: () => getPayoutOverview() });

  const onboard = useMutation({
    mutationFn: async () => {
      const res = await createConnectOnboardingLink({
        data: { returnUrl: `${window.location.origin}/dashboard/models/payouts`, environment: getStripeEnvironment() },
      });
      if ("error" in res) throw new Error(res.error);
      window.location.href = res.url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refresh = useMutation({
    mutationFn: async () => {
      const res = await refreshConnectStatus({ data: { environment: getStripeEnvironment() } });
      if ("error" in res) throw new Error(res.error);
      return res.status;
    },
    onSuccess: (status) => {
      toast.success(`Payout account is ${status}`);
      void qc.invalidateQueries({ queryKey: ["payout-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tax = useMutation({
    mutationFn: (status: "not_started" | "submitted") => setTaxFormStatus({ data: { status } }),
    onSuccess: () => {
      toast.success("Tax form status updated");
      void qc.invalidateQueries({ queryKey: ["payout-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const transactions = (overview.data?.transactions ?? []) as Tx[];

  const months = useMemo(() => {
    const map = new Map<string, { period: string; gross: number; commission: number; net: number; count: number; currency: string }>();
    for (const t of transactions) {
      const period = String(t.created_at).slice(0, 7);
      const row = map.get(period) ?? { period, gross: 0, commission: 0, net: 0, count: 0, currency: t.currency };
      row.gross += Number(t.gross_amount);
      row.commission += Number(t.commission_amount);
      row.net += Number(t.net_amount);
      row.count += 1;
      map.set(period, row);
    }
    return [...map.values()].sort((a, b) => b.period.localeCompare(a.period));
  }, [transactions]);

  const perModel = useMemo(() => {
    const map = new Map<string, { name: string; gross: number; net: number; count: number }>();
    for (const t of transactions) {
      const key = t.model_name ?? "Unknown";
      const row = map.get(key) ?? { name: key, gross: 0, net: 0, count: 0 };
      row.gross += Number(t.gross_amount);
      row.net += Number(t.net_amount);
      row.count += 1;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.net - a.net);
  }, [transactions]);

  const downloadStatement = (period: string) => {
    const rows = transactions.filter((t) => String(t.created_at).startsWith(period));
    const header = "date,model,gross,commission,net,currency";
    const body = rows
      .map((t) =>
        [
          String(t.created_at).slice(0, 10),
          `"${(t.model_name ?? "").replace(/"/g, '""')}"`,
          Number(t.gross_amount).toFixed(2),
          Number(t.commission_amount).toFixed(2),
          Number(t.net_amount).toFixed(2),
          t.currency,
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aialgo-statement-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (overview.isLoading) return <p className="text-sm text-muted-foreground">Loading payout details…</p>;

  if (!overview.data) {
    return (
      <EmptyState
        icon={<Banknote className="h-6 w-6" aria-hidden />}
        title="Create your contributor profile first"
        description="Set up your handle and display name before connecting a payout account."
        action={
          <Button asChild>
            <Link to="/dashboard/models">Go to contributor dashboard</Link>
          </Button>
        }
      />
    );
  }

  const c = overview.data.contributor;
  const thisMonth = months[0]?.net ?? 0;
  const allTime = transactions.reduce((a, t) => a + Number(t.net_amount), 0);
  const pending = (overview.data.payouts ?? [])
    .filter((p) => p.status !== "paid")
    .reduce((a, p) => a + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payouts & compliance</h1>
        <p className="text-sm text-muted-foreground">
          Connect your payout account, complete verification, and download monthly statements.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricCard label="This month (net)" value={fmtMoney(thisMonth)} tone="profit" />
        <MetricCard label="All-time (net)" value={fmtMoney(allTime)} />
        <MetricCard label="Pending payout" value={fmtMoney(pending)} tone="warning" />
        <MetricCard label="Models earning" value={String(perModel.length)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="h-4 w-4" aria-hidden /> Payout account
            </CardTitle>
            <CardDescription>Stripe Connect Express handles payouts and bank details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Status" value={c.payout_status} tone={statusTone(c.payout_status)} />
            <Row label="Country" value={c.country ?? "HK"} />
            <Row label="Payout email" value={c.payout_email ?? "—"} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onboard.mutate()} disabled={onboard.isPending}>
                {c.stripe_account_id ? "Continue onboarding" : "Start onboarding"}
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
              </Button>
              <Button size="sm" variant="outline" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
                Refresh status
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" aria-hidden /> Identity (KYC)
            </CardTitle>
            <CardDescription>Verification is handled inside the Stripe onboarding flow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="KYC status" value={c.kyc_status.replace(/_/g, " ")} tone={statusTone(c.kyc_status)} />
            <Row label="Profile verified" value={c.verified ? "Yes" : "Not yet"} />
            <p className="text-xs text-muted-foreground">
              Payouts stay on hold until identity checks clear. Refresh the status after finishing onboarding.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" aria-hidden /> Tax form
            </CardTitle>
            <CardDescription>Required before your first payout is released.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row
              label="Form status"
              value={c.tax_form_status.replace(/_/g, " ")}
              tone={statusTone(c.tax_form_status)}
            />
            <Row label="Submitted" value={c.tax_form_submitted_at ? fmtDate(c.tax_form_submitted_at) : "—"} />
            {c.tax_form_status === "submitted" ? (
              <Button size="sm" variant="outline" onClick={() => tax.mutate("not_started")}>
                Reset form
              </Button>
            ) : (
              <>
                <p className="text-xs text-warning">Reminder: submit your tax form to avoid withheld payouts.</p>
                <Button size="sm" onClick={() => tax.mutate("submitted")}>
                  Mark tax form submitted
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Monthly statements</CardTitle>
          <CardDescription>Download a CSV statement for your records.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Statement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    No earnings recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                months.map((m) => (
                  <TableRow key={m.period}>
                    <TableCell className="mono">{m.period}</TableCell>
                    <TableCell className="mono text-right">{m.count}</TableCell>
                    <TableCell className="mono text-right">{fmtMoney(m.gross, m.currency)}</TableCell>
                    <TableCell className="mono text-right text-loss">-{fmtMoney(m.commission, m.currency)}</TableCell>
                    <TableCell className="mono text-right text-profit">{fmtMoney(m.net, m.currency)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => downloadStatement(m.period)}>
                        <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden /> CSV
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Earnings by model</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perModel.map((m) => (
                <TableRow key={m.name}>
                  <TableCell>{m.name}</TableCell>
                  <TableCell className="mono text-right">{m.count}</TableCell>
                  <TableCell className="mono text-right">{fmtMoney(m.gross)}</TableCell>
                  <TableCell className="mono text-right text-profit">{fmtMoney(m.net)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SubscriberUsageCard />

      <div className="flex justify-end">
        <Badge variant="outline">Payout batches run monthly</Badge>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${tone ?? ""}`}>{value}</span>
    </div>
  );
}
