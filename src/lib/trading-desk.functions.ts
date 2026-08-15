import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ACCOUNT_COLUMNS =
  "id,broker_name,nickname,status,mode,account_id,currency,account_balance,buying_power,is_default,last_synced_at,last_error,config";

const ORDER_COLUMNS =
  "id,broker_connection_id,broker_order_id,client_order_id,symbol,side,order_type,time_in_force,quantity,filled_quantity,limit_price,avg_fill_price,status,reject_reason,source,strategy_id,model_id,activation_id,placed_by_user_id,placed_at,synced_at";

/** Everything the trading desk needs: accounts, order book, positions and attribution sources. */
export const getDeskState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [accounts, orders, positions, strategies, activations, quotes] = await Promise.all([
      supabase.from("broker_connections").select(ACCOUNT_COLUMNS).order("created_at", { ascending: true }),
      supabase.from("broker_orders").select(ORDER_COLUMNS).order("synced_at", { ascending: false }).limit(300),
      supabase.from("broker_positions").select("*").order("market_value", { ascending: false }),
      supabase
        .from("strategies")
        .select("id,name,category")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(100),
      supabase
        .from("model_activations")
        .select("id,model_id,status,model:ai_models(id,name,listing_kind)")
        .eq("user_id", userId)
        .order("activated_at", { ascending: false })
        .limit(100),
      supabase.from("market_quotes").select("symbol,price,change_pct,currency,quoted_at"),
    ]);

    if (accounts.error) throw new Error(accounts.error.message);

    return {
      accounts: accounts.data ?? [],
      orders: orders.data ?? [],
      positions: positions.data ?? [],
      strategies: strategies.data ?? [],
      activations: activations.data ?? [],
      quotes: quotes.data ?? [],
    };
  });

export type DeskState = Awaited<ReturnType<typeof getDeskState>>;

const manualOrderSchema = z.object({
  accountId: z.string().uuid(),
  symbol: z.string().trim().min(1).max(24).toUpperCase(),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().positive().max(1_000_000),
  orderType: z.enum(["market", "limit"]),
  limitPrice: z.number().positive().max(10_000_000).nullable().optional(),
  timeInForce: z.enum(["day", "gtc"]).default("day"),
  attribution: z
    .object({
      kind: z.enum(["manual", "algo", "ai_model"]).default("manual"),
      strategyId: z.string().uuid().nullable().optional(),
      activationId: z.string().uuid().nullable().optional(),
    })
    .default({ kind: "manual" }),
});

/** Places a real broker order (or a locally simulated fill for simulation accounts). */
export const placeManualOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => manualOrderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: account, error: accountError } = await supabase
      .from("broker_connections")
      .select("id,broker_name,nickname,mode,status,currency,account_id,buying_power,config,credentials_encrypted")
      .eq("id", data.accountId)
      .single();
    if (accountError) throw new Error(accountError.message);

    if (data.orderType === "limit" && !data.limitPrice) {
      throw new Error("Enter a limit price for a limit order.");
    }

    // Attribution — verify the linked strategy / activation belongs to the caller.
    let strategyId: string | null = null;
    let activationId: string | null = null;
    let modelId: string | null = null;
    let source: "manual" | "algo" | "ai_model" = "manual";

    if (data.attribution.kind === "algo" && data.attribution.strategyId) {
      const { data: strat } = await supabase
        .from("strategies")
        .select("id")
        .eq("id", data.attribution.strategyId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!strat) throw new Error("That strategy could not be found on your account.");
      strategyId = strat.id;
      source = "algo";
    }

    if (data.attribution.kind === "ai_model" && data.attribution.activationId) {
      const { data: act } = await supabase
        .from("model_activations")
        .select("id,model_id")
        .eq("id", data.attribution.activationId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!act) throw new Error("That AI model activation could not be found on your account.");
      activationId = act.id;
      modelId = act.model_id;
      source = "ai_model";
    }

    // Reference price from the live quote feed (used for sizing checks and simulated fills).
    const { data: quote } = await supabase
      .from("market_quotes")
      .select("price")
      .eq("symbol", data.symbol)
      .maybeSingle();
    const refPrice = data.orderType === "limit" ? Number(data.limitPrice) : Number(quote?.price ?? 0);
    const notional = refPrice * data.quantity;

    const buyingPower = Number(account.buying_power ?? 0);
    if (data.side === "buy" && notional > 0 && buyingPower > 0 && notional > buyingPower) {
      throw new Error(
        `Order notional ${notional.toFixed(2)} ${account.currency} exceeds the buying power on this account.`,
      );
    }

    const { data: riskSettings } = await supabase
      .from("risk_settings")
      .select("max_position_size_pct")
      .eq("user_id", userId)
      .maybeSingle();
    const balance = Number(account.account_balance ?? buyingPower ?? 0);
    const maxPct = Number(riskSettings?.max_position_size_pct ?? 0);
    if (maxPct > 0 && balance > 0 && notional > (balance * maxPct) / 100) {
      throw new Error(
        `This order is ${((notional / balance) * 100).toFixed(1)}% of the account — above your ${maxPct}% max position size in Risk Center.`,
      );
    }

    const clientOrderId = `aialgo-${crypto.randomUUID().slice(0, 18)}`;
    const simulated = account.mode === "simulation" || account.broker_name === "paper";

    let brokerOrderId = clientOrderId;
    let status = "submitted";
    let filledQuantity = 0;
    let avgFillPrice: number | null = null;
    let rejectReason: string | null = null;
    const placedAt = new Date().toISOString();

    if (simulated) {
      if (!refPrice) throw new Error("No live price available for that symbol yet — try again in a moment.");
      status = "filled";
      filledQuantity = data.quantity;
      avgFillPrice = refPrice;
    } else {
      const { placeBrokerOrder, isTradableBroker } = await import("@/lib/brokers.server");
      if (!isTradableBroker(account.broker_name)) {
        throw new Error(`${account.broker_name} does not support order placement from aiAlgo yet.`);
      }
      if (account.status === "error") throw new Error("This account is in an error state — reconnect it first.");
      if (!account.credentials_encrypted) throw new Error("This account has no stored credentials — reconnect it.");

      try {
        const placed = await placeBrokerOrder(
          account.broker_name,
          (account.config ?? {}) as Record<string, unknown>,
          account.credentials_encrypted,
          {
            symbol: data.symbol,
            side: data.side,
            quantity: data.quantity,
            orderType: data.orderType,
            limitPrice: data.limitPrice ?? null,
            timeInForce: data.timeInForce,
            clientOrderId,
          },
        );
        brokerOrderId = placed.brokerOrderId;
        status = placed.status;
        filledQuantity = placed.filledQuantity;
        avgFillPrice = placed.avgFillPrice;
      } catch (err) {
        status = "rejected";
        rejectReason = err instanceof Error ? err.message : String(err);
      }
    }

    const { data: row, error } = await supabase
      .from("broker_orders")
      .insert({
        user_id: userId,
        broker_connection_id: account.id,
        account_id: account.account_id,
        broker_order_id: brokerOrderId,
        client_order_id: clientOrderId,
        symbol: data.symbol,
        side: data.side,
        order_type: data.orderType,
        time_in_force: data.timeInForce,
        quantity: data.quantity,
        filled_quantity: filledQuantity,
        limit_price: data.limitPrice ?? null,
        avg_fill_price: avgFillPrice,
        status,
        reject_reason: rejectReason,
        source,
        strategy_id: strategyId,
        model_id: modelId,
        activation_id: activationId,
        placed_by_user_id: userId,
        placed_at: placedAt,
        synced_at: placedAt,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return {
      ok: status !== "rejected",
      id: row.id,
      status,
      simulated,
      message:
        status === "rejected"
          ? (rejectReason ?? "The broker rejected this order.")
          : simulated
            ? `Simulated fill: ${data.side} ${data.quantity} ${data.symbol} @ ${avgFillPrice}`
            : `Order sent to ${account.nickname || account.broker_name}.`,
    };
  });

/** Cancels a working order at the broker and reflects it locally. */
export const cancelDeskOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: order, error } = await supabase
      .from("broker_orders")
      .select("id,broker_order_id,status,broker_connection_id")
      .eq("id", data.orderId)
      .single();
    if (error) throw new Error(error.message);

    const { data: account } = await supabase
      .from("broker_connections")
      .select("broker_name,mode,config,credentials_encrypted")
      .eq("id", order.broker_connection_id)
      .single();

    const simulated = !account || account.mode === "simulation" || account.broker_name === "paper";
    if (!simulated) {
      const { cancelBrokerOrder, isTradableBroker } = await import("@/lib/brokers.server");
      if (!isTradableBroker(account.broker_name)) {
        throw new Error(`${account.broker_name} does not support cancelling from aiAlgo.`);
      }
      await cancelBrokerOrder(
        account.broker_name,
        (account.config ?? {}) as Record<string, unknown>,
        account.credentials_encrypted,
        order.broker_order_id,
      );
    }

    await supabase
      .from("broker_orders")
      .update({ status: "cancelled", synced_at: new Date().toISOString() })
      .eq("id", order.id);

    return { ok: true };
  });

/** Pulls the latest order book straight from the broker for one account. */
export const refreshOrderBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ accountId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: account, error } = await supabase
      .from("broker_connections")
      .select("id,broker_name,mode,account_id,config,credentials_encrypted")
      .eq("id", data.accountId)
      .single();
    if (error) throw new Error(error.message);

    if (account.mode === "simulation" || account.broker_name === "paper") {
      return { ok: true, synced: 0, message: "Simulation account — orders are managed inside aiAlgo." };
    }

    const { fetchOpenOrders, isTradableBroker } = await import("@/lib/brokers.server");
    if (!isTradableBroker(account.broker_name)) {
      return { ok: false, synced: 0, message: `${account.broker_name} order sync is not supported yet.` };
    }

    try {
      const orders = await fetchOpenOrders(
        account.broker_name,
        (account.config ?? {}) as Record<string, unknown>,
        account.credentials_encrypted,
      );
      if (orders.length > 0) {
        // Orders aiAlgo placed keep their attribution; unknown ones land as broker-sourced.
        const { data: known } = await supabase
          .from("broker_orders")
          .select("broker_order_id")
          .eq("broker_connection_id", account.id);
        const knownIds = new Set((known ?? []).map((k) => k.broker_order_id));

        await supabase.from("broker_orders").upsert(
          orders.map((o) => ({
            user_id: userId,
            broker_connection_id: account.id,
            account_id: o.accountId || account.account_id,
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
            ...(knownIds.has(o.orderId) ? {} : { source: "broker" as const }),
          })),
          { onConflict: "broker_connection_id,broker_order_id" },
        );
      }
      await supabase
        .from("broker_connections")
        .update({ last_synced_at: new Date().toISOString(), last_error: null, status: "connected" })
        .eq("id", account.id);
      return { ok: true, synced: orders.length, message: `Synced ${orders.length} orders from the broker.` };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await supabase.from("broker_connections").update({ status: "error", last_error: message }).eq("id", account.id);
      return { ok: false, synced: 0, message };
    }
  });
