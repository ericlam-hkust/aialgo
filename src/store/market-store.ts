import { create } from "zustand";

export type Tick = {
  symbol: string;
  price: number;
  prevClose: number;
  changePct: number;
  provider: string | null;
  quotedAt: string;
};

export type FeedStatus = "idle" | "connecting" | "live" | "stale" | "error" | "unconfigured";

type MarketState = {
  ticks: Record<string, Tick>;
  status: FeedStatus;
  lastUpdated: string | null;
  errors: Record<string, string>;
  setQuotes: (
    quotes: Record<
      string,
      { price: number; prevClose: number | null; changePct: number; provider: string | null; quotedAt: string }
    >,
    errors: Record<string, string>,
  ) => void;
  setStatus: (status: FeedStatus) => void;
};

export const useMarketStore = create<MarketState>((set) => ({
  ticks: {},
  status: "idle",
  lastUpdated: null,
  errors: {},
  setStatus: (status) => set({ status }),
  setQuotes: (quotes, errors) =>
    set((state) => {
      const next: Record<string, Tick> = { ...state.ticks };
      for (const [symbol, q] of Object.entries(quotes)) {
        next[symbol] = {
          symbol,
          price: q.price,
          prevClose: q.prevClose ?? q.price,
          changePct: q.changePct,
          provider: q.provider,
          quotedAt: q.quotedAt,
        };
      }
      const hasQuotes = Object.keys(next).length > 0;
      return {
        ticks: next,
        errors,
        lastUpdated: new Date().toISOString(),
        status: hasQuotes ? "live" : Object.keys(errors).length > 0 ? "unconfigured" : "idle",
      };
    }),
}));
