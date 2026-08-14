import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/marketplace/base-models/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/resource-library" });
  },
});
