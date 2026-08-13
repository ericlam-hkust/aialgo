import { useMemo } from "react";
import { AlertTriangle, Code2, Copy, Download, RefreshCw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = {
  code: string;
  mode: "generated" | "custom";
  error: { message: string; line: number } | null;
  onChange: (code: string) => void;
  onSync: () => void;
  onRegenerate: () => void;
};

export function CodePanel({ code, mode, error, onChange, onSync, onRegenerate }: Props) {
  const lineCount = useMemo(() => code.split("\n").length, [code]);

  const download = () => {
    const blob = new Blob([code], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "strategy.py";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <Code2 className="h-4 w-4 text-chart-2" aria-hidden />
        <span className="text-sm font-semibold">strategy.py</span>
        <Badge variant={mode === "custom" ? "default" : "secondary"} className="text-[10px]">
          {mode === "custom" ? "Custom code" : "Auto-generated"}
        </Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onSync}>
            <Wand2 className="mr-1 h-3.5 w-3.5" aria-hidden /> Sync to canvas
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onRegenerate}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" aria-hidden /> Rebuild from canvas
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => {
              void navigator.clipboard.writeText(code);
              toast.success("Code copied");
            }}
          >
            <Copy className="mr-1 h-3.5 w-3.5" aria-hidden /> Copy
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={download}>
            <Download className="mr-1 h-3.5 w-3.5" aria-hidden /> .py
          </Button>
        </div>
      </div>

      {error ? (
        <p className="flex items-start gap-1.5 border-b border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Line {error.line}: {error.message} — the canvas keeps its current blocks until the code parses.
          </span>
        </p>
      ) : null}

      <div className="relative flex-1 overflow-hidden">
        <div
          aria-hidden
          className="mono pointer-events-none absolute left-0 top-0 h-full w-10 select-none overflow-hidden border-r border-border bg-muted/30 py-3 text-right text-[11px] leading-5 text-muted-foreground"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="pr-2">
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          aria-label="Strategy Python code"
          className="mono h-full w-full resize-none bg-transparent py-3 pl-12 pr-3 text-[12px] leading-5 text-foreground outline-none"
        />
      </div>

      <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
        Supported subset: <span className="mono">ta.sma/ema/rsi/macd/bbands/atr</span>,{" "}
        <span className="mono">bar.close/open/high/low/volume</span>,{" "}
        <span className="mono">crossed_above/crossed_below</span>, comparisons, <span className="mono">and/or/not</span>{" "}
        and the <span className="mono">risk</span> dict. Anything else stays as custom code and runs as written.
      </p>
    </div>
  );
}
