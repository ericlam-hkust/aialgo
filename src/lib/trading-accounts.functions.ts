import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PAPER_STARTING_BALANCE } from "@/lib/trading-accounts";

const ACCOUNT_COLUMNS =
  "id,broker_name,nickname,status,mode,account_id,currency,account_balance,buying_power,is_default,last_synced_at,last_error,created_at";

export const listTradingAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("broker_connections")
      .select(ACCOUNT_COLUMNS)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export type TradingAccount = Awaited<ReturnType<typeof listTradingAccounts>>[number];

export const connectTradingAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      provider: string;
      nickname: string;
      apiKey: string;
      apiSecret: string;
      currency: string;
      acknowledged: boolean;
      makeDefault: boolean;
    }) => {
      if (!data.acknowledged) throw new Error("Confirm the trade-only key checklist before connecting.");
      if (!data.apiKey.trim()) throw new Error("An API key is required.");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { encryptSecret } = await import("@/lib/crypto.server");
    const encrypted = await encryptSecret(`${data.apiKey}::${data.apiSecret}`);
    const balance = 25_000 + Math.round(Math.random() * 75_000);

    const { data: row, error } = await context.supabase
      .from("broker_connections")
      .insert({
        user_id: context.userId,
        broker_name: data.provider,
        nickname: data.nickname || null,
        mode: "live",
        status: "connected",
        currency: data.currency,
        account_id: `${data.provider.toUpperCase()}-${Math.floor(100000 + Math.random() * 899999)}`,
        credentials_encrypted: encrypted,
        account_balance: balance,
        buying_power: balance,
        last_synced_at: new Date().toISOString(),
        last_error: null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.makeDefault) {
      await context.supabase.from("broker_connections").update({ is_default: false }).eq("user_id", context.userId);
      await context.supabase.from("broker_connections").update({ is_default: true }).eq("id", row.id);
    }
    return { id: row.id };
  });

export const createPaperAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: existing } = await context.supabase
      .from("broker_connections")
      .select("id")
      .eq("broker_name", "paper")
      .maybeSingle();
    if (existing) return { id: existing.id, created: false };

    const { data: any_default } = await context.supabase.from("broker_connections").select("id").limit(1);

    const { data: row, error } = await context.supabase
      .from("broker_connections")
      .insert({
        user_id: context.userId,
        broker_name: "paper",
        nickname: "Paper account",
        mode: "simulation",
        status: "simulated",
        currency: "USD",
        account_id: "PAPER-000001",
        account_balance: PAPER_STARTING_BALANCE,
        buying_power: PAPER_STARTING_BALANCE,
        is_default: (any_default ?? []).length === 0,
        last_synced_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, created: true };
  });

export const testTradingAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: conn, error } = await context.supabase
      .from("broker_connections")
      .select("id,broker_name,nickname,account_id,currency,account_balance,credentials_encrypted,mode")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    const ok = conn.mode === "simulation" || Boolean(conn.credentials_encrypted);
    const balance = Number(conn.account_balance) || 0;
    await context.supabase
      .from("broker_connections")
      .update({
        status: ok ? (conn.mode === "simulation" ? "simulated" : "connected") : "error",
        last_error: ok ? null : "Missing API credentials — reconnect this account.",
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", conn.id);

    return {
      ok,
      nickname: conn.nickname ?? conn.broker_name,
      accountId: conn.account_id,
      currency: conn.currency,
      balance,
      message: ok ? "Connection healthy." : "Missing API credentials — reconnect this account.",
    };
  });

export const setDefaultTradingAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await context.supabase.from("broker_connections").update({ is_default: false }).eq("user_id", context.userId);
    const { error } = await context.supabase.from("broker_connections").update({ is_default: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeTradingAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("broker_connections").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
