import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "en" | "zh-Hant" | "zh-Hans";

export const LOCALES: { id: Locale; label: string; short: string }[] = [
  { id: "en", label: "English", short: "EN" },
  { id: "zh-Hant", label: "繁體中文", short: "繁" },
  { id: "zh-Hans", label: "简体中文", short: "简" },
];

const STORAGE_KEY = "algoforge.locale";

type Dict = Record<string, string>;

const en: Dict = {
  "nav.overview": "Overview",
  "nav.strategies": "Strategies",
  "nav.builder": "Builder",
  "nav.templates": "Templates",
  "nav.backtest": "Backtest",
  "nav.paperTrading": "Paper Trading",
  "nav.marketplace": "Marketplace",
  "nav.models": "AI Models",
  "nav.contributor": "Contributor",
  "nav.myModels": "My Models",
  "nav.payouts": "Payouts",
  "nav.validation": "Validation queue",
  "nav.playground": "Playground",
  "nav.dataLibrary": "Data library",
  "nav.docs": "Developer docs",
  "nav.teams": "Teams",
  "nav.apiStatus": "API status",
  "nav.wallet": "Wallet",
  "nav.admin": "Admin",
  "nav.risk": "Risk Center",
  "nav.brokers": "Brokers",
  "nav.execution": "Execution",
  "nav.accounts": "Connected Accounts",
  "nav.dataSources": "Data Sources",
  "nav.billing": "Billing",
  "nav.settings": "Settings",

  "shell.expandSidebar": "Expand sidebar",
  "shell.collapseSidebar": "Collapse sidebar",
  "shell.mainNavigation": "Main navigation",
  "shell.breadcrumb": "Breadcrumb",
  "shell.toggleTheme": "Toggle colour theme",
  "shell.signOut": "Sign out",
  "shell.language": "Language",
  "shell.feedLive": "Live feed · {count} symbols",
  "shell.feedConnecting": "Live feed · connecting",
  "shell.feedUnconfigured": "No data provider connected",
  "shell.feedError": "Live feed unavailable",
  "shell.feedIdle": "Live feed · idle",
  "shell.lastQuote": "Last quote {time}",

  "landing.signIn": "Sign in",
  "landing.getStarted": "Get started",
  "landing.badge": "Built for Hong Kong retail traders",
  "landing.heroTitle": "Turn a trading idea into a tested strategy — without writing code",
  "landing.heroBody":
    "AlgoForge gives you a visual strategy canvas, an AI co-pilot, a real backtesting engine over HK and US market history, and a paper-trading desk to prove it works before a single dollar moves.",
  "landing.ctaPrimary": "Build your first strategy",
  "landing.ctaSecondary": "I already have an account",
  "landing.stat.symbols": "symbols",
  "landing.stat.history": "daily history",
  "landing.stat.nodes": "node types",
  "landing.stat.backtest": "backtest",
  "landing.featuresTitle": "Everything the desk needs",
  "landing.featuresBody": "One workspace for research, validation, execution simulation and risk control.",
  "landing.pricingTitle": "Simple pricing",
  "landing.faqTitle": "Frequently asked",
  "landing.mostPopular": "Most popular",
  "landing.perPeriod": "/ {period}",
  "landing.footer":
    "AlgoForge is an educational simulation platform. Nothing here is investment advice, and no orders are routed to any exchange.",

  "landing.feature.builder.title": "Visual strategy builder",
  "landing.feature.builder.body":
    "Drag data, condition, action and risk nodes onto a canvas and wire them into a complete trading system. No code, no syntax errors.",
  "landing.feature.ai.title": "AI strategy assist",
  "landing.feature.ai.body":
    "Describe your idea in plain English — “buy when the 50-day SMA crosses the 200-day with RSI under 70” — and apply the generated graph in one click.",
  "landing.feature.backtest.title": "Real backtesting",
  "landing.feature.backtest.body":
    "Your graph is executed bar by bar against two years of daily HK and US data, with commission, slippage and stop handling.",
  "landing.feature.paper.title": "Paper trading",
  "landing.feature.paper.body":
    "Deploy strategies to a live simulation with streaming prices, positions, order flow and an emergency kill switch.",
  "landing.feature.risk.title": "Risk management centre",
  "landing.feature.risk.body":
    "Daily loss caps, drawdown limits and position sizing enforced automatically, with a full risk event log.",
  "landing.feature.market.title": "Strategy marketplace",
  "landing.feature.market.body":
    "Publish verified strategies or subscribe to community systems and clone them into your own library.",

  "landing.plan.free.period": "forever",
  "landing.plan.paid.period": "per month",
  "landing.plan.free.f1": "1 strategy",
  "landing.plan.free.f2": "5 backtests / month",
  "landing.plan.free.f3": "5 AI requests / month",
  "landing.plan.free.f4": "Visual builder & templates",
  "landing.plan.free.cta": "Start free",
  "landing.plan.pro.f1": "25 strategies, 500 backtests / month",
  "landing.plan.pro.f2": "Live market data providers",
  "landing.plan.pro.f3": "Paper trading deployments",
  "landing.plan.pro.f4": "Marketplace publishing (20% fee)",
  "landing.plan.pro.cta": "Go Pro",
  "landing.plan.elite.f1": "Unlimited strategies & backtests",
  "landing.plan.elite.f2": "Broker connections (IBKR, Futu, Tiger)",
  "landing.plan.elite.f3": "Intraday data sync",
  "landing.plan.elite.f4": "0% marketplace commission",
  "landing.plan.elite.cta": "Go Elite",

  "landing.faq.q1": "Is real money at risk?",
  "landing.faq.a1":
    "No. AlgoForge is a simulation platform. Backtests run on stored historical data and paper trading uses simulated fills — no live orders are ever routed to an exchange.",
  "landing.faq.q2": "Which markets are covered?",
  "landing.faq.a2":
    "Hong Kong majors (0700.HK, 9988.HK, 3690.HK, 2318.HK, 0005.HK) plus US names AAPL, TSLA, SPY and QQQ, each with two years of daily OHLCV history.",
  "landing.faq.q3": "Do I need to know how to code?",
  "landing.faq.a3":
    "Not at all. Every strategy is expressed as a node graph. The AI assistant can even draft the graph from a sentence, which you then tune in the properties panel.",
  "landing.faq.q4": "How do you handle overfitting?",
  "landing.faq.a4":
    "Every backtest gets an overfitting score based on parameter count, win rate and return profile. Suspicious results trigger a warning recommending walk-forward validation.",
};

const zhHant: Dict = {
  "nav.overview": "總覽",
  "nav.strategies": "策略",
  "nav.builder": "策略編輯器",
  "nav.templates": "範本",
  "nav.backtest": "回測",
  "nav.paperTrading": "模擬交易",
  "nav.marketplace": "策略市集",
  "nav.models": "AI 模型",
  "nav.contributor": "創作者",
  "nav.myModels": "我的模型",
  "nav.payouts": "收款",
  "nav.validation": "驗證佇列",
  "nav.playground": "測試沙盒",
  "nav.dataLibrary": "數據庫",
  "nav.docs": "開發文件",
  "nav.teams": "團隊",
  "nav.apiStatus": "API 狀態",
  "nav.wallet": "錢包",
  "nav.admin": "管理",
  "nav.risk": "風險中心",
  "nav.brokers": "券商",
  "nav.execution": "執行監控",
  "nav.accounts": "已連結帳戶",
  "nav.dataSources": "數據來源",
  "nav.billing": "帳單",
  "nav.settings": "設定",

  "shell.expandSidebar": "展開側邊欄",
  "shell.collapseSidebar": "收合側邊欄",
  "shell.mainNavigation": "主導覽",
  "shell.breadcrumb": "路徑導覽",
  "shell.toggleTheme": "切換主題色",
  "shell.signOut": "登出",
  "shell.language": "語言",
  "shell.feedLive": "即時報價 · {count} 檔標的",
  "shell.feedConnecting": "即時報價 · 連線中",
  "shell.feedUnconfigured": "尚未連接數據供應商",
  "shell.feedError": "即時報價無法使用",
  "shell.feedIdle": "即時報價 · 閒置",
  "shell.lastQuote": "最後報價 {time}",

  "landing.signIn": "登入",
  "landing.getStarted": "立即開始",
  "landing.badge": "為香港散戶投資者打造",
  "landing.heroTitle": "把交易想法變成經過驗證的策略 —— 完全不用寫程式",
  "landing.heroBody":
    "AlgoForge 提供視覺化策略畫布、AI 副駕駛、涵蓋港美股歷史的真實回測引擎，以及模擬交易台，讓你在投入真金白銀前先驗證成效。",
  "landing.ctaPrimary": "建立你的第一個策略",
  "landing.ctaSecondary": "我已有帳戶",
  "landing.stat.symbols": "檔標的",
  "landing.stat.history": "每日歷史數據",
  "landing.stat.nodes": "種節點類型",
  "landing.stat.backtest": "完成回測",
  "landing.featuresTitle": "交易台所需的一切",
  "landing.featuresBody": "研究、驗證、執行模擬與風險控管，全部集中在同一個工作空間。",
  "landing.pricingTitle": "簡單定價",
  "landing.faqTitle": "常見問題",
  "landing.mostPopular": "最受歡迎",
  "landing.perPeriod": "/ {period}",
  "landing.footer":
    "AlgoForge 為教育用途的模擬平台。所有內容不構成投資建議，亦不會將任何委託單送往交易所。",

  "landing.feature.builder.title": "視覺化策略編輯器",
  "landing.feature.builder.body":
    "把數據、條件、動作與風險節點拖到畫布上並連線，即可組成完整交易系統。無需寫程式，也不會有語法錯誤。",
  "landing.feature.ai.title": "AI 策略協助",
  "landing.feature.ai.body":
    "用自然語言描述你的想法 ——「當 50 日 SMA 上穿 200 日且 RSI 低於 70 時買入」—— 一鍵套用產生的策略圖。",
  "landing.feature.backtest.title": "真實回測",
  "landing.feature.backtest.body":
    "策略圖會逐根 K 線在兩年港美股日線數據上執行，並計入手續費、滑價與停損處理。",
  "landing.feature.paper.title": "模擬交易",
  "landing.feature.paper.body": "把策略部署到即時模擬環境，包含串流報價、持倉、委託流程與緊急停止開關。",
  "landing.feature.risk.title": "風險管理中心",
  "landing.feature.risk.body": "自動執行每日虧損上限、回撤限制與倉位大小控管，並保留完整風險事件紀錄。",
  "landing.feature.market.title": "策略市集",
  "landing.feature.market.body": "發布已驗證策略，或訂閱社群策略並複製到自己的策略庫。",

  "landing.plan.free.period": "永久免費",
  "landing.plan.paid.period": "每月",
  "landing.plan.free.f1": "1 個策略",
  "landing.plan.free.f2": "每月 5 次回測",
  "landing.plan.free.f3": "每月 5 次 AI 請求",
  "landing.plan.free.f4": "視覺化編輯器與範本",
  "landing.plan.free.cta": "免費開始",
  "landing.plan.pro.f1": "25 個策略，每月 500 次回測",
  "landing.plan.pro.f2": "即時市場數據供應商",
  "landing.plan.pro.f3": "模擬交易部署",
  "landing.plan.pro.f4": "市集發布（20% 抽成）",
  "landing.plan.pro.cta": "升級 Pro",
  "landing.plan.elite.f1": "無限策略與回測",
  "landing.plan.elite.f2": "券商連接（IBKR、富途、老虎）",
  "landing.plan.elite.f3": "盤中數據同步",
  "landing.plan.elite.f4": "市集 0% 抽成",
  "landing.plan.elite.cta": "升級 Elite",

  "landing.faq.q1": "會有真金白銀的風險嗎？",
  "landing.faq.a1":
    "不會。AlgoForge 是模擬平台。回測使用已儲存的歷史數據，模擬交易採用模擬成交，任何委託單都不會送往交易所。",
  "landing.faq.q2": "支援哪些市場？",
  "landing.faq.a2":
    "香港大型股（0700.HK、9988.HK、3690.HK、2318.HK、0005.HK）以及美股 AAPL、TSLA、SPY 與 QQQ，各具兩年日線 OHLCV 歷史。",
  "landing.faq.q3": "我需要會寫程式嗎？",
  "landing.faq.a3":
    "完全不用。每個策略都以節點圖表示。AI 助手甚至能依一句話草擬策略圖，你再於屬性面板微調即可。",
  "landing.faq.q4": "如何處理過度擬合？",
  "landing.faq.a4":
    "每次回測都會依參數數量、勝率與報酬分布計算過度擬合分數。結果可疑時會提示採用前推驗證。",
};

const zhHans: Dict = {
  "nav.overview": "总览",
  "nav.strategies": "策略",
  "nav.builder": "策略编辑器",
  "nav.templates": "模板",
  "nav.backtest": "回测",
  "nav.paperTrading": "模拟交易",
  "nav.marketplace": "策略市场",
  "nav.models": "AI 模型",
  "nav.contributor": "创作者",
  "nav.myModels": "我的模型",
  "nav.payouts": "收款",
  "nav.validation": "验证队列",
  "nav.playground": "测试沙盒",
  "nav.dataLibrary": "数据库",
  "nav.docs": "开发文档",
  "nav.teams": "团队",
  "nav.apiStatus": "API 状态",
  "nav.wallet": "钱包",
  "nav.admin": "管理",
  "nav.risk": "风险中心",
  "nav.brokers": "券商",
  "nav.execution": "执行监控",
  "nav.accounts": "已连接账户",
  "nav.dataSources": "数据源",
  "nav.billing": "账单",
  "nav.settings": "设置",

  "shell.expandSidebar": "展开侧边栏",
  "shell.collapseSidebar": "收起侧边栏",
  "shell.mainNavigation": "主导航",
  "shell.breadcrumb": "面包屑导航",
  "shell.toggleTheme": "切换主题色",
  "shell.signOut": "退出登录",
  "shell.language": "语言",
  "shell.feedLive": "实时行情 · {count} 只标的",
  "shell.feedConnecting": "实时行情 · 连接中",
  "shell.feedUnconfigured": "尚未连接数据供应商",
  "shell.feedError": "实时行情不可用",
  "shell.feedIdle": "实时行情 · 空闲",
  "shell.lastQuote": "最新报价 {time}",

  "landing.signIn": "登录",
  "landing.getStarted": "立即开始",
  "landing.badge": "为香港散户投资者打造",
  "landing.heroTitle": "把交易想法变成经过验证的策略 —— 完全不用写代码",
  "landing.heroBody":
    "AlgoForge 提供可视化策略画布、AI 副驾驶、覆盖港美股历史的真实回测引擎，以及模拟交易台，让你在投入真金白银前先验证效果。",
  "landing.ctaPrimary": "创建你的第一个策略",
  "landing.ctaSecondary": "我已有账户",
  "landing.stat.symbols": "只标的",
  "landing.stat.history": "日线历史数据",
  "landing.stat.nodes": "种节点类型",
  "landing.stat.backtest": "完成回测",
  "landing.featuresTitle": "交易台所需的一切",
  "landing.featuresBody": "研究、验证、执行模拟与风险控制，全部集中在同一个工作空间。",
  "landing.pricingTitle": "简单定价",
  "landing.faqTitle": "常见问题",
  "landing.mostPopular": "最受欢迎",
  "landing.perPeriod": "/ {period}",
  "landing.footer":
    "AlgoForge 为教育用途的模拟平台。所有内容不构成投资建议，也不会将任何委托单发送至交易所。",

  "landing.feature.builder.title": "可视化策略编辑器",
  "landing.feature.builder.body":
    "把数据、条件、动作与风险节点拖到画布上并连线，即可组成完整交易系统。无需写代码，也不会有语法错误。",
  "landing.feature.ai.title": "AI 策略助手",
  "landing.feature.ai.body":
    "用自然语言描述你的想法 ——“当 50 日 SMA 上穿 200 日且 RSI 低于 70 时买入”—— 一键应用生成的策略图。",
  "landing.feature.backtest.title": "真实回测",
  "landing.feature.backtest.body":
    "策略图会逐根 K 线在两年港美股日线数据上执行，并计入手续费、滑点与止损处理。",
  "landing.feature.paper.title": "模拟交易",
  "landing.feature.paper.body": "把策略部署到实时模拟环境，包含流式行情、持仓、委托流程与紧急停止开关。",
  "landing.feature.risk.title": "风险管理中心",
  "landing.feature.risk.body": "自动执行每日亏损上限、回撤限制与仓位控制，并保留完整风险事件记录。",
  "landing.feature.market.title": "策略市场",
  "landing.feature.market.body": "发布已验证策略，或订阅社区策略并复制到自己的策略库。",

  "landing.plan.free.period": "永久免费",
  "landing.plan.paid.period": "每月",
  "landing.plan.free.f1": "1 个策略",
  "landing.plan.free.f2": "每月 5 次回测",
  "landing.plan.free.f3": "每月 5 次 AI 请求",
  "landing.plan.free.f4": "可视化编辑器与模板",
  "landing.plan.free.cta": "免费开始",
  "landing.plan.pro.f1": "25 个策略，每月 500 次回测",
  "landing.plan.pro.f2": "实时市场数据供应商",
  "landing.plan.pro.f3": "模拟交易部署",
  "landing.plan.pro.f4": "市场发布（20% 抽成）",
  "landing.plan.pro.cta": "升级 Pro",
  "landing.plan.elite.f1": "无限策略与回测",
  "landing.plan.elite.f2": "券商连接（IBKR、富途、老虎）",
  "landing.plan.elite.f3": "盘中数据同步",
  "landing.plan.elite.f4": "市场 0% 抽成",
  "landing.plan.elite.cta": "升级 Elite",

  "landing.faq.q1": "会有真金白银的风险吗？",
  "landing.faq.a1":
    "不会。AlgoForge 是模拟平台。回测使用已存储的历史数据，模拟交易采用模拟成交，任何委托单都不会发送至交易所。",
  "landing.faq.q2": "支持哪些市场？",
  "landing.faq.a2":
    "香港大型股（0700.HK、9988.HK、3690.HK、2318.HK、0005.HK）以及美股 AAPL、TSLA、SPY 与 QQQ，各具两年日线 OHLCV 历史。",
  "landing.faq.q3": "我需要会写代码吗？",
  "landing.faq.a3":
    "完全不用。每个策略都以节点图表示。AI 助手甚至能根据一句话草拟策略图，你再在属性面板微调即可。",
  "landing.faq.q4": "如何处理过拟合？",
  "landing.faq.a4":
    "每次回测都会根据参数数量、胜率与收益分布计算过拟合分数。结果可疑时会提示采用前推验证。",
};

const DICTS: Record<Locale, Dict> = { en, "zh-Hant": zhHant, "zh-Hans": zhHans };

export const HTML_LANG: Record<Locale, string> = {
  en: "en",
  "zh-Hant": "zh-Hant",
  "zh-Hans": "zh-Hans",
};

type I18nValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function detect(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && stored in DICTS) return stored;
  const nav = window.navigator.language.toLowerCase();
  if (nav.startsWith("zh")) {
    return /hant|tw|hk|mo/.test(nav) ? "zh-Hant" : "zh-Hans";
  }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(detect());
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = HTML_LANG[locale];
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = DICTS[locale][key] ?? en[key] ?? key;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
