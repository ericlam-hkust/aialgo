import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Users } from "lucide-react";
import { grantModelAccess, listModelAccess, revokeModelAccess } from "@/lib/model-access.functions";
import { MODEL_ACCESS_ROLES, type ModelAccessRole } from "@/lib/teams";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate } from "@/lib/format";

export function ModelAccessDialog({
  modelId,
  modelName,
  disabled,
}: {
  modelId: string;
  modelName: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ModelAccessRole>("beta_tester");
  const qc = useQueryClient();

  const grants = useQuery({
    queryKey: ["model-access", modelId],
    queryFn: () => listModelAccess({ data: { modelId } }),
    enabled: open,
  });

  const add = useMutation({
    mutationFn: () => grantModelAccess({ data: { modelId, email, role } }),
    onSuccess: (res) => {
      toast.success(res.pending ? "Invited — access applies once they sign up" : "Access granted");
      setEmail("");
      void qc.invalidateQueries({ queryKey: ["model-access", modelId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (grantId: string) => revokeModelAccess({ data: { grantId } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["model-access", modelId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" disabled={disabled}>
          <Users className="mr-2 h-3.5 w-3.5" aria-hidden /> Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Private access — {modelName}</DialogTitle>
          <DialogDescription>
            Invited people can open this model in the app and read it through the API, even while it is private.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1 space-y-1.5">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tester@example.com" />
          </div>
          <div className="w-36 space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as ModelAccessRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_ACCESS_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => add.mutate()} disabled={add.isPending || !email.includes("@")}>
            Invite
          </Button>
        </div>

        <div className="space-y-2">
          {(grants.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No one has been invited yet.</p>
          ) : (
            (grants.data ?? []).map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border/70 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{g.email ?? g.user_id}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(g.created_at)}
                    {g.user_id ? "" : " · pending signup"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{String(g.role).replace("_", " ")}</Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Revoke access"
                    onClick={() => remove.mutate(g.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
