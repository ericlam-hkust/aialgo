import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/marketplace")({
  component: Marketplace,
});

function Marketplace() {
  const { data } = useQuery({
    queryKey: ["marketplace"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("strategies")
        .select("id,name,description,category,risk_level,rating,subscriber_count,price,creator_name,graph,parameters")
        .eq("is_public", true)
        .order("subscriber_count", { ascending: false });
      return rows ?? [];
    },
  });

  const subscribe = async (row: NonNullable<typeof data>[number]) => {
    const uid = (await supabase.auth.getUser()).data.user?.id ?? "";
    const { error } = await supabase.from("marketplace_subscriptions").insert({
      subscriber_id: uid,
      strategy_id: row.id,
      price_paid: Number(row.price),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("strategies").insert({
      user_id: uid,
      name: row.name,
      description: row.description,
      category: row.category,
      risk_level: row.risk_level,
      graph: row.graph as never,
      parameters: row.parameters as never,
      parent_strategy_id: row.id,
      is_template: false,
      is_public: false,
    });
    toast.success(`${row.name} added to your library`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Marketplace</h1>
        <p className="text-sm text-muted-foreground">Community strategies you can clone into your own library.</p>
      </div>

      {(data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Store className="h-6 w-6" aria-hidden />}
          title="Nothing listed yet"
          description="Publish one of your own strategies from the library to be the first."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data!.map((row) => (
            <Card key={row.id} className="flex flex-col border-border/70">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{row.name}</CardTitle>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3.5 w-3.5 text-warning" aria-hidden />
                    {fmtNum(Number(row.rating), 1)}
                  </span>
                </div>
                <CardDescription className="line-clamp-2">{row.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="capitalize">{row.category}</Badge>
                  <Badge variant="secondary" className="capitalize">{row.risk_level ?? "medium"} risk</Badge>
                  <Badge variant="outline">{row.subscriber_count} subscribers</Badge>
                </div>
                <Button className="w-full" onClick={() => subscribe(row)}>
                  {Number(row.price) > 0 ? `Subscribe · HK$${fmtNum(Number(row.price), 0)}` : "Add free strategy"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
