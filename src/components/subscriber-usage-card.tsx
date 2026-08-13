import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { getSubscriberUsage } from "@/lib/execution.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Contributor-side breakdown of subscriber consumption, feeding commission calcs. */
export function SubscriberUsageCard() {
  const usage = useQuery({ queryKey: ["subscriber-usage"], queryFn: () => getSubscriberUsage() });
  const rows = usage.data?.models ?? [];

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" aria-hidden /> Subscriber usage breakdown
        </CardTitle>
        <CardDescription>How your subscribers are consuming each model this month.</CardDescription>
      </CardHeader>
      <CardContent>
        {usage.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading usage…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subscriber activity yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="p-2 text-left font-medium">Model</th>
                  <th className="p-2 text-right font-medium">Subscribers</th>
                  <th className="p-2 text-right font-medium">Active</th>
                  <th className="p-2 text-right font-medium">Signals (mo)</th>
                  <th className="p-2 text-right font-medium">Executions (mo)</th>
                  <th className="p-2 text-right font-medium">Subscriber days</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="border-t border-border/60">
                    <td className="p-2">{m.name}</td>
                    <td className="mono p-2 text-right">{m.subscribers}</td>
                    <td className="mono p-2 text-right">{m.activeSubscribers}</td>
                    <td className="mono p-2 text-right">{m.signalsThisMonth}</td>
                    <td className="mono p-2 text-right">{m.executionsThisMonth}</td>
                    <td className="mono p-2 text-right">{m.subscriberDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
