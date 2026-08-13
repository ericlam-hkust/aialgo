import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ParameterForm } from "@/components/marketplace/parameter-form";
import {
  SIGNAL_OUTPUT_FIELDS,
  defaultParamValues,
  type InterfaceManifest,
  type ManifestParam,
  type ManifestParamType,
} from "@/lib/model-interface";
import { TIMEFRAMES } from "@/lib/marketplace";

const INDICATORS = ["EMA", "SMA", "RSI", "MACD", "ATR", "Bollinger", "VWAP", "OBV"];

export function InterfaceDefinitionStep({
  value,
  onChange,
}: {
  value: InterfaceManifest;
  onChange: (next: InterfaceManifest) => void;
}) {
  const [instrument, setInstrument] = useState("");
  const [preview, setPreview] = useState(() => defaultParamValues(value));
  const set = <K extends keyof InterfaceManifest>(k: K, v: InterfaceManifest[K]) => onChange({ ...value, [k]: v });

  const updateParam = (i: number, patch: Partial<ManifestParam>) =>
    set(
      "parameters",
      value.parameters.map((p, j) => (j === i ? { ...p, ...patch } : p)),
    );

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">1. Required data inputs</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Timeframe</Label>
            <Select value={value.timeframe} onValueChange={(v) => set("timeframe", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAMES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Lookback period (bars)</Label>
            <Input
              className="mono"
              inputMode="numeric"
              value={String(value.lookbackBars)}
              onChange={(e) => set("lookbackBars", Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Instruments</Label>
          <div className="flex gap-2">
            <Input
              className="mono"
              placeholder="e.g. BTC/USDT"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => {
                const v = instrument.trim().toUpperCase();
                if (!v || value.instruments.includes(v)) return;
                set("instruments", [...value.instruments, v]);
                setInstrument("");
              }}
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {value.instruments.map((s) => (
              <Badge
                key={s}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => set("instruments", value.instruments.filter((x) => x !== s))}
              >
                {s} ×
              </Badge>
            ))}
            {value.instruments.length === 0 ? (
              <span className="text-xs text-muted-foreground">No instruments declared yet.</span>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Indicators required</Label>
          <div className="flex flex-wrap gap-1.5">
            {INDICATORS.map((ind) => {
              const on = value.indicators.includes(ind);
              return (
                <Badge
                  key={ind}
                  variant={on ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() =>
                    set("indicators", on ? value.indicators.filter((x) => x !== ind) : [...value.indicators, ind])
                  }
                >
                  {ind}
                </Badge>
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">2. User-tunable parameters</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              set("parameters", [
                ...value.parameters,
                { key: "", label: "", description: "", type: "number", min: 0, max: 10, step: 1, default: 1 },
              ])
            }
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Add parameter
          </Button>
        </div>

        {value.parameters.map((p, i) => (
          <div key={i} className="space-y-3 rounded-md border border-border/70 p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Small label="Key" value={p.key} onChange={(v) => updateParam(i, { key: v })} mono />
              <Small label="Label" value={p.label} onChange={(v) => updateParam(i, { label: v })} />
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select
                  value={p.type}
                  onValueChange={(v) =>
                    updateParam(i, {
                      type: v as ManifestParamType,
                      default: v === "toggle" ? false : v === "select" ? (p.options?.[0] ?? "") : 1,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="select">Dropdown</SelectItem>
                    <SelectItem value="toggle">Toggle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              {p.type === "number" ? (
                <>
                  <Small label="Min" value={String(p.min ?? "")} onChange={(v) => updateParam(i, { min: Number(v) })} mono />
                  <Small label="Max" value={String(p.max ?? "")} onChange={(v) => updateParam(i, { max: Number(v) })} mono />
                  <Small label="Step" value={String(p.step ?? 1)} onChange={(v) => updateParam(i, { step: Number(v) })} mono />
                </>
              ) : p.type === "select" ? (
                <div className="sm:col-span-3">
                  <Small
                    label="Options (comma separated)"
                    value={(p.options ?? []).join(", ")}
                    onChange={(v) =>
                      updateParam(i, { options: v.split(",").map((o) => o.trim()).filter(Boolean) })
                    }
                  />
                </div>
              ) : (
                <div className="sm:col-span-3" />
              )}
              <Small
                label="Default"
                value={String(p.default)}
                onChange={(v) =>
                  updateParam(i, {
                    default: p.type === "number" ? Number(v) || 0 : p.type === "toggle" ? v === "true" : v,
                  })
                }
                mono
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea
                rows={2}
                value={p.description}
                onChange={(e) => updateParam(i, { description: e.target.value })}
              />
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => set("parameters", value.parameters.filter((_, j) => j !== i))}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Remove
            </Button>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">3. Output format</h3>
        <div className="overflow-hidden rounded-md border border-border/70">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">Field</th>
                <th className="p-2 text-left font-medium">Type</th>
                <th className="p-2 text-left font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {SIGNAL_OUTPUT_FIELDS.map((f) => (
                <tr key={f.field} className="border-t border-border/60">
                  <td className="mono p-2">{f.field}</td>
                  <td className="mono p-2 text-muted-foreground">{f.type}</td>
                  <td className="p-2 text-muted-foreground">{f.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={value.outputConfirmed}
            onCheckedChange={(v) => set("outputConfirmed", v === true)}
            className="mt-0.5"
          />
          <span>My model returns signals in exactly this standard format.</span>
        </label>
      </section>

      <Card className="border-border/70 bg-muted/20">
        <CardHeader>
          <CardTitle className="text-sm">Parameter form preview</CardTitle>
          <CardDescription>This is exactly what buyers see when they configure your model.</CardDescription>
        </CardHeader>
        <CardContent>
          <ParameterForm manifest={value} values={preview} onChange={setPreview} />
        </CardContent>
      </Card>
    </div>
  );
}

function Small({
  label,
  value,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input className={mono ? "mono" : undefined} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
