import type { BacktestConfig, BacktestProtocol, BacktestReport } from "@/lib/backtest-protocol";

/** Deterministic PRNG so a job always regenerates the same report. */
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rand: () => number) {
  return Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
}

const round = (v: number, d = 2) => Number(v.toFixed(d));

/**
 * Simulates a run of the standardized platform backtest protocol and returns a
 * full report. Quality is seeded from the job id plus a bias term so strong
 * models score well and weak ones fail the thresholds.
 */
export function simulateBacktest(input: {
  seed: string;
  config: BacktestConfig;
  protocol: BacktestProtocol;
  bias?: number;
  forceFailure?: string | undefined;
}): BacktestReport {
  const { config, protocol } = input;
  const rand = rng(input.seed);
  const bias = input.bias ?? 0;

  const start = new Date(protocol.inSampleStart);
  const end = new Date(protocol.holdoutEnd);
  const days = Math.max(120, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  const holdoutStart = new Date(protocol.holdoutStart).getTime();

  const drift = 0.00035 + bias * 0.0004 + (rand() - 0.35) * 0.0006;
  const vol = 0.008 + rand() * 0.006;
  const benchDrift = 0.0003;
  const benchVol = 0.009;
  const feeDrag = (protocol.feeBps + protocol.spreadBps) / 10_000 / 21 + protocol.slippagePct / 100 / 21;

  let equity = protocol.initialCapital;
  let bench = protocol.initialCapital;
  let peak = equity;
  const equitySeries: BacktestReport["equity"] = [];
  const ddSeries: BacktestReport["drawdown"] = [];
  const monthlyMap = new Map<string, { year: number; month: number; start: number; end: number }>();
  const yearlyMap = new Map<number, { year: number; start: number; end: number; bStart: number; bEnd: number }>();
  const dailyReturns: number[] = [];
  let holdoutStartEquity = 0;
  let holdoutPeak = 0;
  let holdoutMaxDd = 0;
  let maxDd = 0;

  const step = days > 900 ? 3 : 1;
  for (let i = 0; i <= days; i += step) {
    const date = new Date(start.getTime() + i * 86_400_000);
    const dow = date.getUTCDay();
    if (config.assetClass !== "crypto" && config.assetClass !== "forex" && (dow === 0 || dow === 6)) continue;

    const r = drift * step + gauss(rand) * vol * Math.sqrt(step) - feeDrag * step;
    const br = benchDrift * step + gauss(rand) * benchVol * Math.sqrt(step);
    equity *= 1 + r;
    bench *= 1 + br;
    dailyReturns.push(r / step);

    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDd = Math.min(maxDd, dd);

    const iso = date.toISOString().slice(0, 10);
    equitySeries.push({ t: iso, v: round(equity), b: round(bench) });
    ddSeries.push({ t: iso, v: round(dd) });

    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const mk = `${y}-${m}`;
    const mm = monthlyMap.get(mk);
    if (mm) mm.end = equity;
    else monthlyMap.set(mk, { year: y, month: m, start: equity / (1 + r), end: equity });

    const yy = yearlyMap.get(y);
    if (yy) {
      yy.end = equity;
      yy.bEnd = bench;
    } else {
      yearlyMap.set(y, { year: y, start: equity / (1 + r), end: equity, bStart: bench / (1 + br), bEnd: bench });
    }

    if (date.getTime() >= holdoutStart) {
      if (!holdoutStartEquity) {
        holdoutStartEquity = equity;
        holdoutPeak = equity;
      }
      holdoutPeak = Math.max(holdoutPeak, equity);
      holdoutMaxDd = Math.min(holdoutMaxDd, ((equity - holdoutPeak) / holdoutPeak) * 100);
    }
  }

  const years = days / 365.25;
  const totalReturn = ((equity - protocol.initialCapital) / protocol.initialCapital) * 100;
  const benchmarkReturn = ((bench - protocol.initialCapital) / protocol.initialCapital) * 100;
  const cagr = (Math.pow(equity / protocol.initialCapital, 1 / years) - 1) * 100;

  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const sd = Math.sqrt(dailyReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / dailyReturns.length);
  const downside = dailyReturns.filter((r) => r < 0);
  const dsd = Math.sqrt(downside.reduce((a, b) => a + b ** 2, 0) / Math.max(1, downside.length));
  const sharpe = (mean / (sd || 1e-9)) * Math.sqrt(252);
  const sortino = (mean / (dsd || 1e-9)) * Math.sqrt(252);

  const perYear = config.timeframe === "1m" ? 900 : config.timeframe === "5m" ? 320 : config.timeframe === "1h" ? 120 : 40;
  const trades = Math.round(perYear * years * (0.7 + rand() * 0.6));
  const winRate = 44 + bias * 6 + rand() * 12;
  const avgWin = 1.1 + rand() * 0.9;
  const avgLoss = 0.9 + rand() * 0.5;
  const profitFactor = (winRate / (100 - winRate)) * (avgWin / avgLoss);

  const monthly = [...monthlyMap.values()].map((m) => ({
    year: m.year,
    month: m.month,
    ret: round(((m.end - m.start) / m.start) * 100),
  }));
  const yearly = [...yearlyMap.values()].map((y) => ({
    year: y.year,
    ret: round(((y.end - y.start) / y.start) * 100),
    benchmark: round(((y.bEnd - y.bStart) / y.bStart) * 100),
  }));

  const buckets = ["<-5%", "-5..-2%", "-2..0%", "0..2%", "2..5%", ">5%"];
  const weights = [0.06, 0.14, 0.26, 0.28, 0.17, 0.09];
  const tradeDistribution = buckets.map((bucket, i) => ({
    bucket,
    count: Math.max(1, Math.round(trades * (weights[i] ?? 0.1) * (0.8 + rand() * 0.4))),
  }));

  const regimes = ["Bull", "Bear", "Sideways"].map((regime, i) => ({
    regime,
    ret: round(cagr * (i === 0 ? 1.4 : i === 1 ? -0.2 + bias * 0.5 : 0.55) * (0.8 + rand() * 0.4)),
    sharpe: round(sharpe * (i === 0 ? 1.25 : i === 1 ? 0.35 : 0.8), 2),
    trades: Math.round(trades * (i === 0 ? 0.45 : i === 1 ? 0.2 : 0.35)),
  }));

  const holdoutReturn = holdoutStartEquity ? ((equity - holdoutStartEquity) / holdoutStartEquity) * 100 : 0;
  const holdoutYears = Math.max(
    0.25,
    (new Date(protocol.holdoutEnd).getTime() - holdoutStart) / (365.25 * 86_400_000),
  );

  const metrics = {
    totalReturn: round(totalReturn),
    cagr: round(cagr),
    sharpe: round(sharpe, 2),
    sortino: round(sortino, 2),
    maxDrawdown: round(Math.abs(maxDd), 1),
    winRate: round(winRate, 1),
    profitFactor: round(profitFactor, 2),
    trades,
    avgHoldingHours: round(config.timeframe === "1d" ? 38 + rand() * 90 : 2 + rand() * 18, 1),
    exposurePct: round(45 + rand() * 45, 1),
    benchmarkReturn: round(benchmarkReturn),
    volatility: round(sd * Math.sqrt(252) * 100, 1),
    bestMonth: round(Math.max(...monthly.map((m) => m.ret))),
    worstMonth: round(Math.min(...monthly.map((m) => m.ret))),
  };

  let failureCode = input.forceFailure;
  if (!failureCode) {
    if (metrics.trades < protocol.minTrades) failureCode = "too_few_trades";
    else if (metrics.maxDrawdown > protocol.maxAllowedDrawdownPct) failureCode = "excessive_drawdown";
    else if (metrics.sharpe < protocol.minSharpe) failureCode = "below_thresholds";
  }

  return {
    metrics,
    holdoutMetrics: {
      totalReturn: round(holdoutReturn),
      cagr: round((Math.pow(1 + holdoutReturn / 100, 1 / holdoutYears) - 1) * 100),
      sharpe: round(sharpe * (0.6 + rand() * 0.5), 2),
      maxDrawdown: round(Math.abs(holdoutMaxDd), 1),
      winRate: round(winRate * (0.9 + rand() * 0.15), 1),
    },
    equity: equitySeries,
    drawdown: ddSeries,
    monthly,
    tradeDistribution,
    regimes,
    years: yearly,
    passed: !failureCode,
    failureCode,
    protocol,
    config,
    generatedAt: new Date().toISOString(),
  };
}
