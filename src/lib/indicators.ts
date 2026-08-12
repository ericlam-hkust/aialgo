export type Bar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const nan = Number.NaN;

export function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!;
    if (i >= period) sum -= values[i - period]!;
    out.push(i >= period - 1 ? sum / period : nan);
  }
  return out;
}

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = nan;
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    if (i === period - 1) {
      let s = 0;
      for (let j = 0; j < period; j++) s += values[j]!;
      prev = s / period;
    } else if (i >= period) {
      prev = v * k + prev * (1 - k);
    }
    out.push(i >= period - 1 ? prev : nan);
  }
  return out;
}

export function rsi(values: number[], period = 14): number[] {
  const out: number[] = [nan];
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < values.length; i++) {
    const diff = values[i]! - values[i - 1]!;
    const up = Math.max(diff, 0);
    const down = Math.max(-diff, 0);
    if (i <= period) {
      gain += up / period;
      loss += down / period;
      out.push(i === period ? 100 - 100 / (1 + gain / (loss || 1e-9)) : nan);
    } else {
      gain = (gain * (period - 1) + up) / period;
      loss = (loss * (period - 1) + down) / period;
      out.push(100 - 100 / (1 + gain / (loss || 1e-9)));
    }
  }
  return out;
}

export function macd(values: number[], fast = 12, slow = 26, signal = 9) {
  const f = ema(values, fast);
  const s = ema(values, slow);
  const line = values.map((_, i) => (Number.isNaN(f[i]!) || Number.isNaN(s[i]!) ? nan : f[i]! - s[i]!));
  const clean = line.map((v) => (Number.isNaN(v) ? 0 : v));
  const sig = ema(clean, signal);
  return { line, signal: sig };
}

export function bollinger(values: number[], period = 20, mult = 2) {
  const mid = sma(values, period);
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      upper.push(nan);
      lower.push(nan);
      continue;
    }
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (values[j]! - mid[i]!) ** 2;
    const sd = Math.sqrt(variance / period);
    upper.push(mid[i]! + mult * sd);
    lower.push(mid[i]! - mult * sd);
  }
  return { mid, upper, lower };
}

export function atr(bars: Bar[], period = 14): number[] {
  const tr = bars.map((b, i) =>
    i === 0
      ? b.high - b.low
      : Math.max(b.high - b.low, Math.abs(b.high - bars[i - 1]!.close), Math.abs(b.low - bars[i - 1]!.close)),
  );
  return ema(tr, period);
}
