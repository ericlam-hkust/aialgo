import { useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import {
  addTeamMember,
  createTeamToken,
  getTeam,
  removeTeamMember,
  revokeTeamToken,
  updateTeamMember,
} from "@/lib/teams.functions";
import { setModelVisibility } from "@/lib/model-access.functions";
import { TEAM_ROLES, TOKEN_SCOPES, VISIBILITY_OPTIONS, namespacedSlug, type TeamRole } from "@/lib/teams";
import { ModelAccessDialog } from "@/components/marketplace/model-access-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/teams/$slug")({
  component: TeamDetail,
});

function TeamDetail() {
  const { slug } = useParams({ from: "/_authenticated/dashboard/teams/$slug" });
  const qc = useQueryClient();
  const team = useQuery({ queryKey: ["team", slug], queryFn: () => getTeam({ data: { slug } }) });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["team", slug] });

  if (team.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }
  if (!team.data) {
    return <p className="text-sm text-muted-foreground">This team does not exist or you cannot access it.</p>;
  }

  const { team: t, members, tokens, models, myRole, canManage } = team.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mono text-2xl font-semibold tracking-tight">{t.slug}</h1>
          <p className="text-sm text-muted-foreground">{t.description || t.name}</p>
        </div>
        <Badge variant="outline" className="gap-1">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {myRole ?? "no access"}
        </Badge>
      </div>

      <Tabs defaultValue="models">
        <TabsList>
          <TabsTrigger value="models">Model repos</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="tokens">API tokens</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="mt-4">
          <Card className="border-border/70">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Repo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead className="text-right">Access</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        No repos yet. Transfer a model to this team from the contributor dashboard.
                      </TableCell>
                    </TableRow>
                  ) : (
                    models.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="mono text-xs">{namespacedSlug(t.slug, m.slug)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{String(m.status).replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={m.visibility}
                            disabled={!canManage}
                            onValueChange={async (v) => {
                              try {
                                await setModelVisibility({
                                  data: { modelId: m.id, visibility: v as "public" | "unlisted" | "private" },
                                });
                                toast.success("Visibility updated");
                                refresh();
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : "Could not update visibility");
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {VISIBILITY_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <ModelAccessDialog modelId={m.id} modelName={m.name} disabled={!canManage} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-4 space-y-4">
          {canManage ? <AddMemberCard teamId={t.id} onDone={refresh} /> : null}
          <Card className="border-border/70">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm">{m.label}</TableCell>
                      <TableCell>
                        <Select
                          value={m.role}
                          disabled={!canManage}
                          onValueChange={async (v) => {
                            try {
                              await updateTeamMember({ data: { memberId: m.id, role: v as TeamRole } });
                              toast.success("Role updated");
                              refresh();
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Could not update role");
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TEAM_ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="mono text-xs">{fmtDate(m.created_at)}</TableCell>
                      <TableCell className="text-right">
                        {canManage ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Remove member"
                            onClick={async () => {
                              try {
                                await removeTeamMember({ data: { memberId: m.id } });
                                refresh();
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : "Could not remove member");
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="grid gap-2 text-xs text-muted-foreground">
            {TEAM_ROLES.map((r) => (
              <p key={r.value}>
                <span className="font-medium text-foreground">{r.label}</span> — {r.hint}
              </p>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tokens" className="mt-4 space-y-4">
          {canManage ? <CreateTokenCard teamId={t.id} teamSlug={t.slug} onDone={refresh} /> : null}
          <Card className="border-border/70">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead>Last used</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No tokens yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tokens.map((tk) => (
                      <TableRow key={tk.id} className={tk.revoked_at ? "opacity-50" : undefined}>
                        <TableCell className="text-sm">{tk.name}</TableCell>
                        <TableCell className="mono text-xs">{tk.token_prefix}…</TableCell>
                        <TableCell className="flex flex-wrap gap-1 py-3">
                          {tk.scopes.map((s) => (
                            <Badge key={s} variant="secondary" className="mono text-[10px]">
                              {s}
                            </Badge>
                          ))}
                        </TableCell>
                        <TableCell className="mono text-xs">
                          {tk.last_used_at ? fmtDate(tk.last_used_at) : "never"}
                        </TableCell>
                        <TableCell className="text-right">
                          {canManage && !tk.revoked_at ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await revokeTeamToken({ data: { tokenId: tk.id } });
                                  toast.success("Token revoked");
                                  refresh();
                                } catch (e) {
                                  toast.error(e instanceof Error ? e.message : "Could not revoke token");
                                }
                              }}
                            >
                              Revoke
                            </Button>
                          ) : tk.revoked_at ? (
                            <Badge variant="outline">revoked</Badge>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AddMemberCard({ teamId, onDone }: { teamId: string; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("viewer");
  const add = useMutation({
    mutationFn: () => addTeamMember({ data: { teamId, email, role } }),
    onSuccess: () => {
      toast.success("Member added");
      setEmail("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Invite a member</CardTitle>
        <CardDescription>They need an AlgoForge account with this email.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1 space-y-1.5">
          <Label>Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" />
        </div>
        <div className="w-40 space-y-1.5">
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEAM_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => add.mutate()} disabled={add.isPending || !email.includes("@")}>
          <UserPlus className="mr-2 h-4 w-4" aria-hidden /> Add
        </Button>
      </CardContent>
    </Card>
  );
}

function CreateTokenCard({ teamId, teamSlug, onDone }: { teamId: string; teamSlug: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["models:read"]);
  const [expiry, setExpiry] = useState("0");
  const [issued, setIssued] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      createTeamToken({ data: { teamId, teamSlug, name, scopes, expiresInDays: Number(expiry) } }),
    onSuccess: (res) => {
      setIssued(res.token);
      setName("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" aria-hidden /> Issue a team token
        </CardTitle>
        <CardDescription>Team-level scopes apply to every repo in this namespace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1 space-y-1.5">
            <Label>Token name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="CI pipeline" />
          </div>
          <div className="w-40 space-y-1.5">
            <Label>Expires</Label>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Never</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {TOKEN_SCOPES.map((s) => (
            <label key={s.value} className="flex items-start gap-2 rounded-md border border-border/70 p-2.5">
              <Checkbox
                checked={scopes.includes(s.value)}
                onCheckedChange={(c) =>
                  setScopes((prev) => (c ? [...new Set([...prev, s.value])] : prev.filter((v) => v !== s.value)))
                }
              />
              <span>
                <span className="mono block text-xs">{s.label}</span>
                <span className="text-xs text-muted-foreground">{s.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <Button onClick={() => create.mutate()} disabled={create.isPending || name.trim().length < 2 || !scopes.length}>
          Generate token
        </Button>

        {issued ? (
          <div className="space-y-2 rounded-md border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">Copy it now — this is the only time it is shown.</p>
            <div className="flex items-center gap-2">
              <code className="mono flex-1 truncate text-xs">{issued}</code>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Copy token"
                onClick={() => {
                  void navigator.clipboard.writeText(issued);
                  toast.success("Token copied");
                }}
              >
                <Copy className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
