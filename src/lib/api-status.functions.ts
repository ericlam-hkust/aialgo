import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const getApiStatus = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const [{ data: changelog }, { data: incidents }] = await Promise.all([
    supabase
      .from("api_changelog")
      .select("id, version, title, body, kind, breaking, deprecation_notice, sunset_on, released_at")
      .order("released_at", { ascending: false }),
    supabase
      .from("api_incidents")
      .select("id, title, component, impact, status, summary, started_at, resolved_at, uptime_pct")
      .order("started_at", { ascending: false })
      .limit(30),
  ]);

  const rows = incidents ?? [];
  const uptime = rows.length ? rows.reduce((a, r) => a + Number(r.uptime_pct), 0) / rows.length : 100;
  const open = rows.filter((r) => r.status !== "resolved");

  return {
    changelog: changelog ?? [],
    incidents: rows,
    uptime90: Number(uptime.toFixed(3)),
    operational: open.length === 0,
    openIncidents: open.length,
  };
});
