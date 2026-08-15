import { computeAutoPrice } from "@/lib/pricing-suggestion";

/** Rough keyword sentiment used when the AI gateway is unavailable. */
function heuristicSentiment(text: string): number {
  const t = text.toLowerCase();
  const pos = ["great", "excellent", "profitable", "solid", "love", "consistent", "recommend", "impressive", "works", "good"];
  const neg = ["bad", "loss", "losing", "scam", "overfit", "terrible", "useless", "drawdown", "poor", "avoid"];
  let s = 0;
  for (const w of pos) if (t.includes(w)) s += 1;
  for (const w of neg) if (t.includes(w)) s -= 1;
  return Math.max(-1, Math.min(1, s / 3));
}

/** Scores a comment -1..1 via the Lovable AI gateway, falling back to keywords. */
export async function scoreSentiment(body: string): Promise<{ score: number; label: string }> {
  const key = process.env["LOVABLE_API_KEY"];
  let score = heuristicSentiment(body);
  if (key) {
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content:
                "You score sentiment of a trading-strategy review. Reply with ONLY a number between -1 (very negative) and 1 (very positive).",
            },
            { role: "user", content: body.slice(0, 1000) },
          ],
        }),
      });
      if (res.ok) {
        const json: any = await res.json();
        const raw = Number(String(json?.choices?.[0]?.message?.content ?? "").trim().match(/-?\d+(\.\d+)?/)?.[0]);
        if (Number.isFinite(raw)) score = Math.max(-1, Math.min(1, raw));
      }
    } catch (e) {
      console.error("sentiment scoring failed", e);
    }
  }
  const label = score > 0.2 ? "positive" : score < -0.2 ? "negative" : "neutral";
  return { score: Math.round(score * 100) / 100, label };
}

type AnyClient = { from: (t: string) => any };

/**
 * Recomputes like/comment aggregates on the listing and, when the builder
 * delegated pricing to the platform, reprices from the blended model.
 */
export async function refreshCommunityAndPrice(supabase: AnyClient, modelId: string) {
  const [{ data: likes }, { data: comments }, { data: model }] = await Promise.all([
    supabase.from("model_likes").select("verified_owner").eq("model_id", modelId),
    supabase.from("model_comments").select("sentiment_score").eq("model_id", modelId).eq("hidden", false),
    supabase
      .from("ai_models")
      .select(
        "id,price,currency,pricing_mode,sharpe,max_drawdown,win_rate,profit_factor,consistency_score,total_trades,overfitting_risk,cagr,rating,rating_count,active_users,executions,backtest_ran_at,live_since",
      )
      .eq("id", modelId)
      .maybeSingle(),
  ]);
  if (!model) return null;

  const likeRows = likes ?? [];
  const commentRows = comments ?? [];
  const verifiedLikes = likeRows.filter((l: any) => l.verified_owner).length;
  const sentimentAvg = commentRows.length
    ? commentRows.reduce((a: number, c: any) => a + Number(c.sentiment_score || 0), 0) / commentRows.length
    : 0;

  const auto = computeAutoPrice(
    {
      sharpe: Number(model.sharpe ?? 0),
      maxDrawdown: Number(model.max_drawdown ?? 0),
      winRate: Number(model.win_rate ?? 0),
      profitFactor: Number(model.profit_factor ?? 0),
      consistencyScore: Number(model.consistency_score ?? 0),
      trades: Number(model.total_trades ?? 0),
      overfittingRisk: Boolean(model.overfitting_risk),
      cagr: Number(model.cagr ?? 0),
    },
    {
      likes: likeRows.length,
      verifiedLikes,
      commentCount: commentRows.length,
      sentimentAvg,
      rating: Number(model.rating ?? 0),
      ratingCount: Number(model.rating_count ?? 0),
      activeUsers: Number(model.active_users ?? 0),
      executions: Number(model.executions ?? 0),
      backtestRanAt: model.backtest_ran_at,
      liveSince: model.live_since,
      overfittingRisk: Boolean(model.overfitting_risk),
    },
    { currentPrice: Number(model.price ?? 0), currency: model.currency ?? "HKD" },
  );

  const patch: Record<string, unknown> = {
    likes_count: likeRows.length,
    comments_count: commentRows.length,
    sentiment_avg: Math.round(sentimentAvg * 100) / 100,
    demand_score: auto.score,
  };

  const isAuto = model.pricing_mode === "platform";
  const previous = Number(model.price ?? 0);
  const changed = isAuto && auto.price !== previous;

  if (changed) {
    patch["price"] = auto.price;
    patch["suggested_price"] = auto.baseline;
    patch["pricing_score"] = auto.score;
    patch["price_set_at"] = new Date().toISOString();
    patch["price_source_note"] = auto.summary;
  }

  await supabase.from("ai_models").update(patch).eq("id", modelId);

  if (changed) {
    await supabase.from("model_price_history").insert({
      model_id: modelId,
      price: auto.price,
      previous_price: previous,
      mode: "platform",
      reason: auto.summary,
      factors: auto.groups,
    });
  }

  return { auto, changed, likes: likeRows.length, verifiedLikes, comments: commentRows.length, sentimentAvg };
}
