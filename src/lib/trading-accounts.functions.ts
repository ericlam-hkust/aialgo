import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PAPER_STARTING_BALANCE, providerMeta } from "@/lib/trading-accounts";

const ACCOUNT_COLUMNS =
  "id,broker_name,nickname,status,mode,account_id,currency,account_balance,buying_power,is_default,last_synced_at,last_error,created_at,config";

export const listTradingAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [accounts, dataSources] = await Promise.all([
      context.supabase.from("broker_connections").select(ACCOUNT_COLUMNS).order("created_at", { ascending: true }),
      context.supabase
        .from("data_source_connections")
        .select("id, broker_connection_id, enabled")
        .not("broker_connection_id", "is", null),
    ]);
    if (accounts.error) throw new Error(accounts.error.message);
    const dataByAccount = new Map(
      (dataSources.data ?? []).map((d) => [d.broker_connection_id as string, { id: d.id, enabled: d.enabled }]),
    );
    return (accounts.data ?? []).map((a) => ({
      ...a,
      data_source: dataByAccount.get(a.id) ?? null,
    }));
  });

export type TradingAccount = Awaited<ReturnType<typeof listTradingAccounts>>[number];

const connectSchema = z.object({
  provider: z.string().min(1).max(24),
  nickname: z.string().trim().max(60).default(""),
  currency: z.string().trim().max(8).default("USD"),
  fields: z.record(z.string(), z.string().trim().max(8000)).default({}),
  acknowledged: z.boolean(),
  makeDefault: z.boolean().default(false),
  useForData: z.boolean().default(false),
  accountId: z.string().uuid().nullable().optional(),
});

/** Build the encrypted secret blob and the non-secret config for a provider. */
function splitFields(provider: string, fields: Record<string, string>) {
  const meta = providerMeta(provider);
  if (!meta) throw new Error(`Unsupported venue: ${provider}`);
  const config: Record<string, string> = {};
  const secrets: Record<string, string> = {};
  for (const field of meta.fields) {
    const value = (fields[field.id] ?? "").trim();
    if (field.required && !value) throw new Error(`${field.label} is required for ${meta.label}.`);
    if (!value) continue;
    if (field.secret) secrets[field.id] = value;
    else config[field.id] = value;
  }
  let secretBlob: string | null = null;
  if (provider === "alpaca" || provider === "binance" || provider === "coinbase") {
    if (secrets["apiKey"]) secretBlob = `${secrets["apiKey"]}::${secrets["apiSecret"] ?? ""}`;
  } else if (provider === "tiger") {
    secretBlob = secrets["privateKey"] ?? null;
  } else if (provider === "futu") {
    secretBlob = secrets["unlockPassword"] ?? null;
  } else if (provider === "ibkr") {
    secretBlob = secrets["apiKey"] ?? null;
  }
  return { meta, config, secretBlob };
}

export const connectTradingAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => connectSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (!data.acknowledged) throw new Error("Confirm the trade-only key checklist before connecting.");
    const { meta, config, secretBlob } = splitFields(data.provider, data.fields);

    const { encryptSecret } = await import("@/lib/crypto.server");
    const encrypted = secretBlob ? await encryptSecret(secretBlob) : null;

    const row: Record<string, unknown> = {
      user_id: context.userId,
      broker_name: data.provider,
      nickname: data.nickname || meta.label,
      mode: "live",
      status: "connected",
      currency: data.currency || meta.currency,
      account_id: config["accountId"] ?? null,
      config,
      last_synced_at: null,
      last_error: null,
    };
    if (encrypted) row["credentials_encrypted"] = encrypted;

    let id = data.accountId ?? null;
    if (id) {
      const { error } = await context.supabase.from("broker_connections").update(row as never).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { data: inserted, error } = await context.supabase
        .from("broker_connections")
        .insert(row as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      id = inserted.id;
    }

    if (data.makeDefault) {
      await context.supabase.from("broker_connections").update({ is_default: false }).eq("user_id", context.userId);
      await context.supabase.from("broker_connections").update({ is_default: true }).eq("id", id!);
    }

    if (data.useForData && meta.dataCapable) {
      await setBrokerDataSource(context.supabase, context.userId, id!, data.provider, true);
    }

    return { id: id!, dataCapable: meta.dataCapable };
  });

/** Create or remove the data_source_connections row backed by a broker account. */
async function setBrokerDataSource(
  supabase: { from: (t: string) => any },
  userId: string,
  connectionId: string,
  provider: string,
  enabled: boolean,
) {
  const { data: existing } = await supabase
    .from("data_source_connections")
    .select("id")
    .eq("broker_connection_id", connectionId)
    .maybeSingle();

  if (!enabled) {
    if (existing?.id) await supabase.from("data_source_connections").delete().eq("id", existing.id);
    return;
  }
  if (existing?.id) {
    await supabase.from("data_source_connections").update({ enabled: true }).eq("id", existing.id);
    return;
  }
  await supabase.from("data_source_connections").insert({
    user_id: userId,
    provider: `broker:${provider}`,
    label: `${provider} account data`,
    broker_connection_id: connectionId,
    use_platform_key: false,
    priority: 10,
    enabled: true,
    status: "connected",
    status_message: "Uses your broker's own market data entitlement.",
    last_checked_at: new Date().toISOString(),
  });
}

export const toggleAccountDataSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: conn, error } = await context.supabase
      .from("broker_connections")
      .select("id, broker_name")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const meta = providerMeta(conn.broker_name);
    if (data.enabled && !meta?.dataCapable) {
      throw new Error(`${meta?.label ?? conn.broker_name} cannot serve historical market data.`);
    }
    await setBrokerDataSource(context.supabase, context.userId, conn.id, conn.broker_name, data.enabled);
    return { ok: true, enabled: data.enabled };
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

/** Live connectivity check — calls the broker API when the venue supports it. */
export const testTradingAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: conn, error } = await context.supabase
      .from("broker_connections")
      .select("id,broker_name,nickname,account_id,currency,account_balance,credentials_encrypted,mode,config")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    const label = conn.nickname ?? conn.broker_name;
    const finish = async (ok: boolean, message: string, patch: Record<string, unknown> = {}) => {
      await context.supabase
        .from("broker_connections")
        .update({
          status: ok ? (conn.mode === "simulation" ? "simulated" : "connected") : "error",
          last_error: ok ? null : message,
          last_synced_at: new Date().toISOString(),
          ...patch,
        })
        .eq("id", conn.id);
      return {
        ok,
        message,
        nickname: label,
        accountId: (patch["account_id"] as string) ?? conn.account_id,
        currency: (patch["currency"] as string) ?? conn.currency,
        balance: Number(patch["account_balance"] ?? conn.account_balance) || 0,
      };
    };

    if (conn.mode === "simulation") return finish(true, "Paper account ready.");

    const { isTradableBroker, fetchBrokerSnapshot } = await import("@/lib/brokers.server");
    if (isTradableBroker(conn.broker_name) && conn.broker_name !== "alpaca") {
      try {
        const snap = await fetchBrokerSnapshot(
          conn.broker_name as "ibkr" | "tiger" | "futu",
          (conn.config ?? {}) as Record<string, unknown>,
          conn.credentials_encrypted,
        );
        return finish(true, `Connected to ${label} — balance ${snap.account.balance} ${snap.account.currency}.`, {
          account_id: snap.account.accountId,
          currency: snap.account.currency,
          account_balance: snap.account.balance,
          buying_power: snap.account.buyingPower,
        });
      } catch (err) {
        return finish(false, err instanceof Error ? err.message : String(err));
      }
    }

    if (!conn.credentials_encrypted) {
      return finish(false, "Missing API credentials — reconnect this account.");
    }
    return finish(true, "Credentials stored. Live balance sync runs from the trading desk.");
  });

export const setDefaultTradingAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase.from("broker_connections").update({ is_default: false }).eq("user_id", context.userId);
    const { error } = await context.supabase.from("broker_connections").update({ is_default: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** What breaks if this account is disconnected. */
export const getAccountDependencies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const [activations, orders, positions, dataSource] = await Promise.all([
      context.supabase
        .from("model_activations")
        .select("id, status, model:ai_models(name, listing_kind)")
        .eq("broker_connection_id", data.id)
        .in("status", ["active", "paused"]),
      context.supabase
        .from("broker_orders")
        .select("id, symbol, status")
        .eq("broker_connection_id", data.id)
        .in("status", ["new", "accepted", "partially_filled", "pending_new", "working"]),
      context.supabase.from("broker_positions").select("id, symbol").eq("broker_connection_id", data.id),
      context.supabase
        .from("data_source_connections")
        .select("id")
        .eq("broker_connection_id", data.id)
        .maybeSingle(),
    ]);

    const strategies = (activations.data ?? []).map((a) => {
      const model = (Array.isArray(a.model) ? a.model[0] : a.model) as
        | { name: string; listing_kind: string }
        | null;
      return {
        id: a.id,
        status: a.status,
        name: model?.name ?? "Strategy",
        kind: model?.listing_kind ?? "algo",
      };
    });

    return {
      strategies,
      activeStrategies: strategies.filter((s) => s.status === "active").length,
      openOrders: (orders.data ?? []).length,
      openPositions: (positions.data ?? []).length,
      isDataSource: Boolean(dataSource.data?.id),
    };
  });

export const removeTradingAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), pauseStrategies: z.boolean().default(true) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.pauseStrategies) {
      await context.supabase
        .from("model_activations")
        .update({ status: "paused", paused_reason: "Trading account disconnected", paused_at: new Date().toISOString() })
        .eq("broker_connection_id", data.id)
        .eq("status", "active");
    }
    const { error } = await context.supabase.from("broker_connections").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
