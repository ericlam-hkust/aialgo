import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Loader2 } from "lucide-react";
import { getPlatformRevenue } from "@/lib/revenue.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usd } from "@/lib/monetization";

export const Route = createFileRoute("/_authenticated/dashboard/admin/revenue")({
  component: AdminRevenuePage,
  head: () => ({
    meta: [
      { title: "Platform revenue — AlgoForge admin" },
      { name: "description", content: "Revenue, cost and margin by stream across commissions, compute, gateway and data." },
      { property: "og:title", content: "Platform revenue — AlgoForge admin" },
      { property: "og:description", content: "Admin view of aiAlgo platform economics and MRR trend." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function AdminRevenuePage() {
  const q = useQuery({ queryKey: ["platform-revenue"], queryFn: () => getPlatformRevenue({ data: { days: 180 } }) });

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading revenue…
      </div>
    );
  }
  if (q.error) {
    return <p className="text-sm text-loss">{(q.error as Error).message}</p>;
  }

  const d = q.data!;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <BarChart3 className="h-5 w-5 text-primary" aria-hidden /> Platform revenue
        </h1>
        <p className="text-sm text-muted-foreground">Last 180 days across every monetization stream.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Revenue" value={usd(d.revenue)} />
        <Metric label="Infra cost" value={usd(d.cost)} />
        <Metric label="Margin" value={usd(d.margin)} tone />
        <Metric label="Latest month" value={usd(d.mrr)} />
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Monthly revenue vs cost</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.trend}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v: number) => usd(Number(v))} />
              <Bar dataKey="revenue" fill="hsl(var(--chart-1, 160 70% 45%))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">By stream</CardTitle>
          <CardDescription>Commission, hosted compute, signal gateway, data feeds and referrals.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stream</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.totals.map((t) => (
                <TableRow key={t.category}>
                  <TableCell className="capitalize">{t.category.replace(/_/g, " ")}</TableCell>
                  <TableCell className="mono">{usd(t.revenue)}</TableCell>
                  <TableCell className="mono">{usd(t.cost)}</TableCell>
                  <TableCell className="mono text-right text-profit">{usd(t.margin)}</TableCell>
                </TableRow>
              ))}
              {d.totals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No revenue events recorded yet.
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

function Metric({ label, value, tone }: { label: string; value: string; tone?: boolean }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={`mono text-2xl ${tone ? "text-profit" : ""}`}>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
