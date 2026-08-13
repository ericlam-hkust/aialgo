import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpDown, Boxes, GitCompare, LayoutGrid, List, Search, Sparkles, Trophy } from "lucide-react";
import { listPublicModels, type PublicModel } from "@/lib/models.functions";
import { ModelCard, type ModelCardModel } from "@/components/marketplace/model-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { fmtNum, pnlClass } from "@/lib/format";
import { ASSET_CLASSES, PRICING_MODELS, RISK_LEVELS, STRATEGY_TYPES, TIMEFRAMES, pricingLabel } from "@/lib/marketplace";
import { FREQUENCY_CLASSES, TRUST_TIERS, type FrequencyClass, type TrustTier } from "@/lib/monetization";

const modelsQuery = queryOptions({
  queryKey: ["public-models"],
  queryFn: () => listPublicModels(),
});

export const Route = createFileRoute("/marketplace/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(modelsQuery),
  head: () => ({
    meta: [
      { title: "AI Trading Model Marketplace — AlgoForge" },
      {
        name: "description",
        content:
          "Browse verified AI trading models for stocks, crypto, forex and futures. Compare Sharpe, drawdown, win rate and live performance before you deploy.",
      },
      { property: "og:title", content: "AI Trading Model Marketplace — AlgoForge" },
      {
        property: "og:description",
        content: "Verified AI trading models with live performance, transparent pricing and one-click deployment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Catalog,
});

const ALL = "all";
type SortKey = "popular" | "live" | "sharpe" | "cagr" | "rating" | "price";

const LISTING_TABS = [
  { value: ALL, label: "All listings", icon: LayoutGrid },
  { value: "algo", label: "Algo strategies", icon: Boxes },
  { value: "ai_model", label: "AI models", icon: Sparkles },
] as const;


function Catalog() {
  const { data } = useSuspenseQuery(modelsQuery);
  const [q, setQ] = useState("");
  const [asset, setAsset] = useState<string>(ALL);
  const [strategy, setStrategy] = useState<string>(ALL);
  const [timeframe, setTimeframe] = useState<string>(ALL);
  const [risk, setRisk] = useState<string>(ALL);
  const [pricing, setPricing] = useState<string>(ALL);
  const [trust, setTrust] = useState<string>(ALL);
  const [frequency, setFrequency] = useState<string>(ALL);
  const [listing, setListing] = useState<string>(ALL);
  const [sort, setSort] = useState<SortKey>("popular");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [compare, setCompare] = useState<string[]>([]);

  const toggleCompare = (slug: string) =>
    setCompare((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length >= 3 ? prev : [...prev, slug]));


  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rows = (data as PublicModel[]).filter((m) => {
      if (asset !== ALL && m.asset_class !== asset) return false;
      if (strategy !== ALL && m.strategy_type !== strategy) return false;
      if (timeframe !== ALL && m.timeframe !== timeframe) return false;
      if (risk !== ALL && m.risk_level !== risk) return false;
      if (pricing !== ALL && m.pricing_model !== pricing) return false;
      if (trust !== ALL && (m as any).trust_tier !== trust) return false;
      if (frequency !== ALL && (m as any).declared_frequency !== frequency) return false;
      if (listing !== ALL && (m as any).listing_kind !== listing) return false;
      if (!term) return true;
      return (
        m.name.toLowerCase().includes(term) ||
        (m.tagline ?? "").toLowerCase().includes(term) ||
        (m.tags ?? []).some((t: string) => t.toLowerCase().includes(term)) ||
        (m.contributor?.display_name ?? "").toLowerCase().includes(term)
      );
    });
    const by: Record<SortKey, (a: PublicModel, b: PublicModel) => number> = {
      popular: (a, b) => b.active_users - a.active_users,
      live: (a, b) => Number(b.live_return_30d) - Number(a.live_return_30d),
      sharpe: (a, b) => Number(b.sharpe) - Number(a.sharpe),
      cagr: (a, b) => Number(b.cagr) - Number(a.cagr),
      rating: (a, b) => Number(b.rating) - Number(a.rating),
      price: (a, b) => Number(a.price) - Number(b.price),
    };
    return [...rows].sort(by[sort]);
  }, [data, q, asset, strategy, timeframe, risk, pricing, trust, frequency, listing, sort]);

  const countFor = (kind: string) =>
    kind === ALL
      ? (data as PublicModel[]).length
      : (data as PublicModel[]).filter((m) => (m.listing_kind ?? "ai_model") === kind).length;

  const leaderboard = useMemo(
    () =>
      (data as PublicModel[])
        .filter((m) => listing === ALL || (m.listing_kind ?? "ai_model") === listing)
        .sort((a, b) => Number(b.live_return_30d) - Number(a.live_return_30d))
        .slice(0, 20),
    [data, listing],
  );


  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="max-w-2xl">
        <Badge variant="secondary">Marketplace</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Algo strategies and AI models, verified
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every listing — rule-based algo or AI model — is re-run out of sample, paper traded, and tracked live since
          listing. Deploy to paper or a connected broker in a few clicks.
        </p>
      </div>

      <div className="mt-6 inline-flex flex-wrap items-center gap-1 rounded-lg border border-border/70 bg-card/60 p-1">
        {LISTING_TABS.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={listing === tab.value ? "secondary" : "ghost"}
            onClick={() => setListing(tab.value)}
            aria-pressed={listing === tab.value}
            className="gap-1.5"
          >
            <tab.icon className="h-4 w-4" aria-hidden />
            {tab.label}
            <span className="text-xs text-muted-foreground">{countFor(tab.value)}</span>
          </Button>
        ))}
      </div>

      <Tabs defaultValue="catalog" className="mt-6">
        <TabsList>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="leaderboard">
            <Trophy className="mr-1.5 h-4 w-4" aria-hidden /> Leaderboard
          </TabsTrigger>
        </TabsList>


        <TabsContent value="catalog" className="mt-6 space-y-6">
          <Card className="border-border/70 bg-card/60">
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search models, tags or contributors"
                  className="pl-9"
                  aria-label="Search models"
                />
              </div>
              <FilterSelect label="Asset class" value={asset} onChange={setAsset} options={ASSET_CLASSES} />
              <FilterSelect label="Strategy" value={strategy} onChange={setStrategy} options={STRATEGY_TYPES} />
              <FilterSelect
                label="Timeframe"
                value={timeframe}
                onChange={setTimeframe}
                options={TIMEFRAMES.map((t) => ({ value: t, label: t }))}
              />
              <FilterSelect label="Risk" value={risk} onChange={setRisk} options={RISK_LEVELS} />
              <FilterSelect
                label="Pricing"
                value={pricing}
                onChange={setPricing}
                options={PRICING_MODELS.map((p) => ({ value: p.value, label: p.label }))}
              />
              <FilterSelect
                label="Trust tier"
                value={trust}
                onChange={setTrust}
                options={(Object.keys(TRUST_TIERS) as TrustTier[]).map((t) => ({ value: t, label: TRUST_TIERS[t].label }))}
              />
              <FilterSelect
                label="Frequency"
                value={frequency}
                onChange={setFrequency}
                options={(Object.keys(FREQUENCY_CLASSES) as FrequencyClass[]).map((f) => ({
                  value: f,
                  label: FREQUENCY_CLASSES[f].label,
                }))}
              />
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="w-[170px]" aria-label="Sort by">
                  <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most active users</SelectItem>
                  <SelectItem value="live">Live 30d return</SelectItem>
                  <SelectItem value="sharpe">Sharpe ratio</SelectItem>
                  <SelectItem value="cagr">CAGR</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Button
                  variant={layout === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setLayout("grid")}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  variant={layout === "list" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setLayout("list")}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            {filtered.length} model{filtered.length === 1 ? "" : "s"}
          </p>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Search className="h-6 w-6" aria-hidden />}
              title="No models match those filters"
              description="Try widening the asset class or clearing the search term."
            />
          ) : (
            <div className={layout === "grid" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
              {filtered.map((m) => (
                <ModelCard
                  key={m.slug}
                  model={m as unknown as ModelCardModel}
                  layout={layout}
                  selected={compare.includes(m.slug)}
                  onToggleSelect={() => toggleCompare(m.slug)}
                />
              ))}
            </div>
          )}

          {compare.length ? (
            <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-lg border border-primary/40 bg-card/95 p-3 shadow-lg backdrop-blur">
              <GitCompare className="h-4 w-4 text-primary" aria-hidden />
              <span className="text-sm">
                {compare.length} of 3 selected{compare.length === 3 ? " (max)" : ""}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {compare.map((slug) => (
                  <Badge key={slug} variant="secondary" className="gap-1">
                    {(data as PublicModel[]).find((m) => m.slug === slug)?.name ?? slug}
                    <button type="button" onClick={() => toggleCompare(slug)} aria-label={`Remove ${slug}`}>
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setCompare([])}>
                  Clear
                </Button>
                <Button asChild size="sm" disabled={compare.length < 2}>
                  <Link to="/marketplace/compare" search={{ models: compare.join(",") }}>
                    Compare {compare.length}
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}

        </TabsContent>

        <TabsContent value="leaderboard" className="mt-6">
          <Card className="border-border/70">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Live 30d</TableHead>
                    <TableHead className="text-right">Sharpe</TableHead>
                    <TableHead className="text-right">Max DD</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead className="text-right">Pricing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((m, i) => (
                    <TableRow key={m.slug}>
                      <TableCell className="mono text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <Link to="/marketplace/$slug" params={{ slug: m.slug }} className="hover:text-primary">
                          <span className="font-medium">{m.name}</span>
                          <span className="block text-xs text-muted-foreground">{m.contributor?.display_name}</span>
                        </Link>
                      </TableCell>
                      <TableCell className={`mono text-right ${pnlClass(Number(m.live_return_30d))}`}>
                        {fmtNum(Number(m.live_return_30d), 2)}%
                      </TableCell>
                      <TableCell className="mono text-right">{fmtNum(Number(m.sharpe), 2)}</TableCell>
                      <TableCell className="mono text-right text-loss">
                        -{fmtNum(Number(m.max_drawdown), 1)}%
                      </TableCell>
                      <TableCell className="mono text-right">{m.active_users.toLocaleString()}</TableCell>
                      <TableCell className="mono text-right text-xs">
                        {pricingLabel(m.pricing_model, Number(m.price), m.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[150px]" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label}: all</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
