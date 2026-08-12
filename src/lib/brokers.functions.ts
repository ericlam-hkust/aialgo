import { createServerFn } from "@tanstack/react-start";
import { getPlanTier, requireFeature } from "./entitlements.server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchBrokerSnapshot, type BrokerId } from "@/lib/brokers.server";
import { encryptSecret } from "@/lib/crypto.server";
import { logSyncRun } from "@/lib/data-routing.server";

const brokerEnum = z.enum(["ibkr", "tiger", "futu"]);

export const listBrokerConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [connections, positions, orders] = await Promise.all([
      context.supabase
        .from("broker_connections")
        .select(
          "id, broker_name, status, mode, account_id, currency, account_balance, buying_power, auto_sync_minutes, last_synced_at, last_error, config",
        )
        .order("created_at", { ascending: true }),
      context.supabase.from("broker_positions").select("*").order("market_value", { ascending: false }),
      context.supabase.from("broker_orders").select("*").order("placed_at", { ascending: false }).limit(50),
    ]);
    if (connections.error) throw new Error(connections.error.message);
    return {
      connections: connections.data ?? [],
      positions: positions.data ?? [],
      orders: orders.data ?? [],
    };
  });

export const saveBrokerConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        broker: brokerEnum,
        mode: z.enum(["live", "simulation"]).default("live"),
        accountId: z.string().trim().max(64).default(""),
        currency: z.string().trim().max(8).default("USD"),
        secret: z.string().trim().max(8000).optional(),
        gatewayUrl: z.string().trim().max(300).optional(),
        opendUrl: z.string().trim().max(300).optional(),
        tigerId: z.string().trim().max(64).optional(),
        autoSyncMinutes: z.number().int().min(0).max(1440).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    requireFeature(await getPlanTier(context.supabase, context.userId), "brokerConnections", "Broker connections");
    const config: Record<string, string> = {
      accountId: data.accountId,
      currency: data.currency,
    };
    if (data.gatewayUrl) config["gatewayUrl"] = data.gatewayUrl;
    if (data.opendUrl) config["opendUrl"] = data.opendUrl;
    if (data.tigerId) config["tigerId"] = data.tigerId;

    const { data: existing } = await context.supabase
      .from("broker_connections")
      .select("id, credentials_encrypted")
      .eq("broker_name", data.broker)
      .maybeSingle();

    const credentials = data.secret
      ? await encryptSecret(data.secret)
      : (existing?.credentials_encrypted ?? null);

    const row = {
      user_id: context.userId,
      broker_name: data.broker,
      mode: data.mode,
      status: data.mode === "simulation" ? "simulated" : "connected",
      account_id: data.accountId || null,
      currency: data.currency,
      config: config as Record<string, string>,
      credentials_encrypted: credentials,
      auto_sync_minutes: data.autoSyncMinutes,
      last_error: null,
      ...(data.mode === "simulation"
        ? { account_balance: 1_000_000, buying_power: 1_000_000, last_synced_at: new Date().toISOString() }
        : {}),
    };

    if (existing?.id) {
      const { error } = await context.supabase.from("broker_connections").update(row).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: existing.id };
    }

    const { data: inserted, error } = await context.supabase
      .from("broker_connections")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id };
  });

export const syncBroker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    requireFeature(await getPlanTier(context.supabase, context.userId), "brokerConnections", "Broker connections");
    const started = Date.now();
    const { data: conn, error } = await context.supabase
      .from("broker_connections")
      .select("id, broker_name, mode, config, credentials_encrypted")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    if (conn.mode === "simulation") {
      return { ok: false, message: "This connection is in simulation mode — switch it to live to sync real data." };
    }

    try {
      const snapshot = await fetchBrokerSnapshot(
        conn.broker_name as BrokerId,
        (conn.config ?? {}) as Record<string, unknown>,
        conn.credentials_encrypted,
      );

      await context.supabase
        .from("broker_connections")
        .update({
          status: "connected",
          account_id: snapshot.account.accountId,
          currency: snapshot.account.currency,
          account_balance: snapshot.account.balance,
          buying_power: snapshot.account.buyingPower,
          last_synced_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", conn.id);

      await context.supabase.from("broker_positions").delete().eq("broker_connection_id", conn.id);
      if (snapshot.positions.length > 0) {
        await context.supabase.from("broker_positions").insert(
          snapshot.positions.map((p) => ({
            user_id: context.userId,
            broker_connection_id: conn.id,
            account_id: p.accountId,
            symbol: p.symbol,
            quantity: p.quantity,
            avg_cost: p.avgCost,
            market_price: p.marketPrice,
            market_value: p.marketValue,
            unrealized_pnl: p.unrealizedPnl,
            currency: p.currency,
            synced_at: new Date().toISOString(),
          })),
        );
      }

      if (snapshot.orders.length > 0) {
        await context.supabase.from("broker_orders").upsert(
          snapshot.orders.map((o) => ({
            user_id: context.userId,
            broker_connection_id: conn.id,
            account_id: o.accountId,
            broker_order_id: o.orderId,
            symbol: o.symbol,
            side: o.side,
            order_type: o.orderType,
            quantity: o.quantity,
            filled_quantity: o.filledQuantity,
            limit_price: o.limitPrice,
            avg_fill_price: o.avgFillPrice,
            status: o.status,
            placed_at: o.placedAt,
            synced_at: new Date().toISOString(),
          })),
          { onConflict: "broker_connection_id,broker_order_id" },
        );
      }

      await logSyncRun({
        userId: context.userId,
        kind: "broker",
        provider: conn.broker_name,
        rowsWritten: snapshot.positions.length + snapshot.orders.length,
        durationMs: Date.now() - started,
        status: "success",
      });

      return {
        ok: true,
        message: `Synced ${snapshot.positions.length} positions and ${snapshot.orders.length} orders.`,
        account: snapshot.account,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await context.supabase
        .from("broker_connections")
        .update({ status: "error", last_error: message })
        .eq("id", conn.id);
      await logSyncRun({
        userId: context.userId,
        kind: "broker",
        provider: conn.broker_name,
        rowsWritten: 0,
        durationMs: Date.now() - started,
        status: "error",
        error: message,
      });
      return { ok: false, message };
    }
  });

export const disconnectBroker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("broker_connections").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
