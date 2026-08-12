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
