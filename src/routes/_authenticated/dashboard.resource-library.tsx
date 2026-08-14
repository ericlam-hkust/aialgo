import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen,
  Boxes,
  CalendarRange,
  Cpu,
  GitBranch,
  Info,
  Loader2,
  Search,
  Sparkles,
  Timer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listBaseModels } from "@/lib/base-models.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtNum } from "@/lib/format";

const templatesQuery = queryOptions({
  queryKey: ["resource-library", "templates"],
  queryFn: async () => {
    const { data: rows, error } = await supabase
      .from("strategies")
      .select("id,name,description,category,risk_level,market_condition,graph,parameters")
      .eq("is_template", true)
      .order("name");
    if (error) throw new Error(error.message);
    return (rows ?? []) as {
      id: string;
      name: string;
      description: string | null;
      category: string;
      risk_level: string | null;
      market_condition: string | null;
      graph: unknown;
      parameters: unknown;
    }[];
  },
});

const baseModelsQuery = queryOptions({
  queryKey: ["resource-library", "base-models"],
  queryFn: () => listBaseModels(),
});

export const Route = createFileRoute("/_authenticated/dashboard/resource-library")({
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(templatesQuery), context.queryClient.ensureQueryData(baseModelsQuery)]),
  head: () => ({
    meta: [
      { title: "Resource Library — templates & base models | aiAlgo" },
      {
        name: "description",
        content:
          "Clone proven algo strategy templates or start from a pretrained AI trading base model in aiAlgo's Resource Library.",
      },
      { property: "og:title", content: "Resource Library — templates & base models | aiAlgo" },
      {
        property: "og:description",
        content: "Clone proven algo strategy templates or start from a pretrained AI trading base model.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResourceLibrary,
});

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  risk_level: string | null;
  market_condition: string | null;
  graph: unknown;
  parameters: unknown;
};

function ResourceLibrary() {
  const navigate = useNavigate();
  const { data: templates } = useSuspenseQuery(templatesQuery);
  const { data: baseModels } = useSuspenseQuery(baseModelsQuery);
  const [templateCategory, setTemplateCategory] = useState("all");
  const [templateSearch, setTemplateSearch] = useState("");
  const [modelArchitecture, setModelArchitecture] = useState("all");
  const [modelSearch, setModelSearch] = useState("");
  const [cloning, setCloning] = useState<string | null>(null);

  const templateCategories = ["all", ...new Set(templates.map((t) => t.category))];
  const architectures = ["all", ...new Set(baseModels.map((b) => b.architecture))];

  const cloneTemplate = async (t: TemplateRow) => {
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

  const tq = templateSearch.toLowerCase();
  const filteredTemplates = templates.filter((t) => {
    if (templateCategory !== "all" && t.category !== templateCategory) return false;
    if (!tq) return true;
    return (
      t.name.toLowerCase().includes(tq) ||
      (t.description ?? "").toLowerCase().includes(tq) ||
      t.category.toLowerCase().includes(tq)
    );
  });

  const mq = modelSearch.toLowerCase();
  const filteredBaseModels = baseModels.filter((b) => {
    if (modelArchitecture !== "all" && b.architecture !== modelArchitecture) return false;
    if (!mq) return true;
    return (
      b.name.toLowerCase().includes(mq) ||
      b.tagline.toLowerCase().includes(mq) ||
      b.architecture.toLowerCase().includes(mq) ||
      b.instruments.join(" ").toLowerCase().includes(mq)
    );
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resource Library</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Proven starting points for every builder: clone an algo template or fine-tune a pretrained AI base model.
        </p>
      </div>

      {/* ---------------- Algo templates ---------------- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden /> Algo templates
              <Badge variant="secondary">{templates.length}</Badge>
            </h2>
            <p className="text-sm text-muted-foreground">Clone a proven algo structure into the builder.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              placeholder="Search algo templates…"
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={templateCategory} onValueChange={setTemplateCategory}>
            <TabsList>
              {templateCategories.map((c) => (
                <TabsTrigger key={c} value={c} className="capitalize">
                  {c}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((t) => (
            <Card key={`template-${t.id}`} className="flex flex-col border-border/70">
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
                <Button className="w-full" onClick={() => cloneTemplate(t)} disabled={cloning === t.id}>
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

          {filteredTemplates.length === 0 && (
            <div className="col-span-full rounded-lg border border-border/70 p-8 text-center text-sm text-muted-foreground">
              No algo templates match your filters.
            </div>
          )}
        </div>
      </section>

      {/* ---------------- AI base models ---------------- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Cpu className="h-4 w-4 text-muted-foreground" aria-hidden /> AI base models
              <Badge variant="secondary">{baseModels.length}</Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              Start from a pretrained foundation and fine-tune it into your own model.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/marketplace/fine-tuning-guide">
              <BookOpen className="mr-1.5 h-4 w-4" aria-hidden /> Fine-tuning guide
            </Link>
          </Button>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          AI base models are not directly subscribable — they exist as foundations. Fine-tune one to create a model
          traders can subscribe to.
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              placeholder="Search base models, architectures, instruments…"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={modelArchitecture} onValueChange={setModelArchitecture}>
            <TabsList>
              {architectures.map((a) => (
                <TabsTrigger key={a} value={a}>
                  {a === "all" ? "All" : a}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBaseModels.map((b) => (
            <Card key={`base-${b.id}`} className="flex flex-col border-border/70">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="mono text-base">{b.name}</CardTitle>
                  <Badge variant="outline">v{b.version}</Badge>
                </div>
                <CardDescription>{b.tagline}</CardDescription>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Cpu className="h-3.5 w-3.5" aria-hidden /> {b.architecture}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3 text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <Boxes className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>
                      Pretrained on {b.instruments.join(", ")} · {b.timeframes.join(" / ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarRange className="h-3.5 w-3.5" aria-hidden /> {b.data_start} → {b.data_end}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Timer className="h-3.5 w-3.5" aria-hidden /> {b.compute_estimate}
                  </div>
                </div>

                <div className="rounded-md border border-border/70 bg-muted/20 p-2.5">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <Metric label="Sharpe" value={fmtNum(Number(b.baseline_metrics.sharpe ?? 0), 2)} />
                    <Metric label="CAGR" value={`${fmtNum(Number(b.baseline_metrics.cagr ?? 0) * 100, 1)}%`} />
                    <Metric label="Max DD" value={`${fmtNum(Number(b.baseline_metrics.maxDrawdown ?? 0) * 100, 1)}%`} />
                    <Metric label="Win" value={`${fmtNum(Number(b.baseline_metrics.winRate ?? 0) * 100, 0)}%`} />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Base performance — derivatives must pass their own backtest.
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <GitBranch className="h-3.5 w-3.5" aria-hidden /> {b.derivativeCount} published derivative
                    {b.derivativeCount === 1 ? "" : "s"}
                  </span>
                  <Button asChild size="sm">
                    <Link to="/marketplace/base-models/$id" params={{ id: b.id }}>
                      Use this base
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredBaseModels.length === 0 && (
            <div className="col-span-full rounded-lg border border-border/70 p-8 text-center text-sm text-muted-foreground">
              No AI base models match your filters.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mono text-sm">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
