import { Bot, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type PricingMode = "builder" | "platform";

export function PricingSourceBadge({ mode, note }: { mode: PricingMode | null | undefined; note?: string | null }) {
  const isAuto = mode === "platform";
  const label = isAuto ? "Priced by aiAlgo" : "Priced by the builder";
  const help = isAuto
    ? note ||
      "This price is set automatically by aiAlgo from verified performance, community likes, comment sentiment and traction. It is reviewed each cycle and moves at most 15% at a time."
    : "The contributor set this price themselves. aiAlgo does not adjust it.";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="gap-1.5 font-normal">
          {isAuto ? <Bot className="h-3.5 w-3.5" aria-hidden /> : <UserRound className="h-3.5 w-3.5" aria-hidden />}
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{help}</TooltipContent>
    </Tooltip>
  );
}
