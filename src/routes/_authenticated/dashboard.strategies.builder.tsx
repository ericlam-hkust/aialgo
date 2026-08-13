import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  useReactFlow,
  ViewportPortal,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  Blocks,
  Code2,
  LayoutGrid,
  LineChart,
  Loader2,
  Redo2,
  Save,
  Sparkles,
  SlidersHorizontal,
  Undo2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { handleActionError } from "@/lib/upgrade-events";
import { aiStrategyAssist } from "@/lib/ai.functions";
import {
  autoLayout,
  diffGraphs,
  inferLanes,
  isStrategyGraph,
  LANE_BOUNDS,
  LANE_HINT,
  LANE_LABEL,
  laneOf,
  newNodeId,
  NODE_CATALOG,
  starterGraph,
  validateGraph,
  COLUMN_X,
  type NodeSpec,
  type StrategyGraph,
  type StrategyLane,
  type StrategyNode,
} from "@/lib/strategy-graph";
import { graphToPython, PythonParseError, pythonToGraph } from "@/lib/strategy-codegen";
import { StrategyFlowNode, type FlowNodeData } from "@/components/builder/strategy-node";
import { BuilderProvider } from "@/components/builder/builder-context";
import { NodePalette } from "@/components/builder/node-palette";
import { PropertiesPanel } from "@/components/builder/properties-panel";
import { AiPanel, type AiTurn } from "@/components/builder/ai-panel";
import { CodePanel } from "@/components/builder/code-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";


export const Route = createFileRoute("/_authenticated/dashboard/strategies/builder")({
  validateSearch: (search: Record<string, unknown>): { id?: string } =>
    typeof search["id"] === "string" ? { id: search["id"] } : {},
  head: () => ({
    meta: [
      { title: "Algo Builder · AlgoForge" },
      {
        name: "description",
        content:
          "Design entry, exit and risk rules on a visual canvas, draft them with AI, and edit the generated Python directly.",
      },
      { property: "og:title", content: "Algo Builder · AlgoForge" },
      {
        property: "og:description",
        content: "Visual, AI-assisted and code-level strategy building in one workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <ReactFlowProvider>
      <Builder />
    </ReactFlowProvider>
  ),
});

const nodeTypes = { strategy: StrategyFlowNode };

function toFlow(graph: StrategyGraph): { nodes: Node[]; edges: Edge[] } {
  const laned = inferLanes(graph);
  return {
    nodes: laned.nodes.map((n) => ({
      id: n.id,
      type: "strategy",
      position: n.position,
      data: { ...n.data, category: n.type, lane: laneOf(n) } as unknown as Record<string, unknown>,
    })),
    edges: laned.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, animated: true })),
  };
}

function fromFlow(nodes: Node[], edges: Edge[]): StrategyGraph {
  return {
    nodes: nodes.map((n) => {
      const d = n.data as unknown as FlowNodeData;
      return {
        id: n.id,
        type: d.category,
        lane: d.lane,
        position: n.position,
        data: { kind: d.kind, label: d.label, params: d.params },
      } satisfies StrategyNode;
    }),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  };
}

const laneFromY = (y: number): StrategyLane =>
  y < LANE_BOUNDS.exit.y ? "entry" : y < LANE_BOUNDS.risk.y ? "exit" : "risk";

function Builder() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const callAi = useServerFn(aiStrategyAssist);
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("Untitled strategy");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [strategyId, setStrategyId] = useState<string | null>(id ?? null);

  const [isWide, setIsWide] = useState(true);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1280px)");
    const apply = () => setIsWide(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  const [view, setView] = useState<"canvas" | "code">("canvas");
  const [sidePanel, setSidePanel] = useState<"ai" | "properties">("ai");

  const [code, setCode] = useState("");
  const [codeMode, setCodeMode] = useState<"generated" | "custom">("generated");
  const [codeError, setCodeError] = useState<{ message: string; line: number } | null>(null);

  const [aiTurns, setAiTurns] = useState<AiTurn[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [pending, setPending] = useState<{ graph: StrategyGraph; explanation: string; diff: ReturnType<typeof diffGraphs> } | null>(
    null,
  );

  const past = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const future = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [, setHistoryTick] = useState(0);

  const snapshot = useCallback(() => {
    past.current = [...past.current.slice(-40), { nodes, edges }];
    future.current = [];
    setHistoryTick((t) => t + 1);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current = [...future.current, { nodes, edges }];
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setHistoryTick((t) => t + 1);
  }, [nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current = [...past.current, { nodes, edges }];
    setNodes(next.nodes);
    setEdges(next.edges);
    setHistoryTick((t) => t + 1);
  }, [nodes, edges, setNodes, setEdges]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  /* ------------------------------- load / seed ------------------------------ */
  useEffect(() => {
    if (!id) {
      const flow = toFlow(starterGraph());
      setNodes(flow.nodes);
      setEdges(flow.edges);
      return;
    }
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
      const saved = data as unknown as { code?: string | null; code_mode?: string | null };
      if (saved.code && saved.code_mode === "custom") {
        setCode(saved.code);
        setCodeMode("custom");
      }
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

  const graph = useMemo(() => fromFlow(nodes, edges), [nodes, edges]);
  const issues = useMemo(() => validateGraph(graph), [graph]);

  /* --------------------------- graph -> python sync ------------------------- */
  useEffect(() => {
    if (codeMode !== "generated") return;
    setCode(graphToPython(graph, { name, description }));
    setCodeError(null);
  }, [graph, name, description, codeMode]);

  /* --------------------------------- canvas -------------------------------- */
  const onConnect = useCallback(
    (params: Connection) => {
      snapshot();
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges, snapshot],
  );

  const placeNode = useCallback(
    (spec: NodeSpec, position?: { x: number; y: number }, laneOverride?: StrategyLane) => {
      const lane = laneOverride ?? spec.lanes[0] ?? "entry";
      const count = nodes.filter((n) => (n.data as unknown as FlowNodeData).category === spec.category).length;
      const node: Node = {
        id: newNodeId(),
        type: "strategy",
        position: position ?? {
          x: COLUMN_X[spec.category],
          y: LANE_BOUNDS[lane].y + 48 + (count % 3) * 104,
        },
        data: {
          kind: spec.kind,
          label: spec.label,
          category: spec.category,
          lane: spec.category === "risk" ? "risk" : lane,
          params: { ...spec.params },
        } as unknown as Record<string, unknown>,
      };
      snapshot();
      setNodes((ns) => [...ns, node]);
      setSelectedId(node.id);
      setSidePanel("properties");
    },
    [nodes, setNodes, snapshot],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const payload = event.dataTransfer.getData("application/algoforge-node");
      if (!payload) return;
      const [kind, label] = payload.split("::");
      const found = NODE_CATALOG.find((s) => s.kind === kind && s.label === label);
      if (!found) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      placeNode(found, position, laneFromY(position.y));
    },
    [placeNode, screenToFlowPosition],
  );

  const selected = useMemo(() => graph.nodes.find((n) => n.id === selectedId) ?? null, [graph, selectedId]);

  const updateParam = useCallback(
    (nodeId: string, key: string, value: string) => {
      setNodes((ns) =>
        ns.map((n) => {
          if (n.id !== nodeId) return n;
          const d = n.data as unknown as FlowNodeData;
          const original = d.params[key];
          const parsed = typeof original === "number" ? Number(value) || 0 : value;
          return { ...n, data: { ...d, params: { ...d.params, [key]: parsed } } as unknown as Record<string, unknown> };
        }),
      );
    },
    [setNodes],
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      snapshot();
      setNodes((ns) => ns.filter((n) => n.id !== nodeId));
      setEdges((es) => es.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedId((cur) => (cur === nodeId ? null : cur));
    },
    [setNodes, setEdges, snapshot],
  );

  const setLane = useCallback(
    (nodeId: string, lane: StrategyLane) => {
      snapshot();
      setNodes((ns) =>
        ns.map((n) => {
          if (n.id !== nodeId) return n;
          const d = n.data as unknown as FlowNodeData;
          return {
            ...n,
            position: { x: n.position.x, y: LANE_BOUNDS[lane].y + 48 },
            data: { ...d, lane } as unknown as Record<string, unknown>,
          };
        }),
      );
    },
    [setNodes, snapshot],
  );

  const tidy = useCallback(() => {
    snapshot();
    const laid = autoLayout(fromFlow(nodes, edges));
    const flow = toFlow(laid);
    setNodes(flow.nodes);
    setEdges(flow.edges);
  }, [nodes, edges, setNodes, setEdges, snapshot]);

  /* ---------------------------------- AI ----------------------------------- */
  const sendPrompt = async (prompt: string) => {
    setAiTurns((t) => [...t, { role: "user", content: prompt }]);
    setAiBusy(true);
    try {
      const result = await callAi({
        data: {
          prompt,
          graph,
          history: aiTurns.slice(-6).map((t) => ({ role: t.role, content: t.content })),
        },
      });
      const next = autoLayout(inferLanes(result.graph as StrategyGraph));
      setAiTurns((t) => [...t, { role: "assistant", content: result.explanation, notes: result.notes }]);
      setPending({ graph: next, explanation: result.explanation, diff: diffGraphs(graph, next) });
    } catch (e) {
      handleActionError(e, "AI assist failed");
      setAiTurns((t) => [
        ...t,
        { role: "assistant", content: "I couldn't build that. Try describing the entry and exit rules separately." },
      ]);
    } finally {
      setAiBusy(false);
    }
  };

  const applyPending = () => {
    if (!pending) return;
    snapshot();
    const flow = toFlow(pending.graph);
    setNodes(flow.nodes);
    setEdges(flow.edges);
    setCodeMode("generated");
    setPending(null);
    setView("canvas");
    toast.success("AI changes applied");
  };

  /* --------------------------------- code ---------------------------------- */
  const onCodeChange = (value: string) => {
    setCode(value);
    setCodeMode("custom");
  };

  const syncCode = () => {
    try {
      const parsed = pythonToGraph(code);
      snapshot();
      const laid = autoLayout(inferLanes(parsed.graph));
      const flow = toFlow(laid);
      setNodes(flow.nodes);
      setEdges(flow.edges);
      setCodeMode("generated");
      setCodeError(null);
      setView("canvas");
      toast.success("Canvas updated from code", {
        description: parsed.warnings.length ? parsed.warnings.join(" ") : undefined,
      });
    } catch (e) {
      const err = e instanceof PythonParseError ? e : null;
      setCodeError({ message: err?.message ?? (e as Error).message, line: err?.line ?? 1 });
      toast.error("Code kept as custom", { description: "It couldn't be mapped back to blocks." });
    }
  };

  const regenerate = () => {
    setCodeMode("generated");
    setCode(graphToPython(graph, { name, description }));
    setCodeError(null);
    toast.success("Code rebuilt from the canvas");
  };

  /* --------------------------------- save ---------------------------------- */
  const save = async () => {
    if (issues.errors.length) {
      toast.error(issues.errors[0] as string);
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      user_id: userData.user?.id ?? "",
      name: name.trim() || "Untitled strategy",
      description: description.trim() || null,
      category: "custom",
      graph: graph as unknown as never,
      code,
      code_mode: codeMode,
      is_template: false,
    };

    if (strategyId) {
      const { error } = await supabase
        .from("strategies")
        .update({
          name: payload.name,
          description: payload.description,
          graph: payload.graph,
          code: payload.code,
          code_mode: payload.code_mode,
        })
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

  return (
    <BuilderProvider value={{ issues: issues.byNode, updateParam, removeNode }}>
      <div className="space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-56 flex-1">
            <Label htmlFor="strategy-name" className="sr-only">
              Strategy name
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="strategy-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 max-w-sm text-base font-semibold"
                maxLength={80}
              />
              {issues.errors.length ? (
                <Badge variant="destructive" className="text-[10px]">
                  {issues.errors.length} issue{issues.errors.length > 1 ? "s" : ""}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">
                  Ready
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as "canvas" | "code")}>
              <TabsList className="h-9">
                <TabsTrigger value="canvas" className="text-xs">
                  <Blocks className="mr-1 h-3.5 w-3.5" aria-hidden /> Canvas
                </TabsTrigger>
                <TabsTrigger value="code" className="text-xs">
                  <Code2 className="mr-1 h-3.5 w-3.5" aria-hidden /> Python
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={undo} aria-label="Undo" disabled={past.current.length === 0}>
              <Undo2 className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={redo} aria-label="Redo">
              <Redo2 className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={tidy}>
              <LayoutGrid className="mr-1 h-4 w-4" aria-hidden /> Tidy
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              disabled={!strategyId}
              onClick={() =>
                strategyId ? navigate({ to: "/dashboard/strategies/backtest", search: { id: strategyId } }) : undefined
              }
            >
              <LineChart className="mr-1 h-4 w-4" aria-hidden /> Backtest
            </Button>
            <Button size="sm" className="h-9" onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Save className="mr-1 h-4 w-4" aria-hidden />
              )}
              Save
            </Button>
          </div>
        </header>

        <ResizablePanelGroup
          key={isWide ? "wide" : "narrow"}
          orientation={isWide ? "horizontal" : "vertical"}
          style={{ height: isWide ? "min(72vh, 720px)" : 1180 }}
        >
          <ResizablePanel defaultSize={isWide ? "18%" : "22%"} minSize="10%" className="h-full overflow-hidden rounded-xl border border-border bg-card">
            <NodePalette onAdd={(spec) => placeNode(spec)} />
          </ResizablePanel>

          <ResizableHandle withHandle className={isWide ? "mx-1.5 w-px bg-border" : "my-1.5 h-px w-full bg-border"} />

          <ResizablePanel defaultSize={isWide ? "56%" : "48%"} minSize="20%" className="h-full overflow-hidden rounded-xl border border-border bg-card/40">


            {view === "canvas" ? (
              <div className="h-full" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeDragStop={() => {
                    setNodes((ns) =>
                      ns.map((n) => {
                        const d = n.data as unknown as FlowNodeData;
                        if (d.category === "risk") return n;
                        const lane = laneFromY(n.position.y);
                        return lane === d.lane
                          ? n
                          : { ...n, data: { ...d, lane } as unknown as Record<string, unknown> };
                      }),
                    );
                  }}
                  onNodeClick={(_, n) => {
                    setSelectedId(n.id);
                    setSidePanel("properties");
                  }}
                  onPaneClick={() => setSelectedId(null)}
                  nodeTypes={nodeTypes}
                  fitView
                  proOptions={{ hideAttribution: true }}
                >
                  <ViewportPortal>
                    {(Object.keys(LANE_BOUNDS) as StrategyLane[]).map((lane) => (
                      <div
                        key={lane}
                        style={{
                          position: "absolute",
                          transform: `translate(-24px, ${LANE_BOUNDS[lane].y - 26}px)`,
                          width: 1080,
                          height: LANE_BOUNDS[lane].height,
                        }}
                        className="pointer-events-none rounded-xl border border-dashed border-border/70 bg-muted/10"
                      >
                        <span className="absolute left-3 top-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {LANE_LABEL[lane]}
                          <span className="ml-2 font-normal normal-case opacity-70">{LANE_HINT[lane]}</span>
                        </span>
                      </div>
                    ))}
                  </ViewportPortal>
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
            ) : (
              <CodePanel
                code={code}
                mode={codeMode}
                error={codeError}
                onChange={onCodeChange}
                onSync={syncCode}
                onRegenerate={regenerate}
              />
            )}
          </ResizablePanel>

          <ResizableHandle withHandle className={isWide ? "mx-1.5 w-px bg-border" : "my-1.5 h-px w-full bg-border"} />

          <ResizablePanel defaultSize={isWide ? "26%" : "30%"} minSize="12%" className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">

            <Tabs value={sidePanel} onValueChange={(v) => setSidePanel(v as "ai" | "properties")} className="flex h-full flex-col">
              <TabsList className="m-2 grid grid-cols-2">
                <TabsTrigger value="ai" className="text-xs">
                  <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden /> AI assist
                </TabsTrigger>
                <TabsTrigger value="properties" className="text-xs">
                  <SlidersHorizontal className="mr-1 h-3.5 w-3.5" aria-hidden /> Properties
                </TabsTrigger>
              </TabsList>
              <div className="min-h-0 flex-1">
                {sidePanel === "ai" ? (
                  <AiPanel
                    turns={aiTurns}
                    busy={aiBusy}
                    pending={pending ? { explanation: pending.explanation, diff: pending.diff } : null}
                    onSend={(p) => void sendPrompt(p)}
                    onApply={applyPending}
                    onDiscard={() => setPending(null)}
                  />
                ) : (
                  <PropertiesPanel
                    node={selected}
                    issues={issues}
                    name={name}
                    description={description}
                    onName={setName}
                    onDescription={setDescription}
                    onParam={(key, value) => selectedId && updateParam(selectedId, key, value)}
                    onLane={(lane) => selectedId && setLane(selectedId, lane)}
                    onDelete={() => selectedId && removeNode(selectedId)}
                  />
                )}
              </div>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>

      </div>
    </BuilderProvider>
  );
}
