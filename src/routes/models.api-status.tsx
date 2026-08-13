import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, CircleDot, ShieldCheck } from "lucide-react";
import { getApiStatus } from "@/lib/api-status.functions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/models/api-status")({
  head: () => ({
    meta: [
      { title: "API changelog & status — AlgoForge" },
      {
        name: "description",
        content:
          "AlgoForge /v1 API stability guarantees, deprecation notices, release changelog, uptime and incident history.",
      },
      { property: "og:title", content: "API changelog & status — AlgoForge" },
      {
        property: "og:description",
        content: "Versioning policy, deprecation timeline, uptime and incident history for the AlgoForge /v1 API.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApiStatusPage,
});

const KIND_TONE: Record<string, string> = {
  added: "bg-chart-2/15 text-chart-2",
  changed: "bg-chart-4/15 text-chart-4",
  deprecated: "bg-destructive/15 text-destructive",
  fixed: "bg-primary/15 text-primary",
};

function ApiStatusPage() {
  const status = useQuery({ queryKey: ["api-status"], queryFn: () => getApiStatus() });
  const data = status.data;

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">API changelog &amp; status</h1>
        <p className="text-sm text-muted-foreground">
          Stability guarantees for <span className="mono">/v1</span>, deprecation notices, uptime and incident history.
        </p>
      </header>

      <Card className="border-border/70">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            {data?.operational !== false ? (
              <CheckCircle2 className="h-6 w-6 text-profit" aria-hidden />
            ) : (
              <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
            )}
            <div>
              <p className="text-sm font-semibold">
                {data?.operational === false ? `${data.openIncidents} open incident(s)` : "All systems operational"}
              </p>
              <p className="text-xs text-muted-foreground">Live status of the models, signals and execution APIs.</p>
            </div>
          </div>
          <div className="text-right">
            <p className="mono text-2xl font-semibold">{(data?.uptime90 ?? 100).toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">Average uptime across recorded incidents</p>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden /> Versioning policy
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              title: "What /v1 guarantees",
              body: "Existing fields keep their name, type and meaning. New optional fields and new endpoints can be added at any time — clients must ignore unknown fields.",
            },
            {
              title: "Breaking changes",
              body: "Anything that removes or renames a field, tightens validation, or changes an enum's meaning ships as /v2. /v1 is never broken in place.",
            },
            {
              title: "Deprecation window",
              body: "Deprecated behaviour is announced here and in the Deprecation and Sunset response headers, then served for at least 6 months before removal.",
            },
            {
              title: "Authentication",
              body: "Team tokens (afk_…) authenticate every call. Scopes are enforced per endpoint; private models require models:read plus team membership or an access grant.",
            },
          ].map((c) => (
            <Card key={c.title} className="border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{c.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{c.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Changelog</h2>
        <div className="space-y-3">
          {(data?.changelog ?? []).map((e) => (
            <Card key={e.id} className="border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <span className="mono text-sm">{e.version}</span>
                  <span>{e.title}</span>
                  <Badge className={cn("border-0", KIND_TONE[e.kind] ?? "bg-muted text-muted-foreground")}>
                    {e.kind}
                  </Badge>
                  {e.breaking ? <Badge variant="destructive">breaking</Badge> : null}
                </CardTitle>
                <CardDescription className="mono text-xs">{fmtDate(e.released_at)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{e.body}</p>
                {e.deprecation_notice ? (
                  <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-xs text-muted-foreground">
                    <span className="font-medium text-destructive">Deprecation</span> — {e.deprecation_notice}
                    {e.sunset_on ? ` Sunset: ${fmtDate(e.sunset_on)}.` : ""}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Incident history</h2>
        <div className="space-y-3">
          {(data?.incidents ?? []).map((i) => (
            <Card key={i.id} className="border-border/70">
              <CardContent className="space-y-1.5 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <CircleDot
                    className={cn("h-4 w-4", i.status === "resolved" ? "text-profit" : "text-destructive")}
                    aria-hidden
                  />
                  <span className="text-sm font-medium">{i.title}</span>
                  <Badge variant="outline">{i.component}</Badge>
                  <Badge variant={i.impact === "major" ? "destructive" : "secondary"}>{i.impact}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{i.summary}</p>
                <p className="mono text-xs text-muted-foreground">
                  {fmtDate(i.started_at)} → {i.resolved_at ? fmtDate(i.resolved_at) : "ongoing"} · uptime{" "}
                  {Number(i.uptime_pct).toFixed(2)}%
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
