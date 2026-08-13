# Rebuild the Algo Builder

The builder is being rebuilt as a three-mode workspace with one shared strategy model: a visual canvas, an AI assistant, and a Python code view. All three edit the same strategy, so switching modes never loses work.

## 1. Entry and Exit become first-class

Today the canvas has no notion of entry vs exit — every action node floats loose. The new model splits a strategy into two rule sets:

- **Entry** — conditions that open a position, plus the order action and sizing.
- **Exit** — conditions that close it, plus stop loss, take profit and trailing stop.
- **Risk** — account-level guards (max position size, max daily loss, max drawdown) shared by both.

The canvas gets labelled swim-lanes for Entry and Exit so the layout is self-explanatory, and every strategy starts from a valid skeleton (price source → empty entry condition → buy, empty exit condition → sell) instead of a blank void.

## 2. Advanced canvas

A rebuilt canvas that actively helps rather than just hosting boxes:

- Drag from the palette onto the canvas (with click-to-add kept as a fallback), and drag from any node handle to an empty spot to get a suggested next node.
- Typed handles: data outputs only connect into condition inputs, conditions only into actions. Invalid drops are rejected with a reason instead of silently creating a broken edge.
- Richer nodes: inline parameter editing on the node itself, category colour coding, an indicator preview sparkline for data nodes, and a red outline on any node that is unconnected or misconfigured.
- Canvas tools: auto-layout, duplicate, delete, undo/redo, copy/paste, zoom-to-fit, and a live validation strip listing concrete problems ("Exit rule has no action attached").
- Lane-aware auto-placement so AI-generated and template graphs land tidily.

## 3. Obvious AI assist

AI moves out of the hidden dialog into a permanent right-hand assistant panel:

- Prompt box with example chips ("Buy when RSI drops below 30, sell at 10% profit", "Golden cross on 0700.HK with a 5% stop").
- Conversational follow-ups: the assistant remembers the current strategy and can amend it ("add a trailing stop", "make the exit tighter") rather than only regenerating from scratch.
- Every AI change is a **preview diff** — nodes it will add/change/remove are highlighted on the canvas with Apply / Discard, so nothing is overwritten without consent.
- The assistant explains the strategy in plain language and flags obvious risks (no stop loss, over-fitted parameters).

## 4. Python code view

A Code tab beside the canvas, always in sync:

- **Generated mode** — the visual strategy compiles live into readable Python (a `Strategy` class with `on_bar`, `should_enter`, `should_exit`) with a syntax-highlighted editor, copy and download.
- **Custom mode** — advanced users take over the code. On switching, the generated code is seeded as the starting point. Custom code is stored with the strategy and becomes the source of truth.
- Custom code is validated on save: the required class/function signature must be present, and the supported subset (indicators, comparisons, entry/exit actions, risk limits) is parsed back into the visual graph so the strategy can still be backtested by the existing engine.
- If the code uses constructs outside the supported subset, the editor says exactly which lines are unsupported and the strategy is marked "code-only" — it can be saved and published, but backtesting will report the unsupported parts rather than silently producing wrong numbers. There is no Python runtime on the server, so nothing is ever executed as real Python.

## 5. Page layout

```text
┌──────────────────────────────────────────────────────────┐
│ Name · Entry/Exit summary · Validate · Backtest · Save   │
├─────────┬───────────────────────────────┬────────────────┤
│ Palette │  [ Canvas | Code ]            │  AI Assistant  │
│ + search│  Entry lane                   │  chat + diff   │
│         │  ───────────────              │  preview       │
│         │  Exit lane                    │                │
│         │  Risk bar                     │  Properties    │
└─────────┴───────────────────────────────┴────────────────┘
```

Panels collapse; on smaller screens the three surfaces become tabs. Full EN / 繁體 / 简体 strings for all new copy.

## Technical notes

- `src/lib/strategy-graph.ts` — add a `lane` field (`entry` | `exit` | `risk` | `shared`) to nodes, handle-type metadata to `NODE_CATALOG`, and graph validation helpers.
- `src/lib/strategy-codegen.ts` (new) — graph → Python source, and a parser for the supported Python subset → graph.
- `src/routes/_authenticated/dashboard.strategies.builder.tsx` — rebuilt page shell, split into `src/components/builder/*` (canvas, palette, properties, ai-panel, code-panel).
- `src/components/builder/strategy-node.tsx` — inline editing, typed handles, lane styling, error state.
- `src/lib/ai.functions.ts` — extend the server fn to accept the current graph plus a message history and return a patch (add/update/remove nodes) with an explanation, keeping the existing quota checks.
- Persistence: store `code`, `code_mode` and the lane-aware graph on the existing `strategies` row (a small migration adds the two columns); the backtest engine keeps reading `graph` unchanged.
