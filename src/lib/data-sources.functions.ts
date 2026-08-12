import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  barsWithFallback,
  buildChain,
  intradayWithFallback,
  loadConnections,
  logSyncRun,
  persistDailyBars,
  persistIntradayBars,
  persistQuotes,
  quoteWithFallback,
  validateProviderKey,
} from "@/lib/data-routing.server";
import { encryptSecret, maskSuffix } from "@/lib/crypto.server";
import { platformKey } from "@/lib/market-providers.server";
import { PROVIDERS, type ProviderId } from "@/lib/data-providers";

const providerEnum = z.enum([
  "finnhub",
  "twelvedata",
  "polygon",
  "alphavantage",
  "tiingo",
  "marketstack",
  "eodhd",
  "fmp",
]);

export const listDataSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("data_source_connections")
      .select("id, provider, label, key_suffix, use_platform_key, priority, enabled, status, status_message, last_checked_at")
      .order("priority", { ascending: true });
    if (error) throw new Error(error.message);
    const platformAvailable = PROVIDERS.filter((p) => platformKey(p.id) !== null).map((p) => p.id);
    return { connections: data ?? [], platformAvailable };
  });

export const saveDataSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        provider: providerEnum,
        apiKey: z.string().trim().max(400).optional(),
        usePlatformKey: z.boolean().default(false),
        priority: z.number().int().min(1).max(999).default(100),
        enabled: z.boolean().default(true),
        label: z.string().trim().max(80).optional(),
        testSymbol: z.string().trim().max(20).default("AAPL"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const provider = data.provider as ProviderId;
    let keyToTest: string | null = null;

    if (data.usePlatformKey) {
      keyToTest = platformKey(provider);
      if (!keyToTest) {
        return { ok: false, status: "error", message: "No platform key is configured for this provider." };
      }
    } else if (data.apiKey) {
      keyToTest = data.apiKey;
    } else {
      const { data: existing } = await context.supabase
        .from("data_source_connections")
        .select("api_key_encrypted")
        .eq("provider", provider)
        .maybeSingle();
      if (!existing?.api_key_encrypted) {
        return { ok: false, status: "error", message: "An API key is required to connect this provider." };
      }
    }

    let status = "unverified";
    let message = "Saved without verification.";
    if (keyToTest) {
      const result = await validateProviderKey(provider, keyToTest, data.testSymbol);
      status = result.ok ? "connected" : "error";
      message = result.message;
    }

    const row: Record<string, unknown> = {
      user_id: context.userId,
      provider,
      label: data.label ?? null,
      use_platform_key: data.usePlatformKey,
      priority: data.priority,
      enabled: data.enabled,
      status,
      status_message: message,
      last_checked_at: new Date().toISOString(),
    };
    if (data.usePlatformKey) {
      row["api_key_encrypted"] = null;
      row["key_suffix"] = "platform";
    } else if (data.apiKey) {
      row["api_key_encrypted"] = await encryptSecret(data.apiKey);
      row["key_suffix"] = maskSuffix(data.apiKey);
    }

    const { error } = await context.supabase
      .from("data_source_connections")
      .upsert(row, { onConflict: "user_id,provider" });
    if (error) throw new Error(error.message);

    return { ok: status !== "error", status, message };
  });

export const deleteDataSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("data_source_connections").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testDataSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ provider: providerEnum, symbol: z.string().trim().max(20).default("AAPL") }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const rows = await loadConnections(context.supabase);
    const chain = await buildChain(rows, data.symbol);
    const link = chain.find((c) => c.provider === data.provider);
    if (!link) return { ok: false, message: "No usable key for this provider and symbol." };
    const result = await validateProviderKey(data.provider as ProviderId, link.key, data.symbol);
    await context.supabase
      .from("data_source_connections")
      .update({
        status: result.ok ? "connected" : "error",
        status_message: result.message,
        last_checked_at: new Date().toISOString(),
      })
      .eq("provider", data.provider);
    return result;
  });

export const fetchLiveQuotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ symbols: z.array(z.string().trim().max(20)).max(30) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const rows = await loadConnections(context.supabase);
    const persist: Parameters<typeof persistQuotes>[0] = [];
    const quotes: Record<
      string,
      { price: number; prevClose: number | null; changePct: number; provider: string | null; quotedAt: string }
    > = {};
    const errors: Record<string, string> = {};

    await Promise.all(
      data.symbols.map(async (symbol) => {
        const chain = await buildChain(rows, symbol);
        const result = await quoteWithFallback(chain, symbol);
        if (result.quote && result.provider) {
          const q = result.quote;
          quotes[symbol] = {
            price: q.price,
            prevClose: q.prevClose,
            changePct: q.prevClose && q.prevClose > 0 ? ((q.price - q.prevClose) / q.prevClose) * 100 : 0,
            provider: result.provider,
            quotedAt: q.quotedAt,
          };
          persist.push({ symbol, quote: q, provider: result.provider });
        } else if (result.error) {
          errors[symbol] = result.error;
        }
      }),
    );

    await persistQuotes(persist);
    return { quotes, errors, fetchedAt: new Date().toISOString() };
  });

export const syncHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        symbols: z.array(z.string().trim().max(20)).min(1).max(20),
        years: z.number().int().min(1).max(10).default(2),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const rows = await loadConnections(context.supabase);
    const to = new Date();
    const from = new Date(to);
    from.setFullYear(from.getFullYear() - data.years);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    const results: { symbol: string; rows: number; provider: string | null; error: string | null }[] = [];

    for (const symbol of data.symbols) {
      const started = Date.now();
      const chain = await buildChain(rows, symbol);
      const { bars, provider, error } = await barsWithFallback(chain, symbol, fromStr, toStr);
      let written = 0;
      let failure = error;
      if (bars.length > 0) {
        try {
          written = await persistDailyBars(symbol, symbol.toUpperCase().endsWith(".HK") ? "HK" : "US", bars);
        } catch (err) {
          failure = err instanceof Error ? err.message : String(err);
        }
      }
      await logSyncRun({
        userId: context.userId,
        kind: "history",
        provider: provider ?? "none",
        symbol,
        rangeStart: fromStr,
        rangeEnd: toStr,
        rowsWritten: written,
        durationMs: Date.now() - started,
        status: written > 0 ? "success" : "error",
        error: written > 0 ? null : failure,
      });
      results.push({ symbol, rows: written, provider, error: written > 0 ? null : failure });
    }

    return { results, from: fromStr, to: toStr };
  });

export const syncIntraday = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        symbols: z.array(z.string().trim().max(20)).min(1).max(10),
        interval: z.enum(["1min", "5min", "1h"]).default("5min"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const rows = await loadConnections(context.supabase);
    const results: { symbol: string; rows: number; provider: string | null; error: string | null }[] = [];

    for (const symbol of data.symbols) {
      const started = Date.now();
      const chain = await buildChain(rows, symbol);
      const { bars, provider, error } = await intradayWithFallback(chain, symbol, data.interval);
      let written = 0;
      let failure = error;
      if (bars.length > 0 && provider) {
        try {
          written = await persistIntradayBars(symbol, data.interval, provider, bars);
        } catch (err) {
          failure = err instanceof Error ? err.message : String(err);
        }
      }
      await logSyncRun({
        userId: context.userId,
        kind: `intraday:${data.interval}`,
        provider: provider ?? "none",
        symbol,
        rowsWritten: written,
        durationMs: Date.now() - started,
        status: written > 0 ? "success" : "error",
        error: written > 0 ? null : failure,
      });
      results.push({ symbol, rows: written, provider, error: written > 0 ? null : failure });
    }

    return { results };
  });

export const listSyncRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("data_sync_runs")
      .select("id, kind, provider, symbol, rows_written, duration_ms, status, error, created_at")
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
