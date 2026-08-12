import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { fetchLiveQuotes } from "@/lib/data-sources.functions";
import { markPaperPositions } from "@/lib/paper.functions";
import { SYMBOLS } from "@/lib/market";
import { pollIntervalMs } from "@/lib/market-hours";
import { useMarketStore } from "@/store/market-store";

const WATCHED = SYMBOLS.map((s) => s.symbol);

/** Polls the live quote feed and keeps the market store + paper marks in sync. */
export function useLiveMarket() {
  const getQuotes = useServerFn(fetchLiveQuotes);
  const mark = useServerFn(markPaperPositions);
  const setQuotes = useMarketStore((s) => s.setQuotes);
  const setStatus = useMarketStore((s) => s.setStatus);
  const busy = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      if (!busy.current) {
        busy.current = true;
        try {
          setStatus("connecting");
          const result = await getQuotes({ data: { symbols: WATCHED } });
          if (!cancelled) {
            setQuotes(result.quotes, result.errors);
            if (Object.keys(result.quotes).length > 0) {
              void mark({ data: undefined }).catch(() => undefined);
            }
          }
        } catch {
          if (!cancelled) setStatus("error");
        } finally {
          busy.current = false;
        }
      }
      if (!cancelled) timer = setTimeout(tick, pollIntervalMs());
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [getQuotes, mark, setQuotes, setStatus]);
}
