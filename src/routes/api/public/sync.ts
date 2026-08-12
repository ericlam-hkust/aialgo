import { createFileRoute } from "@tanstack/react-router";
import { SYMBOLS } from "@/lib/market";

/**
 * Scheduled data pipeline endpoint.
 * Call with: POST /api/public/sync?kind=quotes|history  and header  x-sync-secret: <SYNC_CRON_SECRET>
 */
export const Route = createFileRoute("/api/public/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["SYNC_CRON_SECRET"];
        const provided = request.headers.get("x-sync-secret") ?? "";
        if (!secret || provided.length !== secret.length || provided !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const kind = new URL(request.url).searchParams.get("kind") ?? "quotes";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const {
          buildChain,
          quoteWithFallback,
          barsWithFallback,
          persistQuotes,
          persistDailyBars,
          logSyncRun,
        } = await import("@/lib/data-routing.server");

        const { data: connections } = await supabaseAdmin
          .from("data_source_connections")
          .select("id, user_id, provider, api_key_encrypted, use_platform_key, priority, enabled, status")
          .eq("enabled", true)
          .order("priority", { ascending: true });

        if (!connections || connections.length === 0) {
          return Response.json({ ok: false, message: "No enabled data source connections." }, { status: 200 });
        }

        const byUser = new Map<string, typeof connections>();
        for (const c of connections) {
          const list = byUser.get(c.user_id) ?? [];
          list.push(c);
          byUser.set(c.user_id, list);
        }

        const symbols = SYMBOLS.map((s) => s.symbol);
        let written = 0;
        const errors: string[] = [];

        for (const [userId, rows] of byUser) {
          const started = Date.now();
          try {
            if (kind === "history") {
              const to = new Date();
              const from = new Date(to);
              from.setFullYear(from.getFullYear() - 2);
              for (const symbol of symbols) {
                const chain = await buildChain(rows, symbol);
                const { bars } = await barsWithFallback(
                  chain,
                  symbol,
                  from.toISOString().slice(0, 10),
                  to.toISOString().slice(0, 10),
                );
                if (bars.length > 0) {
                  written += await persistDailyBars(
                    symbol,
                    symbol.toUpperCase().endsWith(".HK") ? "HK" : "US",
                    bars,
                  );
                }
              }
            } else {
              const persist: Parameters<typeof persistQuotes>[0] = [];
              await Promise.all(
                symbols.map(async (symbol) => {
                  const chain = await buildChain(rows, symbol);
                  const result = await quoteWithFallback(chain, symbol);
                  if (result.quote && result.provider) {
                    persist.push({ symbol, quote: result.quote, provider: result.provider });
                  }
                }),
              );
              await persistQuotes(persist);
              written += persist.length;
            }

            await logSyncRun({
              userId,
              kind: `cron:${kind}`,
              provider: "chain",
              rowsWritten: written,
              durationMs: Date.now() - started,
              status: "success",
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            errors.push(message);
            await logSyncRun({
              userId,
              kind: `cron:${kind}`,
              provider: "chain",
              rowsWritten: 0,
              durationMs: Date.now() - started,
              status: "error",
              error: message,
            });
          }
        }

        return Response.json({ ok: errors.length === 0, kind, written, errors });
      },
    },
  },
});
