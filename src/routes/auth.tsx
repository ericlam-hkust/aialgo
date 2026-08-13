import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Workflow } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="hero-glow flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="grid-bg absolute inset-0 opacity-40" aria-hidden />
      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-semibold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Workflow className="h-4 w-4" aria-hidden />
          </span>
          aiAlgo
        </Link>
        <Outlet />
      </div>
    </div>
  );
}
