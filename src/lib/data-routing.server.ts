import type { SupabaseClient } from "@supabase/supabase-js";
import { ADAPTERS, platformKey, type Bar, type NormalizedQuote } from "@/lib/market-providers.server";
import { decryptSecret } from "@/lib/crypto.server";
import { PROVIDERS, providerCoversSymbol, type ProviderId } from "@/lib/data-providers";

export type ChainLink = { provider: ProviderId; key: string; source: "user" | "platform" };

type ConnectionRow = {
  provider: string;
  api_key_encrypted: string | null;
  use_platform_key: boolean;
  priority: number;
  enabled: boolean;
};

export async function loadConnections(supabase: SupabaseClient): Promise<ConnectionRow[]> {
  const { data, error } = await supabase
    .from("data_source_connections")
    .select("provider, api_key_encrypted, use_platform_key, priority, enabled")
    .order("priority", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ConnectionRow[];
}

/** Ordered list of usable (provider, key) pairs that can serve this symbol. */
export async function buildChain(rows: ConnectionRow[], symbol: string): Promise<ChainLink[]> {
  const chain: ChainLink[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const provider = row.provider as ProviderId;
    if (!row.enabled || !ADAPTERS[provider] || !providerCoversSymbol(provider, symbol)) continue;
    let key: string | null = null;
    if (row.use_platform_key) key = platformKey(provider);
    else if (row.api_key_encrypted) {
      try {
        key = await decryptSecret(row.api_key_encrypted);
      } catch {
        key = null;
      }
    }
    if (!key) continue;
    chain.push({ provider, key, source: row.use_platform_key ? "platform" : "user" });
    seen.add(provider);
  }

  // Platform fallbacks for providers the user has not configured.
  for (const meta of PROVIDERS) {
    if (seen.has(meta.id) || !providerCoversSymbol(meta.id, symbol)) continue;
    const key = platformKey(meta.id);
    if (!key) continue;
    chain.push({ provider: meta.id, key, source: "platform" });
  }

  return chain;
}

export type QuoteResult = {
  quote: NormalizedQuote | null;
  provider: ProviderId | null;
  error: string | null;
};

export async function quoteWithFallback(chain: ChainLink[], symbol: string): Promise<QuoteResult> {
  let lastError: string | null = chain.length === 0 ? "No data provider configured for this symbol" : null;
  for (const link of chain) {
    try {
      const q = await ADAPTERS[link.provider].getQuote(symbol, link.key);
      if (q) return { quote: q, provider: link.provider, error: null };
      lastError = `${link.provider} returned no quote for ${symbol}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  return { quote: null, provider: null, error: lastError };
}

export async function barsWithFallback(
  chain: ChainLink[],
  symbol: string,
  from: string,
  to: string,
): Promise<{ bars: Bar[]; provider: ProviderId | null; error: string | null }> {
  let lastError: string | null = chain.length === 0 ? "No data provider configured for this symbol" : null;
  for (const link of chain) {
    try {
      const bars = await ADAPTERS[link.provider].getDailyBars(symbol, link.key, from, to);
      if (bars.length > 0) return { bars, provider: link.provider, error: null };
      lastError = `${link.provider} returned no bars for ${symbol}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  return { bars: [], provider: null, error: lastError };
}

export async function intradayWithFallback(
  chain: ChainLink[],
  symbol: string,
  interval: string,
): Promise<{ bars: Bar[]; provider: ProviderId | null; error: string | null }> {
  let lastError: string | null = chain.length === 0 ? "No data provider configured for this symbol" : null;
  for (const link of chain) {
    const adapter = ADAPTERS[link.provider];
    if (!adapter.getIntradayBars) continue;
    try {
      const bars = await adapter.getIntradayBars(symbol, link.key, interval);
      if (bars.length > 0) return { bars, provider: link.provider, error: null };
      lastError = `${link.provider} returned no intraday bars for ${symbol}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  return { bars: [], provider: null, error: lastError ?? "No configured provider supports intraday bars" };
}

export async function persistQuotes(rows: { symbol: string; quote: NormalizedQuote; provider: ProviderId }[]) {
  if (rows.length === 0) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("market_quotes").upsert(
    rows.map(({ symbol, quote, provider }) => ({
      symbol,
      price: quote.price,
      prev_close: quote.prevClose,
      change_pct:
        quote.prevClose && quote.prevClose > 0 ? ((quote.price - quote.prevClose) / quote.prevClose) * 100 : 0,
      day_open: quote.dayOpen,
      day_high: quote.dayHigh,
      day_low: quote.dayLow,
      volume: quote.volume === null ? null : Math.round(quote.volume),
      currency: quote.currency,
      provider,
      quoted_at: quote.quotedAt,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "symbol" },
  );
}

export async function persistDailyBars(symbol: string, market: string, bars: Bar[]): Promise<number> {
  if (bars.length === 0) return 0;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const payload = bars.map((b) => ({
    symbol,
    date: b.ts.slice(0, 10),
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: Math.round(b.volume ?? 0),
    market,
  }));
  for (let i = 0; i < payload.length; i += 500) {
    const { error } = await supabaseAdmin
      .from("market_data_daily")
      .upsert(payload.slice(i, i + 500), { onConflict: "symbol,date" });
    if (error) throw new Error(error.message);
  }
  return payload.length;
}

export async function persistIntradayBars(
  symbol: string,
  interval: string,
  provider: string,
  bars: Bar[],
): Promise<number> {
  if (bars.length === 0) return 0;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const payload = bars.map((b) => ({
    symbol,
    interval,
    ts: b.ts,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: Math.round(b.volume ?? 0),
    provider,
  }));
  for (let i = 0; i < payload.length; i += 500) {
    const { error } = await supabaseAdmin
      .from("market_data_intraday")
      .upsert(payload.slice(i, i + 500), { onConflict: "symbol,interval,ts" });
    if (error) throw new Error(error.message);
  }
  return payload.length;
}

export async function logSyncRun(run: {
  userId: string | null;
  kind: string;
  provider: string;
  symbol?: string | null;
  rangeStart?: string | null;
  rangeEnd?: string | null;
  rowsWritten: number;
  durationMs: number;
  status: "success" | "error" | "partial";
  error?: string | null;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("data_sync_runs").insert({
    user_id: run.userId,
    kind: run.kind,
    provider: run.provider,
    symbol: run.symbol ?? null,
    range_start: run.rangeStart ?? null,
    range_end: run.rangeEnd ?? null,
    rows_written: run.rowsWritten,
    duration_ms: run.durationMs,
    status: run.status,
    error: run.error ?? null,
  });
}

export async function validateProviderKey(provider: ProviderId, key: string, symbol: string) {
  const adapter = ADAPTERS[provider];
  if (!adapter) return { ok: false, message: "Unknown provider" };
  try {
    const q = await adapter.getQuote(symbol, key);
    if (!q) return { ok: false, message: `Connected, but no quote returned for ${symbol}` };
    return { ok: true, message: `Live quote for ${symbol}: ${q.price}` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
