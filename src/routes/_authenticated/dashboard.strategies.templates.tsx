import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/dashboard/strategies/templates")({
  head: () => ({
    meta: [
      { title: "Strategy templates — aiAlgo" },
      { name: "description", content: "Proven starting points: mean reversion, trend following, grid and more." },
    ],
  }),
  component: Templates,
});

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  risk_level: string | null;
  market_condition: string | null;
  graph: unknown;
  parameters: unknown;
};

function Templates() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [cloning, setCloning] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("strategies")
        .select("id,name,description,category,risk_level,market_condition,graph,parameters")
        .eq("is_template", true)
        .order("name");
      if (error) throw new Error(error.message);
      return (rows ?? []) as Template[];
    },
  });

  const categories = ["all", ...new Set((data ?? []).map((t) => t.category))];
  const visible = (data ?? []).filter((t) => filter === "all" || t.category === filter);

  const clone = async (t: Template) => {
    setCloning(t.id);
    const { data: userData } = await supabase.auth.getUser();
    const { data: created, error } = await supabase
      .from("strategies")
      .insert({
        user_id: userData.user?.id ?? "",
        name: t.name,
        description: t.description,
        category: t.category,
        risk_level: t.risk_level,
        market_condition: t.market_condition,
        graph: t.graph as never,
        parameters: t.parameters as never,
        parent_strategy_id: t.id,
        is_template: false,
        is_public: false,
      })
      .select("id")
      .single();
    setCloning(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${t.name} added to your library`);
    navigate({ to: "/dashboard/strategies/builder", search: { id: created.id } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Strategy templates</h1>
        <p className="text-sm text-muted-foreground">
          Battle-tested structures you can clone, tune and backtest in minutes.
        </p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          {categories.map((c) => (
            <TabsTrigger key={c} value={c} className="capitalize">
              {c}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => (
            <Card key={t.id} className="flex flex-col border-border/70">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge variant="secondary" className="capitalize">
                    {t.risk_level ?? "medium"} risk
                  </Badge>
                </div>
                <CardDescription>{t.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="capitalize">
                    {t.category}
                  </Badge>
                  {t.market_condition ? (
                    <Badge variant="outline" className="capitalize">
                      {t.market_condition} market
                    </Badge>
                  ) : null}
                </div>
                <Button className="w-full" onClick={() => clone(t)} disabled={cloning === t.id}>
                  {cloning === t.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                  )}
                  Use this template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
