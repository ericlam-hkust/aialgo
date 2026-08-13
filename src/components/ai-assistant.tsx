import { useEffect, useRef, useState } from "react";
import { handleActionError } from "@/lib/upgrade-events";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, Send, Sparkles, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { aiAssistantChat } from "@/lib/assistant.functions";
import type { StrategyGraph } from "@/lib/strategy-graph";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Suggestion = { name: string; description: string; graph: StrategyGraph };

type Msg = {
  role: "user" | "assistant";
  content: string;
  strategy?: Suggestion | null;
};

const STARTERS = [
  "How do I backtest a strategy?",
  "Build me an RSI mean-reversion strategy for 0700.HK",
  "What is max drawdown and why does it matter?",
  "Set up a moving average crossover on AAPL",
];

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hi, I'm your aiAlgo trading assistant. Ask me anything about strategies, backtesting or risk — or describe a strategy in plain English and I'll build it for you.",
};

export function AiAssistant() {
  const navigate = useNavigate();
  const chat = useServerFn(aiAssistantChat);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await chat({
        data: { messages: next.filter((m) => m !== GREETING).map((m) => ({ role: m.role, content: m.content })) },
      });
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply, strategy: res.strategy as Suggestion | null }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "The assistant is unavailable right now.";
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setBusy(false);
    }
  }

  async function openInBuilder(strategy: Suggestion) {
    setCreating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("strategies")
        .insert({
          user_id: userData.user?.id ?? "",
          name: strategy.name,
          description: strategy.description,
          category: "custom",
          graph: strategy.graph as never,
          is_template: false,
          is_public: false,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      toast.success("Strategy created — opening the builder");
      setOpen(false);
      void navigate({ to: "/dashboard/strategies/builder", search: { id: data.id } });
    } catch (e) {
      handleActionError(e, "Could not create the strategy");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          size="lg"
          className="fixed bottom-16 right-4 z-50 gap-2 rounded-full shadow-lg md:bottom-16 md:right-6"
        >
          <Sparkles className="size-4" />
          AI Assistant
        </Button>
      )}

      {open && (
        <div className="fixed bottom-4 right-4 z-50 flex h-[min(620px,80vh)] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Bot className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">AI Trading Assistant</p>
              <p className="text-xs text-muted-foreground">Guidance + builds strategies for you</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close assistant">
              <X className="size-4" />
            </Button>
          </header>

          <ScrollArea className="flex-1">
            <div className="space-y-3 p-4">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                    )}
                  >
                    {m.content}
                    {m.strategy && (
                      <div className="mt-3 rounded-md border border-border bg-card p-3">
                        <p className="text-sm font-medium">{m.strategy.name}</p>
                        {m.strategy.description && (
                          <p className="mt-1 text-xs text-muted-foreground">{m.strategy.description}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {m.strategy.graph.nodes.length} blocks · {m.strategy.graph.edges?.length ?? 0} connections
                        </p>
                        <Button
                          size="sm"
                          className="mt-2 w-full gap-2"
                          disabled={creating}
                          onClick={() => void openInBuilder(m.strategy as Suggestion)}
                        >
                          {creating ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                          Build it in the editor
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {messages.length === 1 && (
                <div className="space-y-2 pt-1">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="w-full rounded-md border border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {busy && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Thinking…
                </div>
              )}
              <div ref={endRef} />
            </div>
          </ScrollArea>

          <form
            className="flex items-end gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Ask a question or describe a strategy…"
              rows={2}
              className="min-h-[44px] resize-none"
            />
            <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send message">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
