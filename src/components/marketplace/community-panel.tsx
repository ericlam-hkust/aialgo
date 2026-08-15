import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageSquare, ShieldCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  getMyEngagement,
  getModelCommunity,
  hideModelComment,
  postModelComment,
  toggleModelLike,
} from "@/lib/community.functions";

const sentimentTone = (s: string) => (s === "positive" ? "text-profit" : s === "negative" ? "text-loss" : "text-muted-foreground");

const money = (v: number, currency = "HKD") =>
  new Intl.NumberFormat("en-HK", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);

export function CommunityPanel({
  modelId,
  currency = "HKD",
  canModerate = false,
}: {
  modelId: string;
  currency?: string;
  canModerate?: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const community = useQuery({
    queryKey: ["model-community", modelId],
    queryFn: () => getModelCommunity({ data: { modelId } }),
  });
  const mine = useQuery({
    queryKey: ["model-engagement", modelId, user?.id],
    queryFn: () => getMyEngagement({ data: { modelId } }),
    enabled: Boolean(user),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["model-community", modelId] });
    qc.invalidateQueries({ queryKey: ["model-engagement", modelId] });
    qc.invalidateQueries({ queryKey: ["model"] });
  };

  const like = useMutation({
    mutationFn: () => toggleModelLike({ data: { modelId } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const comment = useMutation({
    mutationFn: () => postModelComment({ data: { modelId, body } }),
    onSuccess: () => {
      setBody("");
      toast.success("Comment posted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const hide = useMutation({
    mutationFn: (commentId: string) => hideModelComment({ data: { commentId, modelId, hidden: true } }),
    onSuccess: () => {
      toast.success("Comment hidden");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = community.data;
  const history = data?.history ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Community signals</CardTitle>
            <CardDescription>
              Likes and comment sentiment feed the automatic pricing model. Signals from verified owners count triple.
            </CardDescription>
          </div>
          <Button
            variant={mine.data?.liked ? "default" : "outline"}
            size="sm"
            className="gap-2 shrink-0"
            disabled={!user || like.isPending}
            onClick={() => like.mutate()}
          >
            <Heart className={`h-4 w-4 ${mine.data?.liked ? "fill-current" : ""}`} aria-hidden />
            {data?.likes ?? 0}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat icon={<Heart className="h-3.5 w-3.5" />} label="Likes" value={`${data?.likes ?? 0}`} />
            <Stat
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              label="From verified owners"
              value={`${data?.verifiedLikes ?? 0}`}
            />
            <Stat icon={<MessageSquare className="h-3.5 w-3.5" />} label="Comments" value={`${data?.comments.length ?? 0}`} />
          </div>

          <Separator />

          {user ? (
            <div className="space-y-2">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Share how this strategy performed for you…"
                rows={3}
              />
              <div className="flex justify-end">
                <Button size="sm" disabled={comment.isPending || body.trim().length < 3} onClick={() => comment.mutate()}>
                  {comment.isPending ? "Posting…" : "Post comment"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sign in to like this strategy or leave a comment.</p>
          )}

          <div className="space-y-3">
            {(data?.comments ?? []).map((c) => (
              <div key={c.id} className="rounded-lg border border-border/70 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{c.author_name}</span>
                  {c.verified_owner ? (
                    <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                      <ShieldCheck className="h-3 w-3" aria-hidden /> Verified owner
                    </Badge>
                  ) : null}
                  <span className={`ml-auto text-xs capitalize ${sentimentTone(c.sentiment)}`}>{c.sentiment}</span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{c.body}</p>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  {canModerate ? (
                    <button className="underline" onClick={() => hide.mutate(c.id)}>
                      Hide
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {!community.isLoading && !(data?.comments ?? []).length ? (
              <p className="text-sm text-muted-foreground">No comments yet — be the first.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {history.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" aria-hidden /> Price history
            </CardTitle>
            <CardDescription>Every automatic adjustment is logged with the reason behind it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.map((h) => (
              <div key={h.id} className="text-sm">
                <div className="flex items-center justify-between">
                  <span className="mono">
                    {h.previous_price ? `${money(Number(h.previous_price), currency)} → ` : ""}
                    {money(Number(h.price), currency)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {h.mode === "platform" ? "aiAlgo" : "Builder"} · {new Date(h.created_at).toLocaleDateString()}
                  </span>
                </div>
                {h.reason ? <p className="text-xs text-muted-foreground">{h.reason}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
