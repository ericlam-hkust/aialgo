import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { getWallet } from "@/lib/marketplace-payments.functions";
import { MetricCard } from "@/components/metric-card";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate, fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/wallet")({
  component: WalletPage,
});

function WalletPage() {
  const { data } = useQuery({ queryKey: ["wallet"], queryFn: () => getWallet() });
  const purchases = data?.purchases ?? [];
  const transactions = data?.transactions ?? [];
  const spent = purchases.reduce((a, p) => a + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
        <p className="text-sm text-muted-foreground">Credits, model purchases and transaction history.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Credit balance" value={fmtMoney(data?.balance ?? 0, data?.currency ?? "HKD")} />
        <MetricCard label="Total spent on models" value={fmtMoney(spent)} />
        <MetricCard label="Active unlocks" value={purchases.length.toLocaleString()} />
      </div>

      <Tabs defaultValue="purchases">
        <TabsList>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="mt-4">
          {purchases.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-6 w-6" aria-hidden />}
              title="No purchases yet"
              description="Unlock a model from the marketplace to see it here."
            />
          ) : (
            <Card className="border-border/70">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="mono text-xs">{fmtDate(p.created_at)}</TableCell>
                        <TableCell>{p.model?.name ?? "—"}</TableCell>
                        <TableCell className="text-xs">{String(p.pricing_model).replace(/_/g, " ")}</TableCell>
                        <TableCell className="mono text-right">{fmtMoney(Number(p.amount), p.currency)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{p.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card className="border-border/70">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="mono text-xs">{fmtDate(t.created_at)}</TableCell>
                      <TableCell>{t.model_name}</TableCell>
                      <TableCell className="text-xs">{String(t.kind).replace(/_/g, " ")}</TableCell>
                      <TableCell className="mono text-right">{fmtMoney(Number(t.gross_amount), t.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
