import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/strategies/templates")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/resource-library" });
  },
});
