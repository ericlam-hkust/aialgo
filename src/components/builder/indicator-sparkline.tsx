import { useMemo } from "react";
import { bollinger, ema, rsi, sma } from "@/lib/indicators";

/** Deterministic sample price series so previews are stable across renders. */
function sampleSeries(length = 90): number[] {
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296 - 0.5;
  };
  const out: number[] = [];
  let price = 100;
  for (let i = 0; i < length; i++) {
    price += rand() * 2 + Math.sin(i / 9) * 0.6;
    out.push(Math.max(5, price));
  }
  return out;
}

function computeSeries(label: string, params: Record<string, number | string>): number[] {
  const prices = sampleSeries();
  const period = Number(params["period"] ?? 20) || 20;
  switch (label) {
    case "SMA":
      return sma(prices, period);
    case "EMA":
      return ema(prices, period);
    case "RSI":
      return rsi(prices, period);
    case "Bollinger Bands":
      return bollinger(prices, period, Number(params["stddev"] ?? 2) || 2).upper;
    case "MACD":
      return ema(prices, Number(params["fast"] ?? 12) || 12).map(
        (v, i) => v - (ema(prices, Number(params["slow"] ?? 26) || 26)[i] ?? v),
      );
    case "ATR":
      return sma(
        prices.map((p, i) => Math.abs(p - (prices[i - 1] ?? p))),
        period,
      );
    default:
      return prices;
  }
}

export function IndicatorSparkline({
  label,
  params,
}: {
  label: string;
  params: Record<string, number | string>;
}) {
  const path = useMemo(() => {
    const raw = computeSeries(label, params).filter((v) => Number.isFinite(v));
    const series = raw.slice(-60);
    if (series.length < 2) return "";
    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = max - min || 1;
    return series
      .map((v, i) => {
        const x = (i / (series.length - 1)) * 100;
        const y = 20 - ((v - min) / span) * 18 - 1;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [label, params]);

  if (!path) return null;

  return (
    <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="mt-1.5 h-5 w-full" aria-hidden>
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
