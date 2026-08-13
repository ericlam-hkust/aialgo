import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertQuota, incrementUsage } from "./entitlements.server";
import { NODE_CATALOG, type StrategyGraph } from "./strategy-graph";

type ChatTurn = { role: "user" | "assistant"; content: string };

const SYSTEM = `You are aiAlgo's algo strategy compiler. You turn a retail trader's plain English into a visual strategy graph made of entry rules, exit rules and risk guards.

Available nodes (category -> kind / label / default params):
${NODE_CATALOG.map((n) => `- ${n.category}: kind="${n.kind}", label="${n.label}", params=${JSON.stringify(n.params)}`).join("\n")}

Return ONLY JSON: {"explanation": string, "notes": string[], "graph": {"nodes": [...], "edges": [...]}}

Node shape: {"id","type","lane","position":{"x","y"},"data":{"kind","label","params"}}
- "type" is one of data|condition|action|risk.
- "lane" is one of entry|exit|risk and MUST match the rule the node belongs to.
- Indicators use kind "indicator" with label SMA, EMA, RSI, MACD, Bollinger Bands or ATR.
- Comparison conditions take one data input plus params.value, or two data inputs.
- Cross Above / Cross Below take exactly two data inputs (first crosses the second).
- and/or/not take condition inputs only.
- Every entry lane needs a buy action; every exit lane should have a sell/close, stop loss or take profit.
- Layout: data x=40, conditions x=380, actions x=720. Entry lane y 48-300, exit lane y 388-640, risk lane y 728.
- Keep it under 12 nodes. Never promise returns; "explanation" is 1-3 short sentences.
- "notes" are optional short caveats (e.g. "Add a stop loss before going live").

If the user asks to MODIFY the current strategy (provided as JSON), return the FULL updated graph, keeping ids of nodes you did not change.`;

export const aiStrategyAssist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt: string; graph?: StrategyGraph | null; history?: ChatTurn[] }) => {
    const prompt = (input?.prompt ?? "").trim();
    if (prompt.length < 4) throw new Error("Describe your strategy in a bit more detail.");
    if (prompt.length > 1500) throw new Error("Please keep the description under 1500 characters.");
    const history = (input?.history ?? []).slice(-8).filter((m) => typeof m?.content === "string");
    const graph = input?.graph && Array.isArray(input.graph.nodes) ? input.graph : null;
    return { prompt, history, graph };
  })
  .handler(async ({ data, context }) => {
    await assertQuota(context.supabase, context.userId, "ai");
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project yet.");

    const context_msg = data.graph?.nodes.length
      ? `Current strategy on the canvas:\n${JSON.stringify(data.graph).slice(0, 6000)}`
      : "The canvas is currently empty.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "system", content: context_msg },
          ...data.history,
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
    let parsed: { explanation?: string; notes?: string[]; graph?: StrategyGraph };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("The AI returned an unexpected response. Try rephrasing your strategy.");
    }
    if (!parsed.graph?.nodes?.length) throw new Error("The AI could not build a graph from that description.");

    await incrementUsage(context.userId, "ai_calls");

    return {
      explanation: parsed.explanation ?? "Suggested strategy graph.",
      notes: Array.isArray(parsed.notes) ? parsed.notes.slice(0, 4).map(String) : [],
      graph: parsed.graph,
    };
  });
