import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Boxes,
  ChevronLeft,
  CreditCard,
  Database,
  LayoutDashboard,
  LineChart,
  LogOut,
  Moon,
  PlugZap,
  Settings,
  ShieldAlert,
  Store,
  Sun,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useMarketStore } from "@/store/market-store";
import { useLiveMarket } from "@/hooks/use-live-market";
import { hkSession, usSession } from "@/lib/market-hours";
import { AiAssistant } from "@/components/ai-assistant";
import { UpgradeDialog } from "@/components/upgrade-dialog";
import { useEntitlements } from "@/hooks/use-entitlements";
import { UPGRADE_EVENT } from "@/lib/upgrade-events";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", key: "nav.overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/strategies", key: "nav.strategies", icon: Boxes, exact: false },
  { to: "/dashboard/strategies/builder", key: "nav.builder", icon: LineChart, exact: true },
  { to: "/dashboard/strategies/templates", key: "nav.templates", icon: BarChart3, exact: true },
  { to: "/dashboard/strategies/backtest", key: "nav.backtest", icon: TrendingUp, exact: true },
  { to: "/dashboard/paper-trading", key: "nav.paperTrading", icon: Activity, exact: true },
  { to: "/dashboard/marketplace", key: "nav.marketplace", icon: Store, exact: false },
  { to: "/dashboard/risk", key: "nav.risk", icon: ShieldAlert, exact: true },
  { to: "/dashboard/brokers", key: "nav.brokers", icon: PlugZap, exact: true },
  { to: "/dashboard/data-sources", key: "nav.dataSources", icon: Database, exact: true },
  { to: "/dashboard/billing", key: "nav.billing", icon: CreditCard, exact: true },
  { to: "/dashboard/settings", key: "nav.settings", icon: Settings, exact: true },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const feedStatus = useMarketStore((s) => s.status);
  const lastUpdated = useMarketStore((s) => s.lastUpdated);
  const tickCount = useMarketStore((s) => Object.keys(s.ticks).length);
  const [clock, setClock] = useState("--:--:--");
  const [sessions, setSessions] = useState("");
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);
  const { tier } = useEntitlements();
  const { t } = useI18n();

  useLiveMarket();

  useEffect(() => {
    const onUpgrade = (event: Event) => {
      setUpgradeReason((event as CustomEvent<string>).detail || "Upgrade to unlock this feature.");
    };
    window.addEventListener(UPGRADE_EVENT, onUpgrade);
    return () => window.removeEventListener(UPGRADE_EVENT, onUpgrade);
  }, []);

  useEffect(() => {
    const refresh = () => {
      setClock(new Date().toLocaleTimeString("en-GB"));
      setSessions(`${hkSession().label} · ${usSession().label}`);
    };
    refresh();
    const id = setInterval(refresh, 1000);
    return () => clearInterval(id);
  }, []);

  const crumbs = pathname.split("/").filter(Boolean);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth/login", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all md:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <Wallet className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            {!collapsed ? <span className="text-sm font-semibold tracking-tight">AlgoForge</span> : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? t("shell.expandSidebar") : t("shell.collapseSidebar")}
            aria-controls="main-navigation"
            aria-expanded={!collapsed}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} aria-hidden />
          </Button>
        </div>
        <nav id="main-navigation" className="flex-1 space-y-0.5 overflow-y-auto p-2" aria-label={t("shell.mainNavigation")}>
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
                title={t(item.key)}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {!collapsed ? <span className="truncate">{t(item.key)}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-2" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/85 px-4 backdrop-blur">
          <nav aria-label={t("shell.breadcrumb")} className="flex min-w-0 items-center gap-1.5 text-sm">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
              AlgoForge
            </Link>
            {crumbs.slice(1).map((c, i) => (
              <span key={c + i} className="flex items-center gap-1.5 truncate">
                <span className="text-muted-foreground">/</span>
                <span className={cn(i === crumbs.length - 2 ? "font-medium" : "text-muted-foreground")}>
                  {c.replace(/-/g, " ")}
                </span>
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" onClick={toggle} aria-label={t("shell.toggleTheme")}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label={t("shell.signOut")}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 pb-14 md:p-6 md:pb-14">{children}</main>

        <AiAssistant />
      <UpgradeDialog
        open={upgradeReason !== null}
        onOpenChange={(next) => !next && setUpgradeReason(null)}
        reason={upgradeReason ?? undefined}
        currentTier={tier}
      />


        <div className="fixed inset-x-0 bottom-0 z-20 flex h-8 items-center justify-between border-t border-border bg-card/95 px-4 text-[11px] text-muted-foreground backdrop-blur">
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                feedStatus === "live" ? "animate-pulse bg-profit" : feedStatus === "connecting" ? "bg-muted-foreground" : "bg-loss",
              )}
              aria-hidden
            />
            {feedStatus === "live"
              ? t("shell.feedLive", { count: tickCount })
              : feedStatus === "connecting"
                ? t("shell.feedConnecting")
                : feedStatus === "unconfigured"
                  ? t("shell.feedUnconfigured")
                  : feedStatus === "error"
                    ? t("shell.feedError")
                    : t("shell.feedIdle")}
          </span>
          <Separator orientation="vertical" className="mx-2 hidden h-4 sm:block" />
          <span className="hidden sm:inline">{sessions}</span>
          <Separator orientation="vertical" className="mx-2 hidden h-4 sm:block" />
          <span className="mono">
            {lastUpdated ? t("shell.lastQuote", { time: new Date(lastUpdated).toLocaleTimeString("en-GB") }) : clock} HKT
          </span>
        </div>
      </div>
    </div>
  );
}
