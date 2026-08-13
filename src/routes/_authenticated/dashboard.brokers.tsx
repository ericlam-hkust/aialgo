import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/brokers")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/accounts", replace: true });
  },
});
