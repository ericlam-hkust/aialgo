import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient<any, any, any>;

const B62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Signal Gateway secrets are shown once and stored only as a SHA-256 hash. */
export function generateGatewaySecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let out = "";
  for (const b of bytes) out += B62[b % B62.length];
  return `sgw_${out}`;
}

export async function hashSecret(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function contributorIdFor(supabase: Client, userId: string): Promise<string | null> {
  const { data } = await supabase.from("contributor_profiles").select("id").eq("user_id", userId).maybeSingle();
  return data?.id ?? null;
}

export function periodKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx] ?? 0);
}

/**
 * Trust tier is derived, never contributor-declared:
 * hosted code we run ourselves is Platform Verified; remote models earn
 * Live Verified only after 90 days of gateway-timestamped signals.
 */
export function deriveTrustTier(input: { hosting_mode: string; live_since: string | null; signalDays: number }) {
  if (input.hosting_mode === "hosted") return "platform_verified" as const;
  const days = input.live_since
    ? Math.floor((Date.now() - new Date(input.live_since).getTime()) / 86_400_000)
    : input.signalDays;
  return days >= 90 ? ("live_verified" as const) : ("unproven" as const);
}

export type SignalPayload = {
  symbol: string;
  action: "buy" | "sell" | "hold" | "close";
  confidence?: number;
  position_size_pct?: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  client_ts?: string | undefined;
};

export function validateSignal(body: unknown): { ok: true; value: SignalPayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "body must be a JSON object" };
  const b = body as Record<string, unknown>;
  const symbol = typeof b["symbol"] === "string" ? b["symbol"].trim().toUpperCase() : "";
  if (!symbol || symbol.length > 20) return { ok: false, error: "symbol is required" };
  const action = String(b["action"] ?? "").toLowerCase();
  if (!["buy", "sell", "hold", "close"].includes(action)) return { ok: false, error: "action must be buy|sell|hold|close" };
  const confidence = Number(b["confidence"] ?? 0.6);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)
    return { ok: false, error: "confidence must be between 0 and 1" };
  const size = Number(b["position_size_pct"] ?? 5);
  if (!Number.isFinite(size) || size <= 0 || size > 100) return { ok: false, error: "position_size_pct must be 0-100" };
  return {
    ok: true,
    value: {
      symbol,
      action: action as SignalPayload["action"],
      confidence,
      position_size_pct: size,
      stop_loss: b["stop_loss"] == null ? null : Number(b["stop_loss"]),
      take_profit: b["take_profit"] == null ? null : Number(b["take_profit"]),
      client_ts: typeof b["client_ts"] === "string" ? b["client_ts"] : undefined,
    },
  };
}
