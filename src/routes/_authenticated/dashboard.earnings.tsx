import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/earnings")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/billing" });
  },
});
