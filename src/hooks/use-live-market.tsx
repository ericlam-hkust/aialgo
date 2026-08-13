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
    let failures = 0;

    const tick = async () => {
      // Skip work while the tab is hidden — avoids hammering the feed in background tabs.
      const hidden = typeof document !== "undefined" && document.hidden;

      if (!hidden && !busy.current) {
        busy.current = true;
        try {
          setStatus("connecting");
          const result = await getQuotes({ data: { symbols: WATCHED } });
          failures = 0;
          if (!cancelled) {
            setQuotes(result.quotes, result.errors);
            if (Object.keys(result.quotes).length > 0) {
              void mark({ data: undefined }).catch(() => undefined);
            }
          }
        } catch {
          // A dev-server reload invalidates the loaded client bundle, so the next call
          // fails until the page reloads. Back off instead of retrying every tick.
          failures += 1;
          if (!cancelled) setStatus("error");
        } finally {
          busy.current = false;
        }
      }

      // After repeated failures the loaded bundle is stale (dev reload / new deploy).
      // Stop polling entirely instead of emitting 500s every tick until the page reloads.
      if (failures >= 3) return;

      if (!cancelled) {
        const base = pollIntervalMs();
        const delay = failures > 0 ? Math.min(base * 2 ** failures, 60_000) : base;
        timer = setTimeout(tick, delay);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [getQuotes, mark, setQuotes, setStatus]);

}
