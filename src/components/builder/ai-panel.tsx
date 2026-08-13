import { useRef, useState, type FormEvent } from "react";
import { Check, Loader2, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { GraphDiff } from "@/lib/strategy-graph";

export type AiTurn = { role: "user" | "assistant"; content: string; notes?: string[] };

const QUICK_PROMPTS = [
  "Golden cross: buy when SMA 50 crosses above SMA 200, exit on the cross back down",
  "RSI mean reversion on 0700.HK with a 5% stop loss",
  "Breakout above the upper Bollinger band with a trailing stop",
  "Add a 3% max daily loss guard to my strategy",
];

type Props = {
  turns: AiTurn[];
  busy: boolean;
  pending: { explanation: string; diff: GraphDiff } | null;
  onSend: (prompt: string) => void;
  onApply: () => void;
  onDiscard: () => void;
};

export function AiPanel({ turns, busy, pending, onSend, onApply, onDiscard }: Props) {
  const [value, setValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const prompt = value.trim();
    if (!prompt || busy) return;
    onSend(prompt);
    setValue("");
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 9e6 }));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold">AI strategy assist</h3>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          Natural language
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div ref={scrollRef}>
        <div className="space-y-3 p-3">
          {!turns.length ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Describe your idea in plain English — the assistant builds the entry, exit and risk blocks on the
                canvas for you. You review the changes before they are applied.
              </p>
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onSend(p)}
                  className="w-full rounded-md border border-border bg-card px-2.5 py-2 text-left text-xs transition-colors hover:border-primary/50 hover:bg-muted/60"
                >
                  {p}
                </button>
              ))}
            </div>
          ) : null}

          {turns.map((t, i) => (
            <div
              key={i}
              className={
                t.role === "user"
                  ? "ml-6 rounded-lg bg-primary/10 px-2.5 py-2 text-xs"
                  : "mr-2 rounded-lg border border-border bg-card px-2.5 py-2 text-xs"
              }
            >
              <p className="whitespace-pre-wrap">{t.content}</p>
              {t.notes?.length ? (
                <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                  {t.notes.map((n) => (
                    <li key={n}>• {n}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}

          {busy ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Drafting your strategy…
            </p>
          ) : null}

          {pending ? (
            <div className="rounded-lg border border-primary/50 bg-primary/5 p-2.5">
              <p className="text-xs font-medium">Preview ready</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {pending.diff.added.length} added · {pending.diff.changed.length} changed ·{" "}
                {pending.diff.removed.length} removed
              </p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" className="h-7 flex-1 text-xs" onClick={onApply}>
                  <Check className="mr-1 h-3.5 w-3.5" aria-hidden /> Apply changes
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onDiscard}>
                  <X className="mr-1 h-3.5 w-3.5" aria-hidden /> Discard
                </Button>
              </div>
            </div>
          ) : null}
        </div>
        </div>
      </ScrollArea>

      <form onSubmit={submit} className="space-y-2 border-t border-border p-3">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
          }}
          rows={3}
          placeholder="e.g. Buy when RSI drops below 30 and exit at +8% or -4%"
          className="resize-none text-xs"
        />
        <Button type="submit" size="sm" className="w-full" disabled={busy || !value.trim()}>
          {busy ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Send className="mr-1 h-3.5 w-3.5" aria-hidden />
          )}
          Build with AI
        </Button>
      </form>
    </div>
  );
}
