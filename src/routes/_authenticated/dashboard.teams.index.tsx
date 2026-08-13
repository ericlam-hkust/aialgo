import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Plus, Users } from "lucide-react";
import { createTeam, listMyTeams } from "@/lib/teams.functions";
import { slugify } from "@/lib/teams";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/dashboard/teams/")({
  component: TeamsPage,
});

function TeamsPage() {
  const qc = useQueryClient();
  const teams = useQuery({ queryKey: ["my-teams"], queryFn: () => listMyTeams() });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
          <p className="text-sm text-muted-foreground">
            Organisations own model repos under a namespace, e.g. <span className="mono">quantlab/momentum-v2</span>.
          </p>
        </div>
        <CreateTeamDialog onCreated={() => void qc.invalidateQueries({ queryKey: ["my-teams"] })} />
      </div>

      {(teams.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" aria-hidden />}
          title="No teams yet"
          description="Create a team to share model repos, roles and API tokens with collaborators."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(teams.data ?? []).map((t) => (
            <Card key={t.id} className="border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span className="mono truncate">{t.slug}</span>
                  <Badge variant="outline">{t.role}</Badge>
                </CardTitle>
                <CardDescription className="line-clamp-2">{t.description || t.name}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" aria-hidden /> {t.name}
                </span>
                <Button asChild size="sm" variant="secondary">
                  <Link to="/dashboard/teams/$slug" params={{ slug: t.slug }}>
                    Open
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateTeamDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: () => createTeam({ data: { slug: slug || slugify(name), name, description } }),
    onSuccess: () => {
      toast.success("Team created");
      setOpen(false);
      setName("");
      setSlug("");
      setDescription("");
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" aria-hidden /> New team
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a team</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Display name</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) setSlug("");
              }}
              placeholder="QuantLab"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Namespace</Label>
            <Input
              className="mono"
              value={slug || slugify(name)}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="quantlab"
            />
            <p className="text-xs text-muted-foreground">
              Models will be addressed as <span className="mono">{(slug || slugify(name)) || "team"}/model-slug</span>.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <Button
            className="w-full"
            disabled={create.isPending || name.trim().length < 2}
            onClick={() => create.mutate()}
          >
            Create team
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
