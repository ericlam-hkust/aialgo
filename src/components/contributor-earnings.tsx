import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Gift, Loader2, Store, TrendingUp } from "lucide-react";
import { getContributorBilling } from "@/lib/compute.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CONTRIBUTOR_FREE_ITEMS,
  PRO_CREATOR_THRESHOLD,
  proCreatorProgress,
  splitFor,
  usd,
} from "@/lib/monetization";

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "profit" }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={`mono text-2xl ${tone === "profit" ? "text-profit" : ""}`}>{value}</CardTitle>
      </CardHeader>
      {hint ? <CardContent className="text-xs text-muted-foreground">{hint}</CardContent> : null}
    </Card>
  );
}

/** Earnings section — rendered only for users who have a contributor profile. */
export function ContributorEarnings() {
  const q = useQuery({ queryKey: ["contributor-billing"], queryFn: () => getContributorBilling() });
  const data = q.data;

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading earnings…
      </div>
    );
  }

  if (!data?.contributor) {
    return (
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="h-4 w-4 text-primary" aria-hidden /> Start selling your strategies
          </CardTitle>
          <CardDescription>
            Publishing is free. You keep 80% of every performance fee your models and algos collect — 85% once you
            become a Pro Creator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/dashboard/settings">Become a contributor</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const txns = (data.transactions ?? []) as Array<Record<string, unknown>>;
  const payouts = (data.payouts ?? []) as Array<Record<string, unknown>>;
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthGross = txns
    .filter((t) => String(t["created_at"]).slice(0, 7) === monthKey)
    .reduce((s, t) => s + Number(t["gross_amount"] ?? 0), 0);
  const split = splitFor(monthGross, monthGross);
  const progress = proCreatorProgress(monthGross);
  const profile = data.profile as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Gross fees this month" value={usd(monthGross)} />
        <Stat label="Platform commission" value={usd(split.commission)} hint={`${Math.round(split.rate * 100)}% rate`} />
        <Stat label="Net to you" value={usd(split.net)} tone="profit" />
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden /> Pro Creator status
          </CardTitle>
          <CardDescription>
            Cross {usd(PRO_CREATOR_THRESHOLD, 0)} in collected performance fees in a month and your commission drops
            from 20% to 15%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={Math.round(progress.pct * 100)} />
          <p className="text-xs text-muted-foreground">
            {split.proCreator
              ? `Pro Creator active — you saved ${usd(split.tierBonus)} this month.`
              : `${usd(progress.remaining)} of collected fees to go.`}
          </p>
        </CardContent>
      </Card>

      <Card className="border-profit/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4 text-profit" aria-hidden /> Free for creators, forever
          </CardTitle>
          <CardDescription>
            No listing fees, no hosting fees — for AI models and algo strategies alike. The platform earns only when you
            earn.
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
          <CardTitle className="text-base">Recent fee transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Listing</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead className="text-right">Net to you</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txns.slice(0, 12).map((t) => (
                <TableRow key={String(t["id"])}>
                  <TableCell className="mono">{new Date(String(t["created_at"])).toLocaleDateString()}</TableCell>
                  <TableCell>{(t["model_name"] as string) ?? "—"}</TableCell>
                  <TableCell className="mono">{usd(Number(t["gross_amount"] ?? 0))}</TableCell>
                  <TableCell className="mono text-right text-profit">{usd(Number(t["net_amount"] ?? 0))}</TableCell>
                </TableRow>
              ))}
              {txns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No fees collected yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Payout history</CardTitle>
            <CardDescription>Payouts settle automatically via Stripe Connect, net of commission.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {profile ? (
              <>
                <Badge variant="outline">Payouts: {String(profile["payout_status"] ?? "—")}</Badge>
                <Badge variant="outline">KYC: {String(profile["kyc_status"] ?? "—")}</Badge>
                <Badge variant="outline">Tax: {String(profile["tax_form_status"] ?? "—")}</Badge>
              </>
            ) : null}
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard/models/payouts">Payout settings</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((p) => (
                <TableRow key={String(p["id"])}>
                  <TableCell className="mono">{String(p["period"])}</TableCell>
                  <TableCell className="mono">{usd(Number(p["amount"] ?? 0))}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{String(p["status"])}</Badge>
                  </TableCell>
                  <TableCell className="mono text-right">
                    {p["paid_at"] ? new Date(String(p["paid_at"])).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No payouts yet.
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
