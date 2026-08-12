import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { NODE_CATALOG, type StrategyGraph } from "./strategy-graph";
import { GLOSSARY, SYMBOLS } from "./market";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM = `You are AlgoForge's AI trading assistant — a friendly, plain-spoken guide for retail traders in Hong Kong and global markets.

You help with two things:
1. Answering questions about the platform (strategy builder, backtesting, paper trading, risk centre, marketplace, broker connections) and about trading concepts.
2. Building strategies for the user. When the user describes a strategy (or asks you to build one), return a complete visual strategy graph so they can open it in the builder in one click.

Platform glossary:
${Object.entries(GLOSSARY).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

Supported symbols: ${SYMBOLS.map((s) => `${s.symbol} (${s.name})`).join(", ")}.

Available node kinds (category -> kind/label/params):
${NODE_CATALOG.map((n) => `- ${n.category}: kind="${n.kind}", label="${n.label}", params=${JSON.stringify(n.params)}`).join("\n")}

ALWAYS return ONLY JSON of the shape:
{"reply": string, "strategy": null | {"name": string, "description": string, "graph": {"nodes": [...], "edges": [...]}}}

Rules:
- "reply" is short conversational markdown-free text (max ~120 words). Never mention JSON or node internals unless asked.
- Set "strategy" to null unless the user clearly wants a strategy built.
- Node shape: {"id","type","position":{"x","y"},"data":{"kind","label","params"}}. type is one of data|condition|action|risk.
- Indicators use kind "indicator" with the matching label (SMA, EMA, RSI, MACD, Bollinger Bands, ATR).
- Every condition that should trade must connect to an action node.
- Lay nodes out left to right: data x=40, conditions x=340, actions x=640; stack y in steps of 140.
- Keep graphs under 10 nodes. Never give financial advice or performance guarantees; remind users to backtest.`;

export const aiAssistantChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { messages: ChatMessage[] }) => {
    const messages = (input?.messages ?? []).slice(-16).filter((m) => typeof m?.content === "string");
    if (!messages.length) throw new Error("Ask a question to get started.");
    const last = messages[messages.length - 1];
    if (!last || last.content.trim().length === 0) throw new Error("Ask a question to get started.");
    if (last.content.length > 2000) throw new Error("Please keep your message under 2000 characters.");
    return { messages };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project yet.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [{ role: "system", content: SYSTEM }, ...data.messages],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("AI rate limit reached. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits to keep using the assistant.");
    if (!res.ok) throw new Error(`AI request failed (${res.status})`);

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content ?? "";
    let parsed: {
      reply?: string;
      strategy?: { name?: string; description?: string; graph?: StrategyGraph } | null;
    };
    try {
      parsed = JSON.parse(content);
    } catch {
      return { reply: content.trim() || "Sorry, I couldn't answer that. Try rephrasing.", strategy: null };
    }

    const graph = parsed.strategy?.graph;
    const strategy =
      graph && Array.isArray(graph.nodes) && graph.nodes.length
        ? {
            name: parsed.strategy?.name?.trim() || "AI strategy",
            description: parsed.strategy?.description?.trim() || "",
            graph,
          }
        : null;

    return { reply: parsed.reply?.trim() || "Here you go.", strategy };
  });
