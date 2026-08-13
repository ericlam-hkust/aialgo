/** Shared model interface manifest: the contract a contributor declares and consumers configure. */

export type ManifestParamType = "number" | "select" | "toggle";

export type ManifestParam = {
  key: string;
  label: string;
  description: string;
  type: ManifestParamType;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  default: string | number | boolean;
};

export type InterfaceManifest = {
  instruments: string[];
  timeframe: string;
  lookbackBars: number;
  indicators: string[];
  parameters: ManifestParam[];
  outputConfirmed: boolean;
};

export type ParamValues = Record<string, string | number | boolean>;

export const SIGNAL_OUTPUT_FIELDS: { field: string; type: string; note: string }[] = [
  { field: "instrument", type: "string", note: "Symbol the signal applies to, e.g. BTC/USDT or 0700.HK" },
  { field: "action", type: "BUY | SELL | CLOSE | HOLD", note: "Requested action for the instrument" },
  { field: "confidence", type: "number 0–1", note: "Model conviction; the risk engine may size on this" },
  { field: "position_size_pct", type: "number 0–100", note: "Requested share of allocated capital" },
  { field: "stop_loss", type: "number | null", note: "Absolute price level for the protective stop" },
  { field: "take_profit", type: "number | null", note: "Absolute price level for the profit target" },
];

export const INDICATOR_OPTIONS = ["SMA", "EMA", "RSI", "MACD", "ATR", "Bollinger", "VWAP", "OBV"];

export function emptyManifest(): InterfaceManifest {
  return {
    instruments: [],
    timeframe: "1h",
    lookbackBars: 200,
    indicators: ["EMA", "RSI"],
    parameters: [
      {
        key: "risk_level",
        label: "Risk level",
        description: "How aggressively the model sizes positions.",
        type: "number",
        min: 1,
        max: 5,
        step: 1,
        default: 3,
      },
    ],
    outputConfirmed: false,
  };
}

export function normalizeManifest(raw: unknown): InterfaceManifest {
  const base = emptyManifest();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<InterfaceManifest>;
  return {
    instruments: Array.isArray(r.instruments) ? r.instruments.map(String) : base.instruments,
    timeframe: typeof r.timeframe === "string" ? r.timeframe : base.timeframe,
    lookbackBars: Number(r.lookbackBars) > 0 ? Number(r.lookbackBars) : base.lookbackBars,
    indicators: Array.isArray(r.indicators) ? r.indicators.map(String) : base.indicators,
    parameters: Array.isArray(r.parameters) && r.parameters.length ? (r.parameters as ManifestParam[]) : base.parameters,
    outputConfirmed: Boolean(r.outputConfirmed),
  };
}

export function defaultParamValues(manifest: InterfaceManifest): ParamValues {
  const out: ParamValues = {};
  for (const p of manifest.parameters) {
    if (!p.key) continue;
    out[p.key] = p.type === "toggle" ? Boolean(p.default) : p.type === "number" ? Number(p.default) || 0 : String(p.default ?? "");
  }
  return out;
}

export function describeParam(p: ManifestParam): string {
  if (p.type === "number") return `${p.min ?? 0}–${p.max ?? 100}, default ${String(p.default)}`;
  if (p.type === "select") return `${(p.options ?? []).join(" / ")} · default ${String(p.default)}`;
  return `On / off · default ${p.default ? "on" : "off"}`;
}
