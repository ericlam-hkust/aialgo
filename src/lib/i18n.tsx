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
  "nav.earnings": "Earnings",
  "nav.payouts": "Payouts",
  "nav.validation": "Validation queue",
  "nav.playground": "Playground",
  "nav.dataLibrary": "Data library",
  "nav.docs": "Developer docs",
  "nav.teams": "Teams",
  "nav.apiStatus": "API status",
  "nav.wallet": "Wallet",
  "nav.admin": "Admin",
  "nav.adminRevenue": "Platform revenue",
  "nav.risk": "Risk Center",
  "nav.brokers": "Brokers",
  "nav.execution": "Execution",
  "nav.accounts": "Connected Accounts",
  "nav.dataSources": "Data Sources",
  "nav.billing": "Billing",
  "nav.settings": "Settings",
  "nav.myWork": "My work",
  "nav.uploadModel": "Upload AI model",
  "nav.algoBuilder": "Algo builder",
  "nav.data": "Data",
  "nav.marketData": "Market data sources",
  "nav.tradingAccounts": "Trading accounts",
  "nav.mySubscriptions": "My subscriptions",
  "nav.compare": "Compare",
  "nav.myListings": "My listings",
  "group.build": "Build",
  "group.discover": "Discover",
  "group.trade": "Trade",
  "group.earn": "Earn",
  "group.account": "Account",
  "shell.searchMenu": "Search menu",
  "shell.searchPlaceholder": "Search menu…",
  "shell.searchEmpty": "No matching pages",

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
  "nav.earnings": "收益",
  "nav.payouts": "收款",
  "nav.validation": "驗證佇列",
  "nav.playground": "測試沙盒",
  "nav.dataLibrary": "數據庫",
  "nav.docs": "開發文件",
  "nav.teams": "團隊",
  "nav.apiStatus": "API 狀態",
  "nav.wallet": "錢包",
  "nav.admin": "管理",
  "nav.adminRevenue": "平台收益",
  "nav.risk": "風險中心",
  "nav.brokers": "券商",
  "nav.execution": "執行監控",
  "nav.accounts": "已連結帳戶",
  "nav.dataSources": "數據來源",
  "nav.billing": "帳單",
  "nav.settings": "設定",
  "nav.myWork": "我的作品",
  "nav.uploadModel": "上傳 AI 模型",
  "nav.algoBuilder": "策略編輯器",
  "nav.data": "數據",
  "nav.marketData": "行情數據來源",
  "nav.tradingAccounts": "交易帳戶",
  "nav.mySubscriptions": "我的訂閱",
  "nav.compare": "模型比較",
  "nav.myListings": "我的上架",
  "group.build": "建立",
  "group.discover": "探索",
  "group.trade": "交易",
  "group.earn": "收益",
  "group.account": "帳戶",
  "shell.searchMenu": "搜尋選單",
  "shell.searchPlaceholder": "搜尋選單…",
  "shell.searchEmpty": "沒有符合的頁面",

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
  "nav.earnings": "收益",
  "nav.payouts": "收款",
  "nav.validation": "验证队列",
  "nav.playground": "测试沙盒",
  "nav.dataLibrary": "数据库",
  "nav.docs": "开发文档",
  "nav.teams": "团队",
  "nav.apiStatus": "API 状态",
  "nav.wallet": "钱包",
  "nav.admin": "管理",
  "nav.adminRevenue": "平台收益",
  "nav.risk": "风险中心",
  "nav.brokers": "券商",
  "nav.execution": "执行监控",
  "nav.accounts": "已连接账户",
  "nav.dataSources": "数据源",
  "nav.billing": "账单",
  "nav.settings": "设置",
  "nav.myWork": "我的作品",
  "nav.uploadModel": "上传 AI 模型",
  "nav.algoBuilder": "策略编辑器",
  "nav.data": "数据",
  "nav.marketData": "行情数据源",
  "nav.tradingAccounts": "交易账户",
  "nav.mySubscriptions": "我的订阅",
  "nav.compare": "模型比较",
  "nav.myListings": "我的上架",
  "group.build": "构建",
  "group.discover": "发现",
  "group.trade": "交易",
  "group.earn": "收益",
  "group.account": "账户",
  "shell.searchMenu": "搜索菜单",
  "shell.searchPlaceholder": "搜索菜单…",
  "shell.searchEmpty": "没有匹配的页面",

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
  "landing.getStarted": "免费开始",
  "landing.nav.marketplace": "市场",
  "landing.nav.pricing": "定价",
  "landing.nav.creators": "创作者",
  "landing.badge": "免费搭建 · 只在盈利时付费",
  "landing.heroTitle": "免费搭建。$12 上线。只在赚钱时付费。",
  "landing.heroBody":
    "浏览与模拟交易永久免费。实盘执行每月 $12，另按每笔盈利平仓收取绩效费——亏损永不收费。创作者（AI 模型与量化算法）永远免费，并可分得 80% 绩效费。",
  "landing.ctaPrimary": "免费开始",
  "landing.ctaSecondary": "浏览市场",
  "landing.proof.verified.title": "平台验证回测",
  "landing.proof.verified.body": "每个上架策略都须通过前推验证流程。",
  "landing.proof.watermark.title": "累计高水位",
  "landing.proof.watermark.body": "先补回此前亏损，才会再次收取绩效费。",
  "landing.proof.nolosses.title": "亏损零收费",
  "landing.proof.nolosses.body": "只有盈利平仓才计费，微利同样豁免。",
  "landing.proof.creatorsfree.title": "创作者永久免费",
  "landing.proof.creatorsfree.body": "托管、执行、回测与数据全部免费。",
  "landing.traders.title": "交易者如何使用",
  "landing.traders.body": "先验证，再上线，最后才付费。",
  "landing.traders.s1.title": "1 · 挑选已验证策略",
  "landing.traders.s1.body": "在市场中筛选 AI 模型与量化算法，查看回测报告与实盘记录。",
  "landing.traders.s2.title": "2 · 免费模拟交易",
  "landing.traders.s2.body": "无限模拟交易，并预览如果实盘将产生多少绩效费。",
  "landing.traders.s3.title": "3 · $12 上线",
  "landing.traders.s3.body": "实盘执行不限策略数量，仅在盈利平仓时收取绩效费。",
  "landing.creators.title": "创作者如何赚钱",
  "landing.creators.body": "AI 模型与量化算法一视同仁。",
  "landing.creators.s1.title": "1 · 构建",
  "landing.creators.s1.body": "上传 AI 模型，或用可视化编辑器搭建规则型算法。",
  "landing.creators.s2.title": "2 · 通过验证",
  "landing.creators.s2.body": "平台前推回测流程免费运行，通过后获得验证徽章。",
  "landing.creators.s3.title": "3 · 赚取收入",
  "landing.creators.s3.body": "用户盈利时你获得 80% 绩效费，自动结算至你的账户。",
  "landing.pricingTitle": "两个方案，无隐藏费用",
  "landing.pricingBody": "无策略数量上限，无回测配额，无上架费。",
  "landing.perMonth": "/ 月",
  "landing.mostPopular": "实盘执行",
  "landing.plan.free.cta": "免费开始",
  "landing.plan.basic.cta": "以 $12 上线",
  "landing.fee.title": "绩效费如何运作",
  "landing.fee.cta": "查看完整计算器",
  "landing.trust.title": "透明且利益一致",
  "landing.trust.badge": "只在盈利交易付费",
  "landing.trust.body": "你亏损时我们分文不取，因此我们只有动力推荐真正有效的策略。",
  "landing.trust.link1": "我们如何赚钱",
  "landing.trust.link2": "验证标准",
  "landing.featuresTitle": "平台能力",
  "landing.featuresBody": "研究、验证、执行模拟与风险控制，统一在一个工作台。",
  "landing.faqTitle": "常见问题",
  "landing.footer":
    "aiAlgo 为交易研究与模拟平台。此处内容不构成投资建议。过往回测或实盘表现不代表未来结果。",

  "landing.feature.builder.title": "可视化策略编辑器",
  "landing.feature.builder.body":
    "拖拽数据、条件、动作与风险节点，连成完整交易系统。无需写代码。",
  "landing.feature.ai.title": "AI 策略助手",
  "landing.feature.ai.body":
    "用自然语言描述想法，一键生成策略图并直接应用。",
  "landing.feature.backtest.title": "已验证回测",
  "landing.feature.backtest.body":
    "逐根 K 线执行，含手续费、滑点与止损，并进行前推一致性检验。",
  "landing.feature.paper.title": "模拟交易",
  "landing.feature.paper.body":
    "实时行情下的模拟部署，含持仓、订单流与紧急停止开关。",
  "landing.feature.risk.title": "风险控制中心",
  "landing.feature.risk.body":
    "自动执行日内亏损上限、回撤限制与仓位控制，并记录风险事件。",
  "landing.feature.market.title": "策略与模型市场",
  "landing.feature.market.body":
    "订阅社区的 AI 模型与量化算法，或发布自己的作品赚取收入。",

  "landing.faq.q1": "绩效费是什么？",
  "landing.faq.a1":
    "每笔盈利平仓时，按创作者设定的比例（5%–25%）从净利润中收取，其中 80% 归创作者，20% 归平台。",
  "landing.faq.q2": "亏损的交易会收费吗？",
  "landing.faq.a2":
    "不会。亏损交易零费用，且利润低于 $1 的微利同样豁免。",
  "landing.faq.q3": "高水位如何运作？",
  "landing.faq.a3":
    "每个策略独立记录累计盈亏。出现亏损后，必须先补回亏损、创出新高，才会再次产生绩效费。",
  "landing.faq.q4": "创作者需要付费吗？",
  "landing.faq.a4":
    "永远不需要。上架、托管、执行、回测流程与执行数据全部免费。平台只在你赚钱时才有收入。",
  "landing.faq.q5": "费用如何结算？",
  "landing.faq.a5":
    "费用先累计，达到 $10 或每周结算一次，以先到者为准，并提供明细收据。",
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
