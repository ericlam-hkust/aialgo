import { useCallback, useEffect, useMemo, useState } from "react";
import { handleActionError } from "@/lib/upgrade-events";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { BrainCircuit, LineChart, Loader2, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { aiStrategyAssist } from "@/lib/ai.functions";
import {
  CATEGORY_LABEL,
  NODE_CATALOG,
  isStrategyGraph,
  type NodeCategory,
  type StrategyGraph,
} from "@/lib/strategy-graph";
import { StrategyFlowNode, type FlowNodeData } from "@/components/builder/strategy-node";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/dashboard/strategies/builder")({
  validateSearch: (search: Record<string, unknown>): { id?: string } =>
    typeof search["id"] === "string" ? { id: search["id"] } : {},
  component: () => (
    <ReactFlowProvider>
      <Builder />
    </ReactFlowProvider>
  ),
});

const nodeTypes = { strategy: StrategyFlowNode };

let idCounter = 0;
const nextId = () => `n${Date.now().toString(36)}${(idCounter++).toString(36)}`;

function toFlow(graph: StrategyGraph): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      type: "strategy",
      position: n.position,
      data: { ...n.data, category: n.type } as unknown as Record<string, unknown>,
    })),
    edges: graph.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, animated: true })),
  };
}

function fromFlow(nodes: Node[], edges: Edge[]): StrategyGraph {
  return {
    nodes: nodes.map((n) => {
      const d = n.data as unknown as FlowNodeData;
      return {
        id: n.id,
        type: d.category,
        position: n.position,
        data: { kind: d.kind, label: d.label, params: d.params },
      };
    }),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  };
}

function Builder() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const callAi = useServerFn(aiStrategyAssist);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("Untitled strategy");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [strategyId, setStrategyId] = useState<string | null>(id ?? null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void (async () => {
      const { data, error } = await supabase.from("strategies").select("*").eq("id", id).single();
      if (!active) return;
      if (error) {
        toast.error("Could not load that strategy");
        return;
      }
      setName(data.name);
      setDescription(data.description ?? "");
      setStrategyId(data.id);
      if (isStrategyGraph(data.graph)) {
        const flow = toFlow(data.graph as unknown as StrategyGraph);
        setNodes(flow.nodes);
        setEdges(flow.edges);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

  const addNode = (kind: string, label: string, category: NodeCategory, params: Record<string, number | string>) => {
    const node: Node = {
      id: nextId(),
      type: "strategy",
      position: {
        x: category === "data" ? 60 : category === "condition" ? 360 : 660,
        y: 60 + nodes.length * 40,
      },
      data: { kind, label, category, params: { ...params } } as unknown as Record<string, unknown>,
    };
    setNodes((ns) => [...ns, node]);
  };

  const selected = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId]);
  const selectedData = selected ? (selected.data as unknown as FlowNodeData) : null;

  const updateParam = (key: string, value: string) => {
    setNodes((ns) =>
      ns.map((n) => {
        if (n.id !== selectedId) return n;
        const d = n.data as unknown as FlowNodeData;
        const original = d.params[key];
        const parsed = typeof original === "number" ? (Number(value) || 0) : value;
        return { ...n, data: { ...d, params: { ...d.params, [key]: parsed } } as unknown as Record<string, unknown> };
      }),
    );
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setNodes((ns) => ns.filter((n) => n.id !== selectedId));
    setEdges((es) => es.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
  };

  const validate = (): string | null => {
    const graph = fromFlow(nodes, edges);
    if (graph.nodes.length === 0) return "Add at least one node before saving.";
    if (!graph.nodes.some((n) => n.type === "action")) return "Add an action node so the strategy can trade.";
    if (graph.edges.length === 0) return "Connect your nodes so signals can flow.";
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    const graph = fromFlow(nodes, edges) as unknown as never;
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      user_id: userData.user?.id ?? "",
      name: name.trim() || "Untitled strategy",
      description: description.trim() || null,
      category: "custom",
      graph,
      is_template: false,
    };

    if (strategyId) {
      const { error } = await supabase
        .from("strategies")
        .update({ name: payload.name, description: payload.description, graph })
        .eq("id", strategyId);
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Strategy saved");
    } else {
      const { data, error } = await supabase.from("strategies").insert(payload).select("id").single();
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setStrategyId(data.id);
      toast.success("Strategy created");
      navigate({ to: "/dashboard/strategies/builder", search: { id: data.id }, replace: true });
    }
  };

  const runAi = async () => {
    setAiBusy(true);
    try {
      const result = await callAi({ data: { prompt } });
      const flow = toFlow(result.graph as StrategyGraph);
      setNodes(flow.nodes);
      setEdges(flow.edges);
      setAiOpen(false);
      setPrompt("");
      toast.success("Strategy drafted", { description: result.explanation });
    } catch (e) {
      handleActionError(e, "AI assist failed");
    } finally {
      setAiBusy(false);
    }
  };

  const grouped = useMemo(() => {
    const map: Record<NodeCategory, typeof NODE_CATALOG> = { data: [], condition: [], action: [], risk: [] };
    for (const spec of NODE_CATALOG) map[spec.category].push(spec);
    return map;
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-56 flex-1">
          <Label htmlFor="strategy-name" className="sr-only">
            Strategy name
          </Label>
          <Input
            id="strategy-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 max-w-sm text-base font-semibold"
            maxLength={80}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setAiOpen(true)}>
            <BrainCircuit className="mr-1 h-4 w-4" aria-hidden /> AI assist
          </Button>
          <Button
            variant="outline"
            disabled={!strategyId}
            onClick={() =>
              strategyId
                ? navigate({ to: "/dashboard/strategies/backtest", search: { id: strategyId } })
                : undefined
            }
          >
            <LineChart className="mr-1 h-4 w-4" aria-hidden /> Backtest
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="mr-1 h-4 w-4" aria-hidden />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr_260px]">
        <Card className="order-1 h-[600px] overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Node palette</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[520px] px-3 pb-4">
              <Accordion type="multiple" defaultValue={["data", "condition", "action"]}>
                {(Object.keys(grouped) as NodeCategory[]).map((cat) => (
                  <AccordionItem key={cat} value={cat}>
                    <AccordionTrigger className="text-xs font-semibold uppercase">
                      {CATEGORY_LABEL[cat]}
                    </AccordionTrigger>
                    <AccordionContent className="space-y-1.5">
                      {grouped[cat].map((spec) => (
                        <button
                          key={`${spec.kind}-${spec.label}`}
                          type="button"
                          onClick={() => addNode(spec.kind, spec.label, spec.category, spec.params)}
                          title={spec.description}
                          className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-left text-xs transition-colors hover:border-primary/50 hover:bg-muted/60"
                        >
                          {spec.label}
                        </button>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="order-3 h-[600px] overflow-hidden rounded-xl border border-border bg-card/40 lg:order-2">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--color-border)" />
            <Controls className="!bg-card !text-foreground" />
            <MiniMap
              pannable
              zoomable
              className="!bg-card"
              maskColor="color-mix(in oklch, var(--color-background) 70%, transparent)"
            />
          </ReactFlow>
        </div>

        <Card className="order-2 h-[600px] overflow-hidden lg:order-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[520px] pr-2">
              {selectedData ? (
                <div className="space-y-4">
                  <div>
                    <Badge variant="secondary" className="capitalize">
                      {selectedData.category}
                    </Badge>
                    <h3 className="mt-2 text-sm font-semibold">{selectedData.label}</h3>
                  </div>
                  {Object.entries(selectedData.params ?? {}).length === 0 ? (
                    <p className="text-xs text-muted-foreground">This node has no parameters to tune.</p>
                  ) : (
                    Object.entries(selectedData.params).map(([key, value]) => (
                      <div key={key} className="space-y-1.5">
                        <Label htmlFor={`p-${key}`} className="text-xs capitalize">
                          {key.replace(/_/g, " ")}
                        </Label>
                        <Input
                          id={`p-${key}`}
                          value={String(value)}
                          onChange={(e) => updateParam(key, e.target.value)}
                          className="h-8"
                        />
                      </div>
                    ))
                  )}
                  <Button variant="outline" size="sm" className="w-full" onClick={deleteSelected}>
                    <Trash2 className="mr-1 h-3.5 w-3.5 text-loss" aria-hidden /> Delete node
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Select a node on the canvas to edit its parameters, or add one from the palette.
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="desc" className="text-xs">
                      Strategy description
                    </Label>
                    <Textarea
                      id="desc"
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What market conditions is this built for?"
                      maxLength={500}
                    />
                  </div>
                  <div className="rounded-md border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Graph summary</p>
                    <p className="mt-1">
                      {nodes.length} node{nodes.length === 1 ? "" : "s"} · {edges.length} connection
                      {edges.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI strategy assist</DialogTitle>
            <DialogDescription>
              Describe your idea in plain English and we will draft the node graph for you.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={1200}
            placeholder="Buy Tencent when the 50-day SMA crosses above the 200-day and RSI is below 70, with a 5% stop loss."
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAiOpen(false)}>
              Cancel
            </Button>
            <Button onClick={runAi} disabled={aiBusy || prompt.trim().length < 8}>
              {aiBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : null}
              Generate graph
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
