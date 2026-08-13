import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, LogOut, Moon, Search, Settings, Sun, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { NotificationBell } from "@/components/notification-bell";
import { FLAT_NAV, NAV_GROUPS, type NavItem } from "@/lib/nav";

import { cn } from "@/lib/utils";


const OPEN_KEY = "aialgo.nav.open";

function isActive(item: NavItem, pathname: string) {
  return item.exact === false ? pathname.startsWith(item.to) : pathname === item.to;
}

function branchActive(item: NavItem, pathname: string) {
  return isActive(item, pathname) || (item.children ?? []).some((c) => isActive(c, pathname));
}

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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(window.localStorage.getItem(OPEN_KEY) ?? "{}") as Record<string, boolean>;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(OPEN_KEY, JSON.stringify(expanded));
    } catch {
      /* ignore */
    }
  }, [expanded]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const paletteGroups = useMemo(() => {
    const out: { label: string; items: typeof FLAT_NAV }[] = [];
    for (const item of FLAT_NAV) {
      const label = item.groupKey ? t(item.groupKey) : t("nav.overview");
      const found = out.find((g) => g.label === label);
      if (found) found.items.push(item);
      else out.push({ label, items: [item] });
    }
    return out;
  }, [t]);



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
            {!collapsed ? <span className="text-sm font-semibold tracking-tight">aiAlgo</span> : null}
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
        {!collapsed ? (
          <div className="px-2 pt-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex w-full items-center gap-2 rounded-md border border-sidebar-border bg-background/40 px-2.5 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
              aria-label={t("shell.searchMenu")}
            >
              <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="flex-1 truncate">{t("shell.searchPlaceholder")}</span>
              <kbd className="mono rounded border border-border px-1 text-[10px]">⌘K</kbd>
            </button>
          </div>
        ) : (
          <div className="px-2 pt-2">
            <Button variant="ghost" size="icon" className="h-8 w-full" onClick={() => setPaletteOpen(true)} aria-label={t("shell.searchMenu")}>
              <Search className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        )}
        <nav id="main-navigation" className="flex-1 space-y-3 overflow-y-auto p-2" aria-label={t("shell.mainNavigation")}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.key ?? `g${gi}`} className="space-y-0.5">
              {group.key && !collapsed ? (
                <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  {t(group.key)}
                </p>
              ) : null}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item, pathname);
                const open = expanded[item.to] ?? branchActive(item, pathname);
                return (
                  <div key={item.to}>
                    <div className="flex items-center">
                      <Link
                        to={item.to}
                        className={cn(
                          "flex flex-1 items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        )}
                        title={t(item.key)}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        {!collapsed ? <span className="truncate">{t(item.key)}</span> : null}
                      </Link>
                      {item.children && !collapsed ? (
                        <button
                          type="button"
                          onClick={() => setExpanded((s) => ({ ...s, [item.to]: !open }))}
                          className="ml-0.5 rounded p-1 text-muted-foreground hover:text-foreground"
                          aria-label={t(item.key)}
                          aria-expanded={open}
                        >
                          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !open && "-rotate-90")} aria-hidden />
                        </button>
                      ) : null}
                    </div>
                    {item.children && !collapsed && open ? (
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive = isActive(child, pathname);
                          return (
                            <Link
                              key={child.to + child.key}
                              to={child.to}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                                childActive
                                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                              )}
                            >
                              <ChildIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              <span className="truncate">{t(child.key)}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-2" />
      </aside>

      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder={t("shell.searchPlaceholder")} />
        <CommandList>
          <CommandEmpty>{t("shell.searchEmpty")}</CommandEmpty>
          {paletteGroups.map((g) => (
            <CommandGroup key={g.label} heading={g.label}>
              {g.items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.to + item.key}
                    value={`${t(item.key)} ${g.label} ${item.terms.join(" ")} ${item.to}`}
                    onSelect={() => {
                      setPaletteOpen(false);
                      void navigate({ to: item.to });
                    }}
                  >
                    <Icon className="mr-2 h-4 w-4" aria-hidden />
                    <span>{t(item.key)}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>


      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/85 px-4 backdrop-blur">
          <nav aria-label={t("shell.breadcrumb")} className="flex min-w-0 items-center gap-1.5 text-sm">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
              aiAlgo
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
            <NotificationBell />
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
