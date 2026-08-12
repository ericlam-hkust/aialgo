import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlugZap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/brokers")({
  component: Brokers,
});

const BROKERS = [
  { name: "Interactive Brokers", region: "Global", note: "Multi-market access with low FX costs." },
  { name: "Futu / moomoo", region: "Hong Kong", note: "Popular with HK retail traders for HK and US equities." },
  { name: "Tiger Brokers", region: "Asia", note: "HK, US and A-share coverage." },
];

function Brokers() {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["brokers"],
    queryFn: async () => (await supabase.from("broker_connections").select("*")).data ?? [],
  });

  const connect = async (name: string) => {
    const uid = (await supabase.auth.getUser()).data.user?.id ?? "";
    const { error } = await supabase.from("broker_connections").insert({
      user_id: uid,
      broker_name: name,
      status: "simulated",
      account_balance: 1_000_000,
      buying_power: 1_000_000,
      last_synced_at: new Date().toISOString(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${name} connected in simulation mode`);
    qc.invalidateQueries({ queryKey: ["brokers"] });
  };

  const disconnect = async (id: string) => {
    const { error } = await supabase.from("broker_connections").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Broker disconnected");
    qc.invalidateQueries({ queryKey: ["brokers"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Broker connections</h1>
        <p className="text-sm text-muted-foreground">Link a broker profile to mirror its balance in simulation.</p>
      </div>

      <Alert>
        <PlugZap className="h-4 w-4" aria-hidden />
        <AlertTitle>Simulation only</AlertTitle>
        <AlertDescription>
          Connections are mocked for demonstration. No credentials are transmitted and no live orders are placed.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        {BROKERS.map((b) => {
          const existing = data?.find((c) => c.broker_name === b.name);
          return (
            <Card key={b.name} className="flex flex-col border-border/70">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{b.name}</CardTitle>
                  <Badge variant={existing ? "default" : "outline"}>{existing ? "Connected" : b.region}</Badge>
                </div>
                <CardDescription>{b.note}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                {existing ? (
                  <>
                    <p className="mono text-sm">{fmtMoney(Number(existing.account_balance))}</p>
                    <Button variant="outline" className="w-full" onClick={() => disconnect(existing.id)}>
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button className="w-full" onClick={() => connect(b.name)}>
                    Connect
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
