import { create } from "zustand";
import { SYMBOLS } from "@/lib/market";

export type Tick = { symbol: string; price: number; prevClose: number; changePct: number };

const SEED: Record<string, number> = {
  "0700.HK": 372.4,
  "9988.HK": 84.15,
  "3690.HK": 118.6,
  "2318.HK": 47.35,
  "0005.HK": 63.8,
  AAPL: 214.32,
  TSLA: 248.9,
  SPY: 552.1,
  QQQ: 468.4,
};

type MarketState = {
  ticks: Record<string, Tick>;
  running: boolean;
  step: () => void;
  setRunning: (v: boolean) => void;
};

const initial = (): Record<string, Tick> =>
  Object.fromEntries(
    SYMBOLS.map((s) => {
      const price = SEED[s.symbol] ?? 100;
      return [s.symbol, { symbol: s.symbol, price, prevClose: price, changePct: 0 }];
    }),
  );

export const useMarketStore = create<MarketState>((set) => ({
  ticks: initial(),
  running: true,
  setRunning: (v) => set({ running: v }),
  step: () =>
    set((state) => {
      const next: Record<string, Tick> = {};
      for (const [symbol, tick] of Object.entries(state.ticks)) {
        const vol = symbol === "TSLA" ? 0.006 : symbol.endsWith(".HK") ? 0.0035 : 0.0025;
        const drift = (Math.random() - 0.49) * 2 * vol;
        const price = Math.max(0.5, tick.price * (1 + drift));
        next[symbol] = {
          symbol,
          price,
          prevClose: tick.prevClose,
          changePct: ((price - tick.prevClose) / tick.prevClose) * 100,
        };
      }
      return { ticks: next };
    }),
}));
