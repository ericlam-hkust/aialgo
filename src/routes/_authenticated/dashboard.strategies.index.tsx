import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Boxes, Copy, LineChart, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { DataTable, type Column } from "@/components/data-table";
import { fmtDate } from "@/lib/format";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listMyModels } from "@/lib/contributor.functions";
import { publishStrategyListing } from "@/lib/algo-listing.functions";

export const Route = createFileRoute("/_authenticated/dashboard/strategies/")({
  component: StrategyLibrary,
});

type Row = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  risk_level: string | null;
  is_public: boolean;
  updated_at: string;
};

function StrategyLibrary() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-strategies"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: rows, error } = await supabase
        .from("strategies")
        .select("id,name,category,description,risk_level,is_public,updated_at")
        .eq("user_id", userData.user?.id ?? "")
        .eq("is_template", false)
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (rows ?? []) as Row[];
    },
  });

  const myModels = useQuery({ queryKey: ["my-models"], queryFn: () => listMyModels() });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("strategies").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Strategy deleted");
      qc.invalidateQueries({ queryKey: ["my-strategies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: (row: Row) => publishStrategyListing({ data: { strategyId: row.id } }),
    onSuccess: (_res, row) => {
      qc.invalidateQueries({ queryKey: ["my-strategies"] });
      // Straight into the listing wizard: details → verified backtest → pricing → publish.
      navigate({ to: "/dashboard/strategies/list/$id", params: { id: row.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async (id: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: original, error } = await supabase.from("strategies").select("*").eq("id", id).single();
      if (error) throw new Error(error.message);
      const { error: insertError } = await supabase.from("strategies").insert({
        user_id: userData.user?.id ?? "",
        name: `${original.name} (copy)`,
        description: original.description,
        category: original.category,
        risk_level: original.risk_level,
        graph: original.graph,
        parameters: original.parameters,
        parent_strategy_id: original.id,
        is_template: false,
        is_public: false,
      });
      if (insertError) throw new Error(insertError.message);
    },
    onSuccess: () => {
      toast.success("Strategy duplicated");
      qc.invalidateQueries({ queryKey: ["my-strategies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Strategy",
      sortValue: (r) => r.name,
      cell: (r) => (
        <div>
          <div className="font-medium">{r.name}</div>
          <div className="line-clamp-1 text-xs text-muted-foreground">{r.description ?? "No description"}</div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortValue: (r) => r.category,
      cell: (r) => <Badge variant="secondary">{r.category}</Badge>,
    },
    {
      key: "risk",
      header: "Risk",
      sortValue: (r) => r.risk_level ?? "",
      cell: (r) => <span className="text-xs capitalize">{r.risk_level ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <Badge variant={r.is_public ? "default" : "outline"}>{r.is_public ? "Published" : "Private"}</Badge>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      sortValue: (r) => new Date(r.updated_at).getTime(),
      cell: (r) => <span className="text-xs text-muted-foreground">{fmtDate(r.updated_at)}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Edit ${r.name}`}
            onClick={() => navigate({ to: "/dashboard/strategies/builder", search: { id: r.id } })}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Backtest ${r.name}`}
            onClick={() => navigate({ to: "/dashboard/strategies/backtest", search: { id: r.id } })}
          >
            <LineChart className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Duplicate ${r.name}`}
            onClick={() => duplicate.mutate(r.id)}
          >
            <Copy className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Publish ${r.name} to the marketplace`}
            title="Publish as a marketplace listing"
            onClick={() => publish.mutate(r)}
          >
            <Upload className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Delete ${r.name}`}
            onClick={() => remove.mutate(r.id)}
          >
            <Trash2 className="h-4 w-4 text-loss" aria-hidden />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My work</h1>
          <p className="text-sm text-muted-foreground">
            Everything you have built: visual algo strategies and uploaded AI models.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" aria-hidden /> New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Create</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => navigate({ to: "/dashboard/strategies/builder" })}>
              <LineChart className="mr-2 h-4 w-4" aria-hidden /> Algo strategy (builder)
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate({ to: "/dashboard/models/new" })}>
              <Upload className="mr-2 h-4 w-4" aria-hidden /> AI Model
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Boxes className="h-6 w-6" aria-hidden />}
          title="Your library is empty"
          description="Start from a proven template or open a blank canvas and wire your own logic."
          action={
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to="/dashboard/strategies/templates">Browse templates</Link>
              </Button>
              <Button asChild>
                <Link to="/dashboard/strategies/builder">Open builder</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <DataTable
          rows={data ?? []}
          columns={columns}
          searchKeys={(r) => `${r.name} ${r.category} ${r.description ?? ""}`}
          caption="Your saved trading strategies"
        />
      )}

      <Card className="border-border/70">
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">AI models</CardTitle>
            <CardDescription>Models you uploaded. Validation, versions and pricing live in My listings.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/models/new">
              <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden /> AI Model
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {(myModels.data?.models ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI models yet.</p>
          ) : (
            (myModels.data?.models ?? []).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{String(m.status).replace(/_/g, " ")}</div>
                </div>
                <Button asChild size="sm" variant="ghost">
                  <Link to="/dashboard/models">Manage</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
