import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/marketplace")({
  component: ModelsLayout,
});

function ModelsLayout() {
  const { session, loading } = useAuth();

  if (!loading && session) {
    return (
      <AppShell>
        <Outlet />
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" aria-hidden />
            <span className="text-sm font-semibold tracking-tight">AlgoForge</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/marketplace">Model marketplace</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="border-t border-border/70 py-8 text-center text-xs text-muted-foreground">
        Verified metrics are computed out of sample. Trading involves risk of loss.
      </footer>
    </div>
  );
}
