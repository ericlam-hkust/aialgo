import { createFileRoute } from "@tanstack/react-router";
import { hashToken } from "@/lib/teams.server";

/**
 * GET /api/public/v1/models
 * Public catalog by default. With a team token (Authorization: Bearer afk_...)
 * the team's unlisted and private models are included, subject to the
 * `models:read` scope.
 */
export const Route = createFileRoute("/api/public/v1/models")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const columns =
          "id, slug, name, tagline, asset_class, strategy_type, timeframe, risk_level, status, visibility, pricing_model, price, currency, sharpe, max_drawdown, win_rate, cagr, team_id, listed_at";

        const auth = request.headers.get("authorization") ?? "";
        const raw = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";

        let teamId: string | null = null;
        if (raw) {
          if (!raw.startsWith("afk_")) {
            return Response.json({ error: "invalid_token" }, { status: 401 });
          }
          const { data: token } = await supabaseAdmin
            .from("team_api_tokens")
            .select("id, team_id, scopes, revoked_at, expires_at")
            .eq("token_hash", await hashToken(raw))
            .maybeSingle();
          if (!token || token.revoked_at || (token.expires_at && new Date(token.expires_at) < new Date())) {
            return Response.json({ error: "invalid_token" }, { status: 401 });
          }
          if (!token.scopes.includes("models:read")) {
            return Response.json({ error: "insufficient_scope", required: "models:read" }, { status: 403 });
          }
          teamId = token.team_id;
          await supabaseAdmin
            .from("team_api_tokens")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", token.id);
        }

        const publicQuery = supabaseAdmin
          .from("ai_models")
          .select(columns)
          .eq("status", "live")
          .eq("visibility", "public")
          .order("active_users", { ascending: false })
          .limit(200);

        const teamQuery = teamId
          ? supabaseAdmin.from("ai_models").select(columns).eq("team_id", teamId).limit(200)
          : null;

        const [listed, owned] = await Promise.all([publicQuery, teamQuery ?? Promise.resolve({ data: [] as never[] })]);
        const byId = new Map<string, Record<string, unknown>>();
        for (const m of [...(listed.data ?? []), ...((owned.data ?? []) as typeof listed.data ?? [])] as {
          id: string;
        }[]) {
          byId.set(m.id, m as unknown as Record<string, unknown>);
        }

        const teamIds = [...new Set([...byId.values()].map((m) => m["team_id"]).filter(Boolean))] as string[];
        const { data: teams } = teamIds.length
          ? await supabaseAdmin.from("teams").select("id, slug, name").in("id", teamIds)
          : { data: [] };
        const teamBySlug = new Map((teams ?? []).map((t) => [t.id, t]));

        const models = [...byId.values()].map((m) => {
          const team = m["team_id"] ? teamBySlug.get(m["team_id"] as string) : null;
          return { ...m, namespace: team ? `${team.slug}/${m["slug"]}` : m["slug"], team: team ?? null };
        });

        return Response.json(
          { api_version: "v1", authenticated: Boolean(teamId), count: models.length, models },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
