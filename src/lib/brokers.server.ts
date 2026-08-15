import { decryptSecret } from "@/lib/crypto.server";

export type BrokerId = "ibkr" | "tiger" | "futu";

export type BrokerAccount = {
  accountId: string;
  currency: string;
  balance: number;
  buyingPower: number;
};

export type BrokerPosition = {
  accountId: string;
  symbol: string;
  quantity: number;
  avgCost: number;
  marketPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  currency: string | null;
};

export type BrokerOrder = {
  accountId: string;
  orderId: string;
  symbol: string;
  side: string;
  orderType: string | null;
  quantity: number;
  filledQuantity: number;
  limitPrice: number | null;
  avgFillPrice: number | null;
  status: string;
  placedAt: string | null;
};

export type BrokerSnapshot = {
  account: BrokerAccount;
  positions: BrokerPosition[];
  orders: BrokerOrder[];
};

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
};

async function json(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`Broker request failed [${res.status}]: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Broker returned non-JSON response: ${text.slice(0, 200)}`);
  }
}

/* ------------------------- Interactive Brokers ------------------------- */
/** Talks to a Client Portal Gateway (self-hosted) over its REST API. */
async function ibkrSnapshot(config: Record<string, unknown>, secret: string | null): Promise<BrokerSnapshot> {
  const base = String(config["gatewayUrl"] ?? "").replace(/\/+$/, "");
  if (!base) throw new Error("Interactive Brokers needs the URL of your Client Portal Gateway.");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (secret) headers["Authorization"] = `Bearer ${secret}`;

  const accounts = await json(`${base}/v1/api/portfolio/accounts`, { headers });
  const wanted = String(config["accountId"] ?? "");
  const account = (Array.isArray(accounts) ? accounts : []).find(
    (a: any) => !wanted || a?.accountId === wanted || a?.id === wanted,
  );
  const accountId = String(account?.accountId ?? account?.id ?? wanted);
  if (!accountId) throw new Error("The gateway returned no accounts. Make sure you are logged into the gateway.");

  const summary = await json(`${base}/v1/api/portfolio/${accountId}/summary`, { headers });
  const currency = String(summary?.netliquidation?.currency ?? config["currency"] ?? "USD");

  const rawPositions = await json(`${base}/v1/api/portfolio/${accountId}/positions/0`, { headers });
  const positions: BrokerPosition[] = (Array.isArray(rawPositions) ? rawPositions : []).map((p: any) => ({
    accountId,
    symbol: String(p?.contractDesc ?? p?.ticker ?? p?.conid ?? "?"),
    quantity: num(p?.position),
    avgCost: num(p?.avgCost),
    marketPrice: num(p?.mktPrice),
    marketValue: num(p?.mktValue),
    unrealizedPnl: num(p?.unrealizedPnl),
    currency: p?.currency ? String(p.currency) : currency,
  }));

  let orders: BrokerOrder[] = [];
  try {
    const rawOrders = await json(`${base}/v1/api/iserver/account/orders`, { headers });
    orders = (rawOrders?.orders ?? []).map((o: any) => ({
      accountId,
      orderId: String(o?.orderId ?? o?.order_ref ?? crypto.randomUUID()),
      symbol: String(o?.ticker ?? o?.symbol ?? "?"),
      side: String(o?.side ?? "").toLowerCase() || "unknown",
      orderType: o?.orderType ? String(o.orderType) : null,
      quantity: num(o?.totalSize),
      filledQuantity: num(o?.filledQuantity),
      limitPrice: o?.price ? num(o.price) : null,
      avgFillPrice: o?.avgPrice ? num(o.avgPrice) : null,
      status: String(o?.status ?? "unknown"),
      placedAt: o?.lastExecutionTime_r ? new Date(Number(o.lastExecutionTime_r)).toISOString() : null,
    }));
  } catch {
    orders = [];
  }

  return {
    account: {
      accountId,
      currency,
      balance: num(summary?.netliquidation?.amount),
      buyingPower: num(summary?.buyingpower?.amount ?? summary?.availablefunds?.amount),
    },
    positions,
    orders,
  };
}

/* ------------------------------ Tiger Brokers -------------------------- */
function pemToPkcs8(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const raw = atob(body);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function tigerTimestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

async function tigerCall(
  tigerId: string,
  privateKeyPem: string,
  method: string,
  bizContent: Record<string, unknown>,
): Promise<any> {
  const params: Record<string, string> = {
    method,
    tiger_id: tigerId,
    charset: "UTF-8",
    sign_type: "RSA",
    timestamp: tigerTimestamp(),
    version: "2.0",
    biz_content: JSON.stringify(bizContent),
  };
  const signSource = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signSource));
  let bin = "";
  for (const b of new Uint8Array(sigBuf)) bin += String.fromCharCode(b);

  const body = await json("https://openapi.tigerfintech.com/gateway", {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=UTF-8" },
    body: JSON.stringify({ ...params, sign: btoa(bin) }),
  });
  if (body?.code !== undefined && Number(body.code) !== 0) {
    throw new Error(`Tiger API error ${body.code}: ${body.message ?? "unknown"}`);
  }
  return typeof body?.data === "string" ? JSON.parse(body.data) : body?.data;
}

async function tigerSnapshot(config: Record<string, unknown>, secret: string | null): Promise<BrokerSnapshot> {
  const tigerId = String(config["tigerId"] ?? "");
  const accountId = String(config["accountId"] ?? "");
  if (!tigerId || !accountId) throw new Error("Tiger needs both a Tiger ID and an account number.");
  if (!secret) throw new Error("Tiger needs your RSA private key.");

  const assets = await tigerCall(tigerId, secret, "get_prime_assets", {
    account: accountId,
    base_currency: String(config["currency"] ?? "USD"),
    consolidated: true,
  });
  const segment = assets?.segments?.[0] ?? assets?.items?.[0]?.segments?.[0] ?? {};
  const currency = String(segment?.currency ?? config["currency"] ?? "USD");

  const positionsRaw = await tigerCall(tigerId, secret, "get_positions", { account: accountId });
  const positionItems = positionsRaw?.items ?? positionsRaw?.positions ?? [];
  const positions: BrokerPosition[] = (Array.isArray(positionItems) ? positionItems : []).map((p: any) => {
    const quantity = num(p?.position ?? p?.quantity);
    const avgCost = num(p?.average_cost ?? p?.averageCost);
    const price = num(p?.latest_price ?? p?.latestPrice ?? p?.market_price);
    return {
      accountId,
      symbol: String(p?.symbol ?? "?"),
      quantity,
      avgCost,
      marketPrice: price,
      marketValue: num(p?.market_value ?? quantity * price),
      unrealizedPnl: num(p?.unrealized_pnl ?? (price - avgCost) * quantity),
      currency: p?.currency ? String(p.currency) : currency,
    };
  });

  let orders: BrokerOrder[] = [];
  try {
    const ordersRaw = await tigerCall(tigerId, secret, "get_orders", { account: accountId });
    const items = ordersRaw?.items ?? ordersRaw?.orders ?? [];
    orders = (Array.isArray(items) ? items : []).map((o: any) => ({
      accountId,
      orderId: String(o?.id ?? o?.order_id ?? crypto.randomUUID()),
      symbol: String(o?.symbol ?? "?"),
      side: String(o?.action ?? o?.side ?? "").toLowerCase() || "unknown",
      orderType: o?.order_type ? String(o.order_type) : null,
      quantity: num(o?.total_quantity ?? o?.quantity),
      filledQuantity: num(o?.filled_quantity ?? o?.filled),
      limitPrice: o?.limit_price ? num(o.limit_price) : null,
      avgFillPrice: o?.avg_fill_price ? num(o.avg_fill_price) : null,
      status: String(o?.status ?? "unknown"),
      placedAt: o?.order_time ? new Date(Number(o.order_time)).toISOString() : null,
    }));
  } catch {
    orders = [];
  }

  return {
    account: {
      accountId,
      currency,
      balance: num(segment?.net_liquidation ?? segment?.netLiquidation),
      buyingPower: num(segment?.buying_power ?? segment?.buyingPower ?? segment?.cash_available_for_trade),
    },
    positions,
    orders,
  };
}

/* --------------------------------- Futu -------------------------------- */
/**
 * Futu's OpenAPI only accepts connections from a locally running OpenD gateway,
 * so we talk to the user's own OpenD HTTP bridge.
 */
async function futuSnapshot(config: Record<string, unknown>, secret: string | null): Promise<BrokerSnapshot> {
  const base = String(config["opendUrl"] ?? "").replace(/\/+$/, "");
  if (!base) {
    throw new Error(
      "Futu / moomoo requires a reachable OpenD gateway. Enter the HTTP address of your OpenD bridge (for example https://your-host:11111).",
    );
  }
  const accountId = String(config["accountId"] ?? "");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (secret) headers["Authorization"] = `Bearer ${secret}`;

  const acc = await json(`${base}/api/account${accountId ? `?acc_id=${encodeURIComponent(accountId)}` : ""}`, {
    headers,
  });
  const resolvedId = String(acc?.acc_id ?? acc?.accountId ?? accountId ?? "futu");
  const currency = String(acc?.currency ?? config["currency"] ?? "HKD");

  const posRaw = await json(`${base}/api/positions?acc_id=${encodeURIComponent(resolvedId)}`, { headers });
  const posItems = posRaw?.data ?? posRaw?.positions ?? posRaw;
  const positions: BrokerPosition[] = (Array.isArray(posItems) ? posItems : []).map((p: any) => ({
    accountId: resolvedId,
    symbol: String(p?.code ?? p?.symbol ?? "?"),
    quantity: num(p?.qty ?? p?.quantity),
    avgCost: num(p?.cost_price ?? p?.avgCost),
    marketPrice: num(p?.nominal_price ?? p?.price),
    marketValue: num(p?.market_val ?? p?.marketValue),
    unrealizedPnl: num(p?.pl_val ?? p?.unrealizedPnl),
    currency,
  }));

  let orders: BrokerOrder[] = [];
  try {
    const ordRaw = await json(`${base}/api/orders?acc_id=${encodeURIComponent(resolvedId)}`, { headers });
    const items = ordRaw?.data ?? ordRaw?.orders ?? ordRaw;
    orders = (Array.isArray(items) ? items : []).map((o: any) => ({
      accountId: resolvedId,
      orderId: String(o?.order_id ?? crypto.randomUUID()),
      symbol: String(o?.code ?? o?.symbol ?? "?"),
      side: String(o?.trd_side ?? o?.side ?? "").toLowerCase() || "unknown",
      orderType: o?.order_type ? String(o.order_type) : null,
      quantity: num(o?.qty),
      filledQuantity: num(o?.dealt_qty),
      limitPrice: o?.price ? num(o.price) : null,
      avgFillPrice: o?.dealt_avg_price ? num(o.dealt_avg_price) : null,
      status: String(o?.order_status ?? "unknown"),
      placedAt: o?.create_time ? new Date(o.create_time).toISOString() : null,
    }));
  } catch {
    orders = [];
  }

  return {
    account: {
      accountId: resolvedId,
      currency,
      balance: num(acc?.total_assets ?? acc?.balance),
      buyingPower: num(acc?.power ?? acc?.buyingPower ?? acc?.cash),
    },
    positions,
    orders,
  };
}

export async function fetchBrokerSnapshot(
  broker: BrokerId,
  config: Record<string, unknown>,
  credentialsEncrypted: string | null,
): Promise<BrokerSnapshot> {
  const secret = credentialsEncrypted ? await decryptSecret(credentialsEncrypted) : null;
  if (broker === "ibkr") return ibkrSnapshot(config, secret);
  if (broker === "tiger") return tigerSnapshot(config, secret);
  if (broker === "futu") return futuSnapshot(config, secret);
  throw new Error(`Unsupported broker: ${broker}`);
}

/* ============================ Order routing ============================ */

export type TradableBroker = BrokerId | "alpaca";

export type PlaceOrderRequest = {
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  orderType: "market" | "limit";
  limitPrice?: number | null;
  timeInForce: "day" | "gtc";
  clientOrderId: string;
};

export type PlacedOrder = {
  brokerOrderId: string;
  status: string;
  filledQuantity: number;
  avgFillPrice: number | null;
  placedAt: string;
};

export function isTradableBroker(broker: string): broker is TradableBroker {
  return broker === "ibkr" || broker === "tiger" || broker === "futu" || broker === "alpaca";
}

function alpacaCreds(secret: string | null): { key: string; secret: string } {
  const [key = "", rest = ""] = (secret ?? "").split("::");
  if (!key) throw new Error("Alpaca needs an API key and secret — reconnect this account.");
  return { key, secret: rest };
}

function alpacaBase(config: Record<string, unknown>): string {
  const custom = String(config["gatewayUrl"] ?? "").replace(/\/+$/, "");
  return custom || "https://api.alpaca.markets";
}

/* ------------------------------- place -------------------------------- */

async function ibkrPlace(
  config: Record<string, unknown>,
  secret: string | null,
  req: PlaceOrderRequest,
): Promise<PlacedOrder> {
  const base = String(config["gatewayUrl"] ?? "").replace(/\/+$/, "");
  if (!base) throw new Error("Interactive Brokers needs the URL of your Client Portal Gateway.");
  const accountId = String(config["accountId"] ?? "");
  if (!accountId) throw new Error("Set the IBKR account number on this connection before trading.");
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (secret) headers["Authorization"] = `Bearer ${secret}`;

  const body = {
    orders: [
      {
        cOID: req.clientOrderId,
        ticker: req.symbol,
        secType: "STK",
        orderType: req.orderType === "limit" ? "LMT" : "MKT",
        side: req.side.toUpperCase(),
        quantity: req.quantity,
        tif: req.timeInForce.toUpperCase(),
        ...(req.orderType === "limit" ? { price: req.limitPrice } : {}),
      },
    ],
  };

  const res = await json(`${base}/v1/api/iserver/account/${encodeURIComponent(accountId)}/orders`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const first = Array.isArray(res) ? res[0] : res;
  const id = String(first?.order_id ?? first?.orderId ?? first?.id ?? req.clientOrderId);
  return {
    brokerOrderId: id,
    status: String(first?.order_status ?? "submitted").toLowerCase(),
    filledQuantity: 0,
    avgFillPrice: null,
    placedAt: new Date().toISOString(),
  };
}

async function tigerPlace(
  config: Record<string, unknown>,
  secret: string | null,
  req: PlaceOrderRequest,
): Promise<PlacedOrder> {
  const tigerId = String(config["tigerId"] ?? "");
  const accountId = String(config["accountId"] ?? "");
  if (!tigerId || !accountId) throw new Error("Tiger needs both a Tiger ID and an account number.");
  if (!secret) throw new Error("Tiger needs your RSA private key.");

  const data = await tigerCall(tigerId, secret, "place_order", {
    account: accountId,
    symbol: req.symbol,
    sec_type: "STK",
    action: req.side.toUpperCase(),
    order_type: req.orderType === "limit" ? "LMT" : "MKT",
    total_quantity: req.quantity,
    time_in_force: req.timeInForce.toUpperCase(),
    ...(req.orderType === "limit" ? { limit_price: req.limitPrice } : {}),
  });
  return {
    brokerOrderId: String(data?.id ?? data?.order_id ?? req.clientOrderId),
    status: String(data?.status ?? "submitted").toLowerCase(),
    filledQuantity: num(data?.filled_quantity),
    avgFillPrice: data?.avg_fill_price ? num(data.avg_fill_price) : null,
    placedAt: new Date().toISOString(),
  };
}

async function futuPlace(
  config: Record<string, unknown>,
  secret: string | null,
  req: PlaceOrderRequest,
): Promise<PlacedOrder> {
  const base = String(config["opendUrl"] ?? "").replace(/\/+$/, "");
  if (!base) throw new Error("Futu / moomoo requires a reachable OpenD gateway before you can trade.");
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (secret) headers["Authorization"] = `Bearer ${secret}`;

  const data = await json(`${base}/api/place_order`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      acc_id: String(config["accountId"] ?? ""),
      code: req.symbol,
      trd_side: req.side.toUpperCase(),
      order_type: req.orderType === "limit" ? "NORMAL" : "MARKET",
      qty: req.quantity,
      price: req.orderType === "limit" ? req.limitPrice : undefined,
      remark: req.clientOrderId,
    }),
  });
  const row = data?.data ?? data;
  return {
    brokerOrderId: String(row?.order_id ?? req.clientOrderId),
    status: String(row?.order_status ?? "submitted").toLowerCase(),
    filledQuantity: num(row?.dealt_qty),
    avgFillPrice: row?.dealt_avg_price ? num(row.dealt_avg_price) : null,
    placedAt: new Date().toISOString(),
  };
}

async function alpacaPlace(
  config: Record<string, unknown>,
  secret: string | null,
  req: PlaceOrderRequest,
): Promise<PlacedOrder> {
  const creds = alpacaCreds(secret);
  const data = await json(`${alpacaBase(config)}/v2/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "APCA-API-KEY-ID": creds.key,
      "APCA-API-SECRET-KEY": creds.secret,
    },
    body: JSON.stringify({
      symbol: req.symbol,
      qty: String(req.quantity),
      side: req.side,
      type: req.orderType,
      time_in_force: req.timeInForce,
      client_order_id: req.clientOrderId,
      ...(req.orderType === "limit" ? { limit_price: String(req.limitPrice ?? 0) } : {}),
    }),
  });
  return {
    brokerOrderId: String(data?.id ?? req.clientOrderId),
    status: String(data?.status ?? "submitted").toLowerCase(),
    filledQuantity: num(data?.filled_qty),
    avgFillPrice: data?.filled_avg_price ? num(data.filled_avg_price) : null,
    placedAt: String(data?.submitted_at ?? new Date().toISOString()),
  };
}

export async function placeBrokerOrder(
  broker: TradableBroker,
  config: Record<string, unknown>,
  credentialsEncrypted: string | null,
  req: PlaceOrderRequest,
): Promise<PlacedOrder> {
  const secret = credentialsEncrypted ? await decryptSecret(credentialsEncrypted) : null;
  if (broker === "ibkr") return ibkrPlace(config, secret, req);
  if (broker === "tiger") return tigerPlace(config, secret, req);
  if (broker === "futu") return futuPlace(config, secret, req);
  return alpacaPlace(config, secret, req);
}

/* ------------------------------- cancel -------------------------------- */

export async function cancelBrokerOrder(
  broker: TradableBroker,
  config: Record<string, unknown>,
  credentialsEncrypted: string | null,
  brokerOrderId: string,
): Promise<void> {
  const secret = credentialsEncrypted ? await decryptSecret(credentialsEncrypted) : null;

  if (broker === "ibkr") {
    const base = String(config["gatewayUrl"] ?? "").replace(/\/+$/, "");
    const accountId = String(config["accountId"] ?? "");
    const headers: Record<string, string> = { Accept: "application/json" };
    if (secret) headers["Authorization"] = `Bearer ${secret}`;
    await json(`${base}/v1/api/iserver/account/${encodeURIComponent(accountId)}/order/${encodeURIComponent(brokerOrderId)}`, {
      method: "DELETE",
      headers,
    });
    return;
  }

  if (broker === "tiger") {
    const tigerId = String(config["tigerId"] ?? "");
    if (!secret) throw new Error("Tiger needs your RSA private key.");
    await tigerCall(tigerId, secret, "cancel_order", {
      account: String(config["accountId"] ?? ""),
      id: brokerOrderId,
    });
    return;
  }

  if (broker === "futu") {
    const base = String(config["opendUrl"] ?? "").replace(/\/+$/, "");
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    if (secret) headers["Authorization"] = `Bearer ${secret}`;
    await json(`${base}/api/cancel_order`, {
      method: "POST",
      headers,
      body: JSON.stringify({ acc_id: String(config["accountId"] ?? ""), order_id: brokerOrderId }),
    });
    return;
  }

  const creds = alpacaCreds(secret);
  await fetch(`${alpacaBase(config)}/v2/orders/${encodeURIComponent(brokerOrderId)}`, {
    method: "DELETE",
    headers: { "APCA-API-KEY-ID": creds.key, "APCA-API-SECRET-KEY": creds.secret },
  });
}

/* ----------------------------- open orders ----------------------------- */

export async function fetchOpenOrders(
  broker: TradableBroker,
  config: Record<string, unknown>,
  credentialsEncrypted: string | null,
): Promise<BrokerOrder[]> {
  if (broker !== "alpaca") {
    const snapshot = await fetchBrokerSnapshot(broker, config, credentialsEncrypted);
    return snapshot.orders;
  }
  const secret = credentialsEncrypted ? await decryptSecret(credentialsEncrypted) : null;
  const creds = alpacaCreds(secret);
  const rows = await json(`${alpacaBase(config)}/v2/orders?status=all&limit=100`, {
    headers: { "APCA-API-KEY-ID": creds.key, "APCA-API-SECRET-KEY": creds.secret },
  });
  return (Array.isArray(rows) ? rows : []).map((o: any) => ({
    accountId: String(config["accountId"] ?? ""),
    orderId: String(o?.id),
    symbol: String(o?.symbol ?? "?"),
    side: String(o?.side ?? "").toLowerCase() || "unknown",
    orderType: o?.type ? String(o.type) : null,
    quantity: num(o?.qty),
    filledQuantity: num(o?.filled_qty),
    limitPrice: o?.limit_price ? num(o.limit_price) : null,
    avgFillPrice: o?.filled_avg_price ? num(o.filled_avg_price) : null,
    status: String(o?.status ?? "unknown"),
    placedAt: o?.submitted_at ? String(o.submitted_at) : null,
  }));
}


/* ========================= Historical market data ======================= */

export type BrokerBar = {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type BrokerDataBroker = TradableBroker;

/** Brokers whose adapters can serve historical candles for backtesting. */
export function brokerSupportsData(broker: string): broker is BrokerDataBroker {
  return broker === "ibkr" || broker === "tiger" || broker === "futu" || broker === "alpaca";
}

const dayMs = 86_400_000;

function isoDay(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

async function alpacaBars(
  config: Record<string, unknown>,
  secret: string | null,
  symbol: string,
  from: string,
  to: string,
  timeframe: string,
): Promise<BrokerBar[]> {
  const creds = alpacaCreds(secret);
  const url = `https://data.alpaca.markets/v2/stocks/${encodeURIComponent(symbol)}/bars?timeframe=${encodeURIComponent(timeframe)}&start=${from}&end=${to}&limit=10000&adjustment=all&feed=iex`;
  const body = await json(url, {
    headers: { "APCA-API-KEY-ID": creds.key, "APCA-API-SECRET-KEY": creds.secret },
  });
  return (body?.bars ?? []).map((b: any) => ({
    ts: timeframe === "1Day" ? String(b.t).slice(0, 10) : new Date(b.t).toISOString(),
    open: num(b.o),
    high: num(b.h),
    low: num(b.l),
    close: num(b.c),
    volume: num(b.v),
  }));
}

async function ibkrBars(
  config: Record<string, unknown>,
  secret: string | null,
  symbol: string,
  from: string,
  to: string,
  intraday: string | null,
): Promise<BrokerBar[]> {
  const base = String(config["gatewayUrl"] ?? "").replace(/\/+$/, "");
  if (!base) throw new Error("Interactive Brokers needs the URL of your Client Portal Gateway.");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (secret) headers["Authorization"] = `Bearer ${secret}`;

  const found = await json(`${base}/v1/api/iserver/secdef/search?symbol=${encodeURIComponent(symbol)}`, { headers });
  const conid = Array.isArray(found) ? found[0]?.conid : null;
  if (!conid) throw new Error(`Interactive Brokers could not resolve ${symbol}.`);

  const days = Math.max(1, Math.ceil((Date.parse(to) - Date.parse(from)) / dayMs));
  const period = intraday ? `${Math.min(days, 30)}d` : days > 365 ? `${Math.ceil(days / 365)}y` : `${days}d`;
  const bar = intraday ?? "1d";
  const body = await json(
    `${base}/v1/api/iserver/marketdata/history?conid=${conid}&period=${period}&bar=${bar}&outsideRth=false`,
    { headers },
  );
  return (body?.data ?? []).map((b: any) => ({
    ts: intraday ? new Date(num(b.t)).toISOString() : isoDay(num(b.t)),
    open: num(b.o),
    high: num(b.h),
    low: num(b.l),
    close: num(b.c),
    volume: num(b.v),
  }));
}

async function futuBars(
  config: Record<string, unknown>,
  secret: string | null,
  symbol: string,
  from: string,
  to: string,
  intraday: string | null,
): Promise<BrokerBar[]> {
  const base = String(config["opendUrl"] ?? "").replace(/\/+$/, "");
  if (!base) throw new Error("Futu / moomoo needs a reachable OpenD gateway to serve historical data.");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (secret) headers["Authorization"] = `Bearer ${secret}`;
  const ktype = intraday ? `K_${intraday}` : "K_DAY";
  const body = await json(
    `${base}/api/candles?code=${encodeURIComponent(symbol)}&ktype=${ktype}&start=${from}&end=${to}`,
    { headers },
  );
  const items = body?.data ?? body?.candles ?? body;
  return (Array.isArray(items) ? items : []).map((b: any) => ({
    ts: intraday ? new Date(b.time_key ?? b.ts).toISOString() : String(b.time_key ?? b.ts).slice(0, 10),
    open: num(b.open),
    high: num(b.high),
    low: num(b.low),
    close: num(b.close),
    volume: num(b.volume),
  }));
}

async function tigerBars(
  config: Record<string, unknown>,
  secret: string | null,
  symbol: string,
  from: string,
  to: string,
  intraday: string | null,
): Promise<BrokerBar[]> {
  const tigerId = String(config["tigerId"] ?? "");
  if (!tigerId || !secret) throw new Error("Tiger Brokers needs a Tiger ID and RSA private key.");
  const data = await tigerCall(tigerId, secret, "kline", {
    symbols: [symbol],
    period: intraday ?? "day",
    begin_time: Date.parse(from),
    end_time: Date.parse(to),
    limit: 5000,
  });
  const items = Array.isArray(data) ? (data[0]?.items ?? []) : (data?.items ?? []);
  return (Array.isArray(items) ? items : []).map((b: any) => ({
    ts: intraday ? new Date(num(b.time)).toISOString() : isoDay(num(b.time)),
    open: num(b.open),
    high: num(b.high),
    low: num(b.low),
    close: num(b.close),
    volume: num(b.volume),
  }));
}

/** Historical candles from a user's own broker account. */
export async function fetchBrokerBars(
  broker: string,
  config: Record<string, unknown>,
  credentialsEncrypted: string | null,
  opts: { symbol: string; from: string; to: string; interval?: string | null },
): Promise<BrokerBar[]> {
  if (!brokerSupportsData(broker)) throw new Error(`${broker} cannot serve historical data.`);
  const secret = credentialsEncrypted ? await decryptSecret(credentialsEncrypted) : null;
  const { symbol, from, to } = opts;
  const interval = opts.interval ?? null;
  if (broker === "alpaca") {
    const tf = interval ? (interval.endsWith("min") ? `${parseInt(interval, 10)}Min` : interval) : "1Day";
    return alpacaBars(config, secret, symbol, from, to, tf);
  }
  if (broker === "ibkr") return ibkrBars(config, secret, symbol, from, to, interval);
  if (broker === "futu") return futuBars(config, secret, symbol, from, to, interval);
  return tigerBars(config, secret, symbol, from, to, interval);
}
