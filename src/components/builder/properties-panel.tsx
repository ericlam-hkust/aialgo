import { AlertTriangle, CheckCircle2, Info, Trash2 } from "lucide-react";
import { LANE_LABEL, specFor, type GraphIssues, type StrategyLane, type StrategyNode } from "@/lib/strategy-graph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
  node: StrategyNode | null;
  issues: GraphIssues;
  name: string;
  description: string;
  onName: (v: string) => void;
  onDescription: (v: string) => void;
  onParam: (key: string, value: string) => void;
  onLane: (lane: StrategyLane) => void;
  onDelete: () => void;
};

export function PropertiesPanel({
  node,
  issues,
  name,
  description,
  onName,
  onDescription,
  onParam,
  onLane,
  onDelete,
}: Props) {
  const spec = node ? specFor(node) : undefined;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-3">
        {node ? (
          <div className="space-y-3">
            <div>
              <Badge variant="secondary" className="capitalize">
                {node.type}
              </Badge>
              <h3 className="mt-2 text-sm font-semibold">{node.data.label}</h3>
              {spec ? <p className="text-xs text-muted-foreground">{spec.description}</p> : null}
            </div>

            {node.type !== "risk" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Rule set</Label>
                <Select value={node.lane ?? "entry"} onValueChange={(v) => onLane(v as StrategyLane)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">{LANE_LABEL.entry}</SelectItem>
                    <SelectItem value="exit">{LANE_LABEL.exit}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {Object.entries(node.data.params ?? {}).length === 0 ? (
              <p className="text-xs text-muted-foreground">This block has no parameters to tune.</p>
            ) : (
              Object.entries(node.data.params).map(([key, value]) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`p-${key}`} className="text-xs capitalize">
                    {key.replace(/_/g, " ")}
                  </Label>
                  <Input
                    id={`p-${key}`}
                    value={String(value)}
                    onChange={(e) => onParam(key, e.target.value)}
                    className="h-8"
                  />
                </div>
              ))
            )}

            <Button variant="outline" size="sm" className="w-full" onClick={onDelete}>
              <Trash2 className="mr-1 h-3.5 w-3.5 text-loss" aria-hidden /> Delete block
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="strategy-name-field" className="text-xs">
                Strategy name
              </Label>
              <Input
                id="strategy-name-field"
                value={name}
                onChange={(e) => onName(e.target.value)}
                className="h-8"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="strategy-desc" className="text-xs">
                Description
              </Label>
              <Textarea
                id="strategy-desc"
                rows={4}
                value={description}
                onChange={(e) => onDescription(e.target.value)}
                placeholder="What edge does this strategy capture?"
                className="text-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Select a block on the canvas to edit its parameters.
            </p>
          </div>
        )}

        <div className="space-y-2 border-t border-border pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checks</h4>
          {!issues.errors.length && !issues.warnings.length ? (
            <p className="flex items-start gap-1.5 text-xs text-profit">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> Strategy looks ready to backtest.
            </p>
          ) : null}
          {issues.errors.map((e) => (
            <p key={e} className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {e}
            </p>
          ))}
          {issues.warnings.map((w) => (
            <p key={w} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {w}
            </p>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
