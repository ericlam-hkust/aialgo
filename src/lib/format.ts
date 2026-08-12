export const fmtMoney = (v: number, currency = "HKD") =>
  new Intl.NumberFormat("en-HK", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(v) ? v : 0);

export const fmtNum = (v: number, digits = 2) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(
    Number.isFinite(v) ? v : 0,
  );

export const fmtPct = (v: number, digits = 2) => `${v > 0 ? "+" : ""}${fmtNum(v, digits)}%`;

export const pnlClass = (v: number) => (v > 0 ? "text-profit" : v < 0 ? "text-loss" : "text-muted-foreground");

export const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export const fmtTime = (d: string | Date) =>
  new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
