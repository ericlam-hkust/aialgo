import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  CATEGORY_LABEL,
  NODE_CATALOG,
  type NodeCategory,
  type NodeSpec,
} from "@/lib/strategy-graph";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const ORDER: NodeCategory[] = ["data", "condition", "action", "risk"];

const DOT: Record<NodeCategory, string> = {
  data: "bg-chart-2",
  condition: "bg-chart-4",
  action: "bg-primary",
  risk: "bg-destructive",
};

export function NodePalette({ onAdd }: { onAdd: (spec: NodeSpec) => void }) {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map: Record<NodeCategory, NodeSpec[]> = { data: [], condition: [], action: [], risk: [] };
    for (const spec of NODE_CATALOG) {
      if (q && !`${spec.label} ${spec.description} ${spec.kind}`.toLowerCase().includes(q)) continue;
      map[spec.category].push(spec);
    }
    return map;
  }, [query]);

  const empty = ORDER.every((c) => grouped[c].length === 0);

  return (
    <div className="flex h-full flex-col">
      <div className="relative p-3">
        <Search className="pointer-events-none absolute left-5.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search blocks…"
          aria-label="Search blocks"
          className="h-8 pl-7 text-xs"
        />
      </div>
      <ScrollArea className="flex-1 px-3 pb-4">
        {empty ? <p className="px-1 py-6 text-xs text-muted-foreground">No blocks match “{query}”.</p> : null}
        {ORDER.map((cat) =>
          grouped[cat].length ? (
            <section key={cat} className="mb-4">
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span className={`h-1.5 w-1.5 rounded-full ${DOT[cat]}`} aria-hidden />
                {CATEGORY_LABEL[cat]}
              </h3>
              <div className="space-y-1">
                {grouped[cat].map((spec) => (
                  <button
                    key={`${spec.kind}-${spec.label}`}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/algoforge-node", `${spec.kind}::${spec.label}`);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => onAdd(spec)}
                    title={spec.description}
                    className="w-full cursor-grab rounded-md border border-border bg-card px-2.5 py-1.5 text-left transition-colors hover:border-primary/50 hover:bg-muted/60 active:cursor-grabbing"
                  >
                    <span className="block text-xs font-medium">{spec.label}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">{spec.description}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null,
        )}
      </ScrollArea>
    </div>
  );
}
