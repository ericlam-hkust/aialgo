import { createFileRoute } from "@tanstack/react-router";
import { hashSecret, validateSignal } from "@/lib/gateway.server";

/**
 * POST /api/public/v1/signals
 * Tier 2 Signal Gateway ingestion. Contributors running models on their own
 * infrastructure post signals here; we timestamp, validate and fan them out to
 * subscriber activations. Every call is logged in `signal_events`, which is what
 * makes the remote live track record unfakeable.
 *
 * Headers: Authorization: Bearer sgw_...   X-Model-Id: <uuid>
 */
export const Route = createFileRoute("/api/public/v1/signals")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const receivedAt = Date.now();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const auth = request.headers.get("authorization") ?? "";
        const secret = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
        const modelId = request.headers.get("x-model-id") ?? "";
        if (!secret.startsWith("sgw_") || !/^[0-9a-f-]{36}$/i.test(modelId)) {
          return Response.json({ error: "invalid_credentials" }, { status: 401 });
        }

        const { data: model } = await supabaseAdmin
          .from("ai_models")
          .select("id, contributor_id, hosting_mode, status, declared_frequency, gateway_secret_hash, live_since")
          .eq("id", modelId)
          .maybeSingle();

        if (!model || model.gateway_secret_hash !== (await hashSecret(secret))) {
          return Response.json({ error: "invalid_credentials" }, { status: 401 });
        }
        if (model.hosting_mode !== "remote") {
          return Response.json({ error: "not_a_remote_model" }, { status: 409 });
        }

        let body: unknown = null;
        try {
          body = await request.json();
        } catch {
          body = null;
        }
        const parsed = validateSignal(body);
        const clientTs = parsed.ok && parsed.value.client_ts ? Date.parse(parsed.value.client_ts) : NaN;
        const latency = Number.isFinite(clientTs)
          ? Math.max(0, receivedAt - clientTs)
          : Math.max(1, Date.now() - receivedAt);

        // Fan out to every running activation of this model.
        let reached = 0;
        if (parsed.ok) {
          const { data: activations } = await supabaseAdmin
            .from("model_activations")
            .select("id, user_id, status")
            .eq("model_id", model.id)
            .eq("status", "running");

          const rows = (activations ?? []).map((a) => ({
            user_id: a.user_id,
            activation_id: a.id,
            model_id: model.id,
            symbol: parsed.value.symbol,
            action: parsed.value.action,
            confidence: parsed.value.confidence ?? 0.6,
            position_size_pct: parsed.value.position_size_pct ?? 5,
            stop_loss: parsed.value.stop_loss ?? null,
            take_profit: parsed.value.take_profit ?? null,
            status: "accepted",
          }));
          if (rows.length) await supabaseAdmin.from("execution_signals").insert(rows);
          reached = rows.length;
        }

        await supabaseAdmin.from("signal_events").insert({
          model_id: model.id,
          contributor_id: model.contributor_id,
          transport: request.headers.get("x-transport") === "websocket" ? "websocket" : "rest",
          symbol: parsed.ok ? parsed.value.symbol : "UNKNOWN",
          action: parsed.ok ? parsed.value.action : "invalid",
          validation_ok: parsed.ok,
          validation_error: parsed.ok ? null : parsed.error,
          subscribers_reached: reached,
          latency_ms: latency,
        });

        if (!model.live_since) {
          await supabaseAdmin.from("ai_models").update({ live_since: new Date().toISOString() }).eq("id", model.id);
        }

        // Rolling gateway health for the contributor console + HFT latency badge.
        const since = new Date(Date.now() - 86_400_000).toISOString();
        const { data: recent } = await supabaseAdmin
          .from("signal_events")
          .select("latency_ms, validation_ok")
          .eq("model_id", model.id)
          .gte("received_at", since)
          .limit(1000);

        const lats = (recent ?? []).map((r) => Number(r.latency_ms ?? 0)).sort((a, b) => a - b);
        const p = (q: number) => (lats.length ? Math.round(lats[Math.min(lats.length - 1, Math.floor(q * lats.length))] ?? 0) : 0);
        const errors = (recent ?? []).filter((r) => !r.validation_ok).length;

        await supabaseAdmin.from("gateway_status").upsert(
          {
            model_id: model.id,
            status: "online",
            last_signal_at: new Date().toISOString(),
            p50_latency_ms: p(0.5),
            p95_latency_ms: p(0.95),
            error_rate: recent?.length ? errors / recent.length : 0,
            calls_today: recent?.length ?? 1,
            paused_reason: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "model_id" },
        );

        await supabaseAdmin.from("ai_models").update({ measured_latency_ms: p(0.5) }).eq("id", model.id);

        if (!parsed.ok) {
          return Response.json({ error: "validation_failed", detail: parsed.error, latency_ms: latency }, { status: 422 });
        }
        return Response.json({ ok: true, subscribers_reached: reached, latency_ms: latency, received_at: new Date(receivedAt).toISOString() });
      },
    },
  },
});
