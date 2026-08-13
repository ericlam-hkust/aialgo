import { createFileRoute, redirect } from "@tanstack/react-router";

/** Unified into the Backtest Playground at /dashboard/backtest. */
export const Route = createFileRoute("/_authenticated/dashboard/strategies/backtest")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/backtest" });
  },
});
