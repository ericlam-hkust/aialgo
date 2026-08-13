import {
  Activity,
  BarChart3,
  Banknote,
  BookOpen,
  Boxes,
  Building2,
  CreditCard,
  Database,
  FlaskConical,
  Gavel,
  GitCompare,
  Layers,
  LayoutDashboard,
  Library,
  LineChart,
  Package,
  PlugZap,
  Settings,
  ShieldAlert,
  Sparkles,
  Store,
  Upload,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to: string;
  key: string;
  icon: LucideIcon;
  exact?: boolean;
  /** extra search terms (english) so the palette finds this page */
  terms?: string[];
  children?: NavItem[];
};

export type NavGroup = {
  key: string | null;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    key: null,
    items: [{ to: "/dashboard", key: "nav.overview", icon: LayoutDashboard, exact: true, terms: ["home", "dashboard"] }],
  },
  {
    key: "group.build",
    items: [
      {
        to: "/dashboard/strategies",
        key: "nav.myWork",
        icon: Boxes,
        exact: true,
        terms: ["my strategies", "drafts", "my models", "create"],
        children: [
          {
            to: "/dashboard/strategies/builder",
            key: "nav.algoBuilder",
            icon: LineChart,
            exact: true,
            terms: ["canvas", "drag and drop", "visual", "new algo"],
          },
          {
            to: "/dashboard/models/new",
            key: "nav.uploadModel",
            icon: Upload,
            exact: true,
            terms: ["submit model", "publish model", "wizard"],
          },
        ],
      },
      { to: "/dashboard/strategies/templates", key: "nav.templates", icon: BarChart3, exact: true, terms: ["presets"] },
      {
        to: "/dashboard/backtest",
        key: "nav.backtest",
        icon: FlaskConical,
        exact: true,
        terms: ["backtest", "playground", "sandbox", "self test", "verify", "validation", "jobs", "history test"],
      },

      {
        to: "/dashboard/data-sources",
        key: "nav.data",
        icon: Database,
        exact: false,
        terms: ["feeds", "api key", "providers"],
        children: [
          {
            to: "/dashboard/data-sources",
            key: "nav.marketData",
            icon: Database,
            exact: true,
            terms: ["provider", "api key", "polygon", "market feed"],
          },
          { to: "/marketplace/data-library", key: "nav.dataLibrary", icon: Library, exact: true, terms: ["historical", "catalog"] },
          { to: "/marketplace/docs", key: "nav.docs", icon: BookOpen, exact: true, terms: ["interface", "contract", "api docs"] },
        ],
      },
    ],
  },
  {
    key: "group.discover",
    items: [
      { to: "/marketplace", key: "nav.marketplace", icon: Store, exact: false, terms: ["marketplace", "catalog", "buy", "ai models", "algo strategies"] },

      { to: "/marketplace/compare", key: "nav.compare", icon: GitCompare, exact: true, terms: ["side by side"] },
      { to: "/dashboard/my-models", key: "nav.mySubscriptions", icon: Layers, exact: true, terms: ["applied", "activations"] },
    ],
  },
  {
    key: "group.trade",
    items: [
      { to: "/dashboard/paper-trading", key: "nav.paperTrading", icon: Activity, exact: true, terms: ["simulate", "demo"] },
      { to: "/dashboard/execution", key: "nav.execution", icon: Zap, exact: true, terms: ["orders", "signals", "live"] },
      { to: "/dashboard/risk", key: "nav.risk", icon: ShieldAlert, exact: true, terms: ["kill switch", "limits"] },
      {
        to: "/dashboard/accounts",
        key: "nav.tradingAccounts",
        icon: PlugZap,
        exact: true,
        terms: ["broker", "ibkr", "futu", "tiger", "binance", "alpaca", "paper account", "connections"],
      },
    ],
  },
  {
    key: "group.earn",
    items: [
      { to: "/dashboard/models", key: "nav.myListings", icon: Package, exact: true, terms: ["contributor", "publish", "earnings"] },
      { to: "/dashboard/earnings", key: "nav.earnings", icon: Banknote, exact: true, terms: ["earnings", "commission", "fees", "revenue"] },
      { to: "/dashboard/models/payouts", key: "nav.payouts", icon: Banknote, exact: true, terms: ["stripe", "bank", "revenue"] },
      { to: "/dashboard/teams", key: "nav.teams", icon: Building2, exact: false, terms: ["organization", "namespace", "tokens"] },
      { to: "/marketplace/api-status", key: "nav.apiStatus", icon: Activity, exact: true, terms: ["uptime", "incidents", "changelog"] },
    ],
  },
  {
    key: "group.account",
    items: [
      { to: "/dashboard/wallet", key: "nav.wallet", icon: Wallet, exact: true, terms: ["credits", "balance"] },
      { to: "/dashboard/billing", key: "nav.billing", icon: CreditCard, exact: true, terms: ["plan", "subscription", "invoice"] },
      { to: "/dashboard/settings", key: "nav.settings", icon: Settings, exact: true, terms: ["profile", "preferences"] },
      { to: "/dashboard/admin", key: "nav.admin", icon: Gavel, exact: true, terms: ["moderation", "review"] },
      { to: "/dashboard/admin/revenue", key: "nav.adminRevenue", icon: Gavel, exact: true, terms: ["platform revenue", "margin", "mrr"] },
    ],
  },
];

export type FlatNavItem = { to: string; key: string; icon: LucideIcon; groupKey: string | null; terms: string[] };

export const FLAT_NAV: FlatNavItem[] = NAV_GROUPS.flatMap((g) =>
  g.items.flatMap((item) => {
    const rows: FlatNavItem[] = [];
    if (!item.children) rows.push({ to: item.to, key: item.key, icon: item.icon, groupKey: g.key, terms: item.terms ?? [] });
    else {
      rows.push({ to: item.to, key: item.key, icon: item.icon, groupKey: g.key, terms: item.terms ?? [] });
      for (const c of item.children) {
        if (c.to === item.to) continue;
        rows.push({ to: c.to, key: c.key, icon: c.icon, groupKey: g.key, terms: c.terms ?? [] });
      }
    }
    return rows;
  }),
);
