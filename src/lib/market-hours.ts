export type SessionState = "pre" | "open" | "lunch" | "closed";

export type MarketSession = {
  market: "HK" | "US";
  state: SessionState;
  label: string;
};

function partsIn(timeZone: string, at: Date) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return { weekday: get("weekday"), minutes: hour * 60 + minute };
}

const WEEKEND = new Set(["Sat", "Sun"]);

export function hkSession(at: Date = new Date()): MarketSession {
  const { weekday, minutes } = partsIn("Asia/Hong_Kong", at);
  if (WEEKEND.has(weekday)) return { market: "HK", state: "closed", label: "HKEX closed" };
  if (minutes >= 9 * 60 && minutes < 9 * 60 + 30) return { market: "HK", state: "pre", label: "HKEX pre-open" };
  if (minutes >= 9 * 60 + 30 && minutes < 12 * 60) return { market: "HK", state: "open", label: "HKEX open" };
  if (minutes >= 12 * 60 && minutes < 13 * 60) return { market: "HK", state: "lunch", label: "HKEX lunch break" };
  if (minutes >= 13 * 60 && minutes < 16 * 60) return { market: "HK", state: "open", label: "HKEX open" };
  return { market: "HK", state: "closed", label: "HKEX closed" };
}

export function usSession(at: Date = new Date()): MarketSession {
  const { weekday, minutes } = partsIn("America/New_York", at);
  if (WEEKEND.has(weekday)) return { market: "US", state: "closed", label: "US closed" };
  if (minutes >= 4 * 60 && minutes < 9 * 60 + 30) return { market: "US", state: "pre", label: "US pre-market" };
  if (minutes >= 9 * 60 + 30 && minutes < 16 * 60) return { market: "US", state: "open", label: "US open" };
  if (minutes >= 16 * 60 && minutes < 20 * 60) return { market: "US", state: "pre", label: "US after-hours" };
  return { market: "US", state: "closed", label: "US closed" };
}

export function anyMarketOpen(at: Date = new Date()): boolean {
  return hkSession(at).state === "open" || usSession(at).state === "open";
}

/** Poll interval in ms: fast while a market is live, slow when everything is shut. */
export function pollIntervalMs(at: Date = new Date()): number {
  if (anyMarketOpen(at)) return 10_000;
  const hk = hkSession(at).state;
  const us = usSession(at).state;
  if (hk === "lunch" || hk === "pre" || us === "pre") return 30_000;
  return 120_000;
}
