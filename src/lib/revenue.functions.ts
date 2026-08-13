import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only platform economics: revenue by stream, margin, and MRR trend. */
export const getPlatformRevenue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data?: { days?: number }) => ({ days: Math.min(365, Math.max(30, data?.days ?? 180)) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin access required");

    const since = new Date(Date.now() - data.days * 86_400_000).toISOString().slice(0, 10);
    const { data: rows } = await supabase
      .from("platform_revenue_events")
      .select("category,subcategory,amount,cost,occurred_on")
      .gte("occurred_on", since)
      .order("occurred_on");

    const events = rows ?? [];
    const byCategory = new Map<string, { revenue: number; cost: number }>();
    const byMonth = new Map<string, { month: string; revenue: number; cost: number; margin: number }>();

    for (const e of events) {
      const amount = Number(e.amount ?? 0);
      const cost = Number(e.cost ?? 0);
      const cat = byCategory.get(e.category) ?? { revenue: 0, cost: 0 };
      cat.revenue += amount;
      cat.cost += cost;
      byCategory.set(e.category, cat);

      const month = String(e.occurred_on).slice(0, 7);
      const m = byMonth.get(month) ?? { month, revenue: 0, cost: 0, margin: 0 };
      m.revenue += amount;
      m.cost += cost;
      m.margin = m.revenue - m.cost;
      byMonth.set(month, m);
    }

    const totals = [...byCategory.entries()]
      .map(([category, v]) => ({
        category,
        revenue: Math.round(v.revenue * 100) / 100,
        cost: Math.round(v.cost * 100) / 100,
        margin: Math.round((v.revenue - v.cost) * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const trend = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
    const revenue = totals.reduce((s, t) => s + t.revenue, 0);
    const cost = totals.reduce((s, t) => s + t.cost, 0);
    const last = trend.at(-1);

    return {
      totals,
      trend,
      revenue: Math.round(revenue * 100) / 100,
      cost: Math.round(cost * 100) / 100,
      margin: Math.round((revenue - cost) * 100) / 100,
      mrr: Math.round((last?.revenue ?? 0) * 100) / 100,
      days: data.days,
    };
  });
