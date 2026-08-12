import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertQuota, incrementUsage } from "./entitlements.server";
import { NODE_CATALOG, type StrategyGraph } from "./strategy-graph";

const SYSTEM = `You are AlgoForge's strategy compiler. Convert a retail trader's plain-English description into a visual strategy graph.

Available node kinds (type -> kind/label):
${NODE_CATALOG.map((n) => `- ${n.category}: kind="${n.kind}", label="${n.label}", params=${JSON.stringify(n.params)}`).join("\n")}

Rules:
- Return ONLY JSON: {"explanation": string, "graph": {"nodes": [...], "edges": [...]}}.
- Node shape: {"id","type","position":{"x","y"},"data":{"kind","label","params"}}. type is one of data|condition|action|risk.
- Indicators use kind "indicator" with the matching label (SMA, EMA, RSI, MACD, Bollinger Bands, ATR).
- Condition nodes take one or two incoming data edges. Comparisons against a constant use params.value.
- Every condition that should trade must connect to an action node.
- Lay nodes out left to right: data x=40, conditions x=340, actions x=640; stack y in steps of 140.
- Keep it under 10 nodes.`;

export const aiStrategyAssist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt: string }) => {
    const prompt = (input?.prompt ?? "").trim();
    if (prompt.length < 8) throw new Error("Describe your strategy in a bit more detail.");
    if (prompt.length > 1200) throw new Error("Please keep the description under 1200 characters.");
    return { prompt };
  })
  .handler(async ({ data, context }) => {
    await assertQuota(context.supabase, context.userId, "ai");
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project yet.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: data.prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("AI rate limit reached. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue using AI Assist.");
    if (!res.ok) throw new Error(`AI request failed (${res.status})`);

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content ?? "";
    let parsed: { explanation?: string; graph?: StrategyGraph };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("The AI returned an unexpected response. Try rephrasing your strategy.");
    }
    if (!parsed.graph?.nodes?.length) throw new Error("The AI could not build a graph from that description.");

    await incrementUsage(context.userId, "ai_calls");

    return {
      explanation: parsed.explanation ?? "Suggested strategy graph.",
      graph: parsed.graph,
    };
  });
