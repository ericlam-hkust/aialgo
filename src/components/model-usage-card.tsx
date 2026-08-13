import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { getMyUsageMetering } from "@/lib/execution.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/** Consumer-side "Model usage this month" panel, fed by execution metering. */
export function ModelUsageCard() {
  const usage = useQuery({ queryKey: ["usage-metering"], queryFn: () => getMyUsageMetering() });
  const rows = usage.data?.rows ?? [];
  const totals = usage.data?.totals;

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" aria-hidden /> Model usage this month
        </CardTitle>
        <CardDescription>Signals consumed, executions and days active per model.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {totals ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{totals.activeModels} active models</Badge>
            <Badge variant="secondary">{totals.signals} signals</Badge>
            <Badge variant="secondary">{totals.executions} executions</Badge>
            <Badge variant="outline">{totals.blocked} blocked by risk engine</Badge>
          </div>
        ) : null}
        {usage.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading usage…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No models activated yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="p-2 text-left font-medium">Model</th>
                  <th className="p-2 text-right font-medium">Signals</th>
                  <th className="p-2 text-right font-medium">Executions</th>
                  <th className="p-2 text-right font-medium">Blocked</th>
                  <th className="p-2 text-right font-medium">Days active</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.activationId} className="border-t border-border/60">
                    <td className="p-2">{r.modelName}</td>
                    <td className="mono p-2 text-right">{r.signals}</td>
                    <td className="mono p-2 text-right">{r.executions}</td>
                    <td className="mono p-2 text-right">{r.blocked}</td>
                    <td className="mono p-2 text-right">{r.daysActive}</td>
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
