import type { ProviderId } from "@/lib/data-providers";

export type NormalizedQuote = {
  symbol: string;
  price: number;
  prevClose: number | null;
  dayOpen: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  currency: string | null;
  quotedAt: string;
};

export type Bar = {
  ts: string; // ISO timestamp (daily bars use YYYY-MM-DD)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Adapter = {
  id: ProviderId;
  getQuote: (symbol: string, key: string) => Promise<NormalizedQuote | null>;
  getDailyBars: (symbol: string, key: string, from: string, to: string) => Promise<Bar[]>;
  getIntradayBars?: (symbol: string, key: string, interval: string) => Promise<Bar[]>;
};

const isHK = (s: string) => s.toUpperCase().endsWith(".HK");
const hkCode = (s: string) => s.replace(/\.HK$/i, "").padStart(4, "0");
const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  if (!res.ok) throw new Error(`Provider request failed [${res.status}]: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Provider returned non-JSON response: ${text.slice(0, 200)}`);
  }
}

function quote(symbol: string, price: number, extra: Partial<NormalizedQuote> = {}): NormalizedQuote {
  return {
    symbol,
    price,
    prevClose: extra.prevClose ?? null,
    dayOpen: extra.dayOpen ?? null,
    dayHigh: extra.dayHigh ?? null,
    dayLow: extra.dayLow ?? null,
    volume: extra.volume ?? null,
    currency: extra.currency ?? (isHK(symbol) ? "HKD" : "USD"),
    quotedAt: extra.quotedAt ?? new Date().toISOString(),
  };
}

/* ------------------------------- Finnhub ------------------------------- */
const finnhub: Adapter = {
  id: "finnhub",
  async getQuote(symbol, key) {
    const d = await getJson(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`);
    const price = num(d?.c);
    if (!price) return null;
    return quote(symbol, price, {
      prevClose: num(d?.pc),
      dayOpen: num(d?.o),
      dayHigh: num(d?.h),
      dayLow: num(d?.l),
      quotedAt: d?.t ? new Date(Number(d.t) * 1000).toISOString() : new Date().toISOString(),
    });
  },
  async getDailyBars(symbol, key, from, to) {
    const f = Math.floor(new Date(from).getTime() / 1000);
    const t = Math.floor(new Date(to).getTime() / 1000);
    const d = await getJson(
      `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${f}&to=${t}&token=${key}`,
    );
    if (d?.s !== "ok" || !Array.isArray(d?.t)) return [];
    return d.t.map((ts: number, i: number) => ({
      ts: new Date(ts * 1000).toISOString().slice(0, 10),
      open: Number(d.o[i]),
      high: Number(d.h[i]),
      low: Number(d.l[i]),
      close: Number(d.c[i]),
      volume: Number(d.v?.[i] ?? 0),
    }));
  },
};

/* ------------------------------ Twelve Data ---------------------------- */
function tdParams(symbol: string): string {
  return isHK(symbol)
    ? `symbol=${hkCode(symbol)}&exchange=HKEX`
    : `symbol=${encodeURIComponent(symbol)}`;
}

const twelvedata: Adapter = {
  id: "twelvedata",
  async getQuote(symbol, key) {
    const d = await getJson(`https://api.twelvedata.com/quote?${tdParams(symbol)}&apikey=${key}`);
    if (d?.status === "error") throw new Error(String(d.message ?? "Twelve Data error"));
    const price = num(d?.close);
    if (!price) return null;
    return quote(symbol, price, {
      prevClose: num(d?.previous_close),
      dayOpen: num(d?.open),
      dayHigh: num(d?.high),
      dayLow: num(d?.low),
      volume: num(d?.volume),
      currency: typeof d?.currency === "string" ? d.currency : null,
      quotedAt: d?.timestamp ? new Date(Number(d.timestamp) * 1000).toISOString() : new Date().toISOString(),
    });
  },
  async getDailyBars(symbol, key, from, to) {
    const d = await getJson(
      `https://api.twelvedata.com/time_series?${tdParams(symbol)}&interval=1day&start_date=${from}&end_date=${to}&outputsize=5000&order=ASC&apikey=${key}`,
    );
    if (d?.status === "error") throw new Error(String(d.message ?? "Twelve Data error"));
    if (!Array.isArray(d?.values)) return [];
    return d.values.map((v: any) => ({
      ts: String(v.datetime).slice(0, 10),
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
      volume: Number(v.volume ?? 0),
    }));
  },
  async getIntradayBars(symbol, key, interval) {
    const d = await getJson(
      `https://api.twelvedata.com/time_series?${tdParams(symbol)}&interval=${interval}&outputsize=500&order=ASC&apikey=${key}`,
    );
    if (d?.status === "error") throw new Error(String(d.message ?? "Twelve Data error"));
    if (!Array.isArray(d?.values)) return [];
    return d.values.map((v: any) => ({
      ts: new Date(`${String(v.datetime).replace(" ", "T")}Z`).toISOString(),
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
      volume: Number(v.volume ?? 0),
    }));
  },
};

/* -------------------------------- Polygon ------------------------------ */
const polygon: Adapter = {
  id: "polygon",
  async getQuote(symbol, key) {
    const d = await getJson(
      `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(symbol)}?apiKey=${key}`,
    );
    const t = d?.ticker;
    const price = num(t?.lastTrade?.p) ?? num(t?.day?.c) ?? num(t?.prevDay?.c);
    if (!price) return null;
    return quote(symbol, price, {
      prevClose: num(t?.prevDay?.c),
      dayOpen: num(t?.day?.o),
      dayHigh: num(t?.day?.h),
      dayLow: num(t?.day?.l),
      volume: num(t?.day?.v),
      currency: "USD",
    });
  },
  async getDailyBars(symbol, key, from, to) {
    const d = await getJson(
      `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${key}`,
    );
    if (!Array.isArray(d?.results)) return [];
    return d.results.map((r: any) => ({
      ts: new Date(Number(r.t)).toISOString().slice(0, 10),
      open: Number(r.o),
      high: Number(r.h),
      low: Number(r.l),
      close: Number(r.c),
      volume: Number(r.v ?? 0),
    }));
  },
};

/* ----------------------------- Alpha Vantage --------------------------- */
const alphavantage: Adapter = {
  id: "alphavantage",
  async getQuote(symbol, key) {
    const d = await getJson(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${key}`,
    );
    if (d?.Note || d?.Information) throw new Error(String(d.Note ?? d.Information));
    const g = d?.["Global Quote"] ?? {};
    const price = num(g["05. price"]);
    if (!price) return null;
    return quote(symbol, price, {
      prevClose: num(g["08. previous close"]),
      dayOpen: num(g["02. open"]),
      dayHigh: num(g["03. high"]),
      dayLow: num(g["04. low"]),
      volume: num(g["06. volume"]),
    });
  },
  async getDailyBars(symbol, key, from, to) {
    const d = await getJson(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=full&apikey=${key}`,
    );
    if (d?.Note || d?.Information) throw new Error(String(d.Note ?? d.Information));
    const series = d?.["Time Series (Daily)"];
    if (!series) return [];
    return Object.entries(series)
      .filter(([date]) => date >= from && date <= to)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, v]: [string, any]) => ({
        ts: date,
        open: Number(v["1. open"]),
        high: Number(v["2. high"]),
        low: Number(v["3. low"]),
        close: Number(v["4. close"]),
        volume: Number(v["5. volume"] ?? 0),
      }));
  },
};

/* --------------------------------- Tiingo ------------------------------ */
const tiingo: Adapter = {
  id: "tiingo",
  async getQuote(symbol, key) {
    const d = await getJson(`https://api.tiingo.com/iex/${encodeURIComponent(symbol)}?token=${key}`);
    const row = Array.isArray(d) ? d[0] : d;
    const price = num(row?.last) ?? num(row?.tngoLast) ?? num(row?.prevClose);
    if (!price) return null;
    return quote(symbol, price, {
      prevClose: num(row?.prevClose),
      dayOpen: num(row?.open),
      dayHigh: num(row?.high),
      dayLow: num(row?.low),
      volume: num(row?.volume),
      currency: "USD",
      quotedAt: row?.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
    });
  },
  async getDailyBars(symbol, key, from, to) {
    const d = await getJson(
      `https://api.tiingo.com/tiingo/daily/${encodeURIComponent(symbol)}/prices?startDate=${from}&endDate=${to}&token=${key}`,
    );
    if (!Array.isArray(d)) return [];
    return d.map((r: any) => ({
      ts: String(r.date).slice(0, 10),
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: Number(r.volume ?? 0),
    }));
  },
};

/* ------------------------------ Marketstack ---------------------------- */
const msSymbol = (s: string) => (isHK(s) ? `${hkCode(s)}.XHKG` : s);

const marketstack: Adapter = {
  id: "marketstack",
  async getQuote(symbol, key) {
    const d = await getJson(
      `https://api.marketstack.com/v1/eod/latest?access_key=${key}&symbols=${encodeURIComponent(msSymbol(symbol))}`,
    );
    if (d?.error) throw new Error(String(d.error?.message ?? "Marketstack error"));
    const row = d?.data?.[0];
    const price = num(row?.close);
    if (!price) return null;
    return quote(symbol, price, {
      dayOpen: num(row?.open),
      dayHigh: num(row?.high),
      dayLow: num(row?.low),
      volume: num(row?.volume),
      quotedAt: row?.date ? new Date(row.date).toISOString() : new Date().toISOString(),
    });
  },
  async getDailyBars(symbol, key, from, to) {
    const d = await getJson(
      `https://api.marketstack.com/v1/eod?access_key=${key}&symbols=${encodeURIComponent(msSymbol(symbol))}&date_from=${from}&date_to=${to}&limit=1000&sort=ASC`,
    );
    if (d?.error) throw new Error(String(d.error?.message ?? "Marketstack error"));
    if (!Array.isArray(d?.data)) return [];
    return d.data.map((r: any) => ({
      ts: String(r.date).slice(0, 10),
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: Number(r.volume ?? 0),
    }));
  },
};

/* --------------------------------- EODHD ------------------------------- */
const eodhd: Adapter = {
  id: "eodhd",
  async getQuote(symbol, key) {
    const sym = isHK(symbol) ? `${hkCode(symbol)}.HK` : `${symbol}.US`;
    const d = await getJson(`https://eodhd.com/api/real-time/${encodeURIComponent(sym)}?api_token=${key}&fmt=json`);
    const price = num(d?.close);
    if (!price) return null;
    return quote(symbol, price, {
      prevClose: num(d?.previousClose),
      dayOpen: num(d?.open),
      dayHigh: num(d?.high),
      dayLow: num(d?.low),
      volume: num(d?.volume),
      quotedAt: d?.timestamp ? new Date(Number(d.timestamp) * 1000).toISOString() : new Date().toISOString(),
    });
  },
  async getDailyBars(symbol, key, from, to) {
    const sym = isHK(symbol) ? `${hkCode(symbol)}.HK` : `${symbol}.US`;
    const d = await getJson(
      `https://eodhd.com/api/eod/${encodeURIComponent(sym)}?from=${from}&to=${to}&period=d&api_token=${key}&fmt=json`,
    );
    if (!Array.isArray(d)) return [];
    return d.map((r: any) => ({
      ts: String(r.date).slice(0, 10),
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: Number(r.volume ?? 0),
    }));
  },
};

/* ---------------------------------- FMP -------------------------------- */
const fmp: Adapter = {
  id: "fmp",
  async getQuote(symbol, key) {
    const d = await getJson(
      `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbol)}?apikey=${key}`,
    );
    const row = Array.isArray(d) ? d[0] : d;
    const price = num(row?.price);
    if (!price) return null;
    return quote(symbol, price, {
      prevClose: num(row?.previousClose),
      dayOpen: num(row?.open),
      dayHigh: num(row?.dayHigh),
      dayLow: num(row?.dayLow),
      volume: num(row?.volume),
    });
  },
  async getDailyBars(symbol, key, from, to) {
    const d = await getJson(
      `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(symbol)}?from=${from}&to=${to}&apikey=${key}`,
    );
    if (!Array.isArray(d?.historical)) return [];
    return d.historical
      .map((r: any) => ({
        ts: String(r.date).slice(0, 10),
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
        volume: Number(r.volume ?? 0),
      }))
      .reverse();
  },
};

export const ADAPTERS: Record<ProviderId, Adapter> = {
  finnhub,
  twelvedata,
  polygon,
  alphavantage,
  tiingo,
  marketstack,
  eodhd,
  fmp,
};

export function platformKey(provider: ProviderId): string | null {
  const map: Record<ProviderId, string> = {
    finnhub: "FINNHUB_API_KEY",
    twelvedata: "TWELVEDATA_API_KEY",
    polygon: "POLYGON_API_KEY",
    alphavantage: "ALPHAVANTAGE_API_KEY",
    tiingo: "TIINGO_API_KEY",
    marketstack: "MARKETSTACK_API_KEY",
    eodhd: "EODHD_API_KEY",
    fmp: "FMP_API_KEY",
  };
  return process.env[map[provider]] ?? null;
}
