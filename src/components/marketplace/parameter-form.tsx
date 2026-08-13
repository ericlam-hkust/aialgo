import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { describeParam, type InterfaceManifest, type ParamValues } from "@/lib/model-interface";

/** Auto-generated consumer-facing form built from a model's declared interface manifest. */
export function ParameterForm({
  manifest,
  values,
  onChange,
  disabled,
}: {
  manifest: InterfaceManifest;
  values: ParamValues;
  onChange: (next: ParamValues) => void;
  disabled?: boolean;
}) {
  const params = manifest.parameters.filter((p) => p.key);
  if (!params.length) {
    return <p className="text-sm text-muted-foreground">This model exposes no tunable parameters.</p>;
  }

  const set = (key: string, value: string | number | boolean) => onChange({ ...values, [key]: value });

  return (
    <div className="space-y-4">
      {params.map((p) => {
        const value = values[p.key] ?? p.default;
        return (
          <div key={p.key} className="space-y-2 rounded-md border border-border/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Label className="text-sm">{p.label || p.key}</Label>
                {p.description ? <p className="text-xs text-muted-foreground">{p.description}</p> : null}
              </div>
              <span className="mono text-[10px] text-muted-foreground">{describeParam(p)}</span>
            </div>

            {p.type === "toggle" ? (
              <Switch checked={Boolean(value)} onCheckedChange={(v) => set(p.key, v)} disabled={disabled ?? false} />
            ) : p.type === "select" ? (
              <Select value={String(value)} onValueChange={(v) => set(p.key, v)} disabled={disabled ?? false}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(p.options ?? []).map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-3">
                <Slider
                  className="flex-1"
                  min={p.min ?? 0}
                  max={p.max ?? 100}
                  step={p.step ?? 1}
                  value={[Number(value) || 0]}
                  onValueChange={([v]) => set(p.key, Number(v))}
                  disabled={disabled ?? false}
                />
                <Input
                  className="mono w-24"
                  inputMode="decimal"
                  value={String(value)}
                  onChange={(e) => set(p.key, Number(e.target.value) || 0)}
                  disabled={disabled ?? false}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
