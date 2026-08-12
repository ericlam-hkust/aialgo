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
    mutationFn: async (row: Row) => {
      const { error } = await supabase
        .from("strategies")
        .update({ is_public: !row.is_public })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
      return !row.is_public;
    },
    onSuccess: (isPublic) => {
      toast.success(isPublic ? "Published to the marketplace" : "Removed from the marketplace");
      qc.invalidateQueries({ queryKey: ["my-strategies"] });
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
            aria-label={r.is_public ? `Unpublish ${r.name}` : `Publish ${r.name}`}
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
          <h1 className="text-2xl font-semibold tracking-tight">Strategy library</h1>
          <p className="text-sm text-muted-foreground">Everything you have built, cloned or bought.</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/strategies/builder">
            <Plus className="mr-1 h-4 w-4" aria-hidden /> New strategy
          </Link>
        </Button>
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
    </div>
  );
}
