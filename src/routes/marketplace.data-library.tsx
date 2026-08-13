import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Database, Download, Search } from "lucide-react";
import { listDataCatalog, requestDataFeed } from "@/lib/data-library.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate } from "@/lib/format";

const catalogQuery = queryOptions({ queryKey: ["data-catalog"], queryFn: () => listDataCatalog() });

export const Route = createFileRoute("/marketplace/data-library")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  head: () => ({
    meta: [
      { title: "Historical Data Library — aiAlgo" },
      {
        name: "description",
        content:
          "Browse every historical market data feed available for model backtesting: asset classes, instruments, timeframes, coverage windows and update frequency.",
      },
      { property: "og:title", content: "Historical Data Library — aiAlgo" },
      { property: "og:description", content: "Documented OHLCV feeds across crypto, equities, forex and futures for verified model backtests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DataLibrary,
});

const SAMPLE_CSV = `timestamp,open,high,low,close,volume
2024-01-02T00:00:00Z,42280.10,42910.55,42011.20,42750.35,18422.4471
2024-01-03T00:00:00Z,42750.35,43140.00,41680.90,41905.12,25310.9932
2024-01-04T00:00:00Z,41905.12,42440.60,41520.05,42230.88,19877.1204
`;

function DataLibrary() {
  const { data } = useSuspenseQuery(catalogQuery);
  const [q, setQ] = useState("");
  const [asset, setAsset] = useState("all");

  const assets = useMemo(() => [...new Set(data.map((d) => d.asset_class))], [data]);
  const rows = useMemo(
    () =>
      data.filter(
        (d) =>
          (asset === "all" || d.asset_class === asset) &&
          (q.trim() === "" ||
            `${d.symbol} ${d.display_name} ${d.provider}`.toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [data, asset, q],
  );

  const downloadSample = () => {
    const url = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "aialgo-sample-ohlcv.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <Database className="h-7 w-7 text-primary" aria-hidden /> Data library
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Every feed below is available to platform backtests and to the contributor sandbox. Coverage windows show the
          earliest bar we hold through the latest completed session.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input className="pl-9" placeholder="Search symbol, name or provider" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={asset} onValueChange={setAsset}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All asset classes</SelectItem>
            {assets.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={downloadSample}>
          <Download className="mr-1.5 h-4 w-4" aria-hidden /> Sample dataset
        </Button>
      </div>

      <Card className="border-border/70">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instrument</TableHead>
                <TableHead>Asset class</TableHead>
                <TableHead>Timeframes</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Updates</TableHead>
                <TableHead>Provider</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="mono font-medium">{d.symbol}</div>
                    <div className="text-xs text-muted-foreground">{d.display_name}</div>
                  </TableCell>
                  <TableCell className="capitalize">{d.asset_class}</TableCell>
                  <TableCell className="flex flex-wrap gap-1">
                    {(d.timeframes ?? []).map((t) => (
                      <Badge key={t} variant="outline" className="mono">
                        {t}
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell className="mono text-xs">
                    {fmtDate(d.coverage_start)} → {fmtDate(d.coverage_end)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.update_frequency}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.provider}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Schema documentation</CardTitle>
          <CardDescription>All feeds are normalised to a single OHLCV schema, UTC timestamps, split/dividend adjusted.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ["timestamp", "ISO 8601 string (UTC)", "Bar open time; bars are left-labelled"],
                ["open / high / low / close", "float64", "Adjusted for splits and dividends"],
                ["volume", "float64", "Base-asset volume for crypto, shares for equities"],
                ["symbol", "string", "Canonical platform symbol, e.g. BTC/USDT, 0700.HK"],
                ["timeframe", "enum", "1m | 5m | 1h | 1d"],
              ].map(([f, t, n]) => (
                <TableRow key={f}>
                  <TableCell className="mono">{f}</TableCell>
                  <TableCell className="mono text-xs text-muted-foreground">{t}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{n}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RequestDataForm />
    </main>
  );
}

function RequestDataForm() {
  type AssetClass = "crypto" | "stocks" | "forex" | "futures";
  const [form, setForm] = useState<{ assetClass: AssetClass; symbol: string; timeframe: string; reason: string }>({
    assetClass: "crypto",
    symbol: "",
    timeframe: "1h",
    reason: "",
  });
  const submit = useMutation({
    mutationFn: () => requestDataFeed({ data: form }),
    onSuccess: () => {
      toast.success("Request received — we'll email you when the feed is live.");
      setForm({ assetClass: "crypto", symbol: "", timeframe: "1h", reason: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Request a data feed</CardTitle>
        <CardDescription>Need an instrument or timeframe we don't carry yet? Tell us and we'll evaluate it.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Asset class</Label>
          <Select value={form.assetClass} onValueChange={(v) => setForm({ ...form, assetClass: v as AssetClass })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["crypto", "stocks", "forex", "futures"].map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Symbol</Label>
          <Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="e.g. SOL/USDT" />
        </div>
        <div className="space-y-1.5">
          <Label>Timeframe</Label>
          <Select value={form.timeframe} onValueChange={(v) => setForm({ ...form, timeframe: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["1m", "5m", "1h", "1d"].map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-3">
          <Label>Why do you need it?</Label>
          <Textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </div>
        <div>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending || form.symbol.trim() === ""}>
            Submit request
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
