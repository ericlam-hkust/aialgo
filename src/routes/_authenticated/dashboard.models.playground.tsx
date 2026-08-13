import { createFileRoute, redirect } from "@tanstack/react-router";

/** Unified into the Backtest Playground at /dashboard/backtest. */
export const Route = createFileRoute("/_authenticated/dashboard/models/playground")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/backtest" });
  },
});
