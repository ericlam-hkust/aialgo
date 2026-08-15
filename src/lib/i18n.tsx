import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "en" | "zh-Hant" | "zh-Hans";

export const LOCALES: { id: Locale; label: string; short: string }[] = [
  { id: "en", label: "English", short: "EN" },
  { id: "zh-Hant", label: "繁體中文", short: "繁" },
  { id: "zh-Hans", label: "简体中文", short: "简" },
];

const STORAGE_KEY = "aialgo.locale";

type Dict = Record<string, string>;

const en: Dict = {
  "nav.overview": "Overview",
  "nav.strategies": "Strategies",
  "nav.builder": "Builder",
  "nav.backtest": "Backtest Playground",
  "nav.paperTrading": "Paper Trading",
  "nav.marketplace": "Marketplace",
  "nav.models": "AI Models",
  "nav.contributor": "Contributor",
  "nav.myModels": "My Models",
  "nav.payouts": "Payouts",
  "nav.dataLibrary": "Data library",
  "nav.docs": "Developer docs",
  "nav.teams": "Teams",
  "nav.risk": "Risk Center",
  "nav.brokers": "Brokers",
  "nav.execution": "Trading Desk",
  "nav.accounts": "Connected Accounts",
  "nav.dataSources": "Data Sources",
  "nav.billing": "Billing & earnings",
  "nav.settings": "Profile & settings",
  "nav.myWork": "My work",
  "nav.uploadModel": "AI Model",
  "nav.resourceLibrary": "Resource Library",
  "nav.fineTuningGuide": "Fine-tuning guide",
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
  "landing.getStarted": "Get started free",
  "landing.nav.marketplace": "Marketplace",
  "landing.nav.pricing": "Pricing",
  "landing.nav.creators": "Creators",
  "landing.badge": "Free to build · pay only when you win",
  "landing.heroTitle": "Free to build. $12 to go live. Fees only when you win.",
  "landing.heroBody":
    "Browsing and paper trading are free forever. Live execution is $12/month plus a performance fee on each profitable closed trade — never on losses. Creators of AI models and algo strategies pay nothing and keep 80% of the fees they generate.",
  "landing.ctaPrimary": "Get started free",
  "landing.ctaSecondary": "Browse the marketplace",
  "landing.proof.verified.title": "Platform-verified backtests",
  "landing.proof.verified.body": "Every listing must pass our walk-forward validation pipeline.",
  "landing.proof.watermark.title": "Cumulative watermark",
  "landing.proof.watermark.body": "Losses must be earned back before any new fee applies.",
  "landing.proof.nolosses.title": "No fee on losses",
  "landing.proof.nolosses.body": "Only profitable closed trades are billed — micro-profits are exempt.",
  "landing.proof.creatorsfree.title": "Free for creators",
  "landing.proof.creatorsfree.body": "Hosting, execution, validation and data cost nothing.",
  "landing.traders.title": "How it works for traders",
  "landing.traders.body": "Prove it first, go live second, pay last.",
  "landing.traders.s1.title": "1 · Pick a verified strategy",
  "landing.traders.s1.body": "Filter AI models and algo strategies by trust tier, then read the full backtest report and live track record.",
  "landing.traders.s2.title": "2 · Paper trade for free",
  "landing.traders.s2.body": "Unlimited simulation with accrued-fee preview, so you know the cost before a dollar moves.",
  "landing.traders.s3.title": "3 · Go live for $12/mo",
  "landing.traders.s3.body": "Unlimited concurrent live strategies. A performance fee applies only when a trade closes in profit.",
  "landing.creators.title": "How creators earn",
  "landing.creators.body": "AI models and rule-based algos are treated exactly the same.",
  "landing.creators.s1.title": "1 · Build",
  "landing.creators.s1.body": "Upload a trained model or wire an algo in the visual builder — both list in the same marketplace.",
  "landing.creators.s2.title": "2 · Get validated",
  "landing.creators.s2.body": "Our walk-forward pipeline runs free of charge and awards your verification badge.",
  "landing.creators.s3.title": "3 · Earn",
  "landing.creators.s3.body": "Keep 80% of every performance fee your strategy generates, paid out automatically.",
  "landing.pricingTitle": "Two plans, no hidden costs",
  "landing.pricingBody": "No strategy caps, no backtest quotas, no listing fees.",
  "landing.perMonth": "/ month",
  "landing.mostPopular": "Live execution",
  "landing.plan.free.cta": "Start free",
  "landing.plan.basic.cta": "Go live for $12",
  "landing.fee.title": "How the performance fee works",
  "landing.fee.cta": "See the full calculator",
  "landing.trust.title": "Transparent and aligned",
  "landing.trust.body": "We earn nothing when you lose, so we have no reason to promote a strategy that does not work.",
  "landing.trust.badge": "Pay only on winning trades",
  "landing.trust.link1": "How we make money",
  "landing.trust.link2": "Verification standards",
  "landing.featuresTitle": "Everything the desk needs",
  "landing.featuresBody": "One workspace for research, validation, execution simulation and risk control.",
  "landing.faqTitle": "Frequently asked",
  "landing.footer":
    "aiAlgo is a trading research and simulation platform. Nothing here is investment advice. Past backtest or live performance does not guarantee future results.",

  "landing.feature.builder.title": "Visual strategy builder",
  "landing.feature.builder.body":
    "Drag data, condition, action and risk nodes onto a canvas and wire them into a complete trading system. No code, no syntax errors.",
  "landing.feature.ai.title": "AI strategy assist",
  "landing.feature.ai.body":
    "Describe your idea in plain English — “buy when the 50-day SMA crosses the 200-day with RSI under 70” — and apply the generated graph in one click.",
  "landing.feature.backtest.title": "Validated backtesting",
  "landing.feature.backtest.body":
    "Bar-by-bar execution with commission, slippage and stops, plus walk-forward windows and an overfitting-risk score.",
  "landing.feature.paper.title": "Paper trading",
  "landing.feature.paper.body":
    "Deploy strategies to a live simulation with streaming prices, positions, order flow and an emergency kill switch.",
  "landing.feature.risk.title": "Risk management centre",
  "landing.feature.risk.body":
    "Daily loss caps, drawdown limits and position sizing enforced automatically, with a full risk event log.",
  "landing.feature.market.title": "Model & algo marketplace",
  "landing.feature.market.body":
    "Subscribe to community AI models and algo strategies, or publish your own and earn on every winning trade.",

  "landing.faq.q1": "What exactly is a performance fee?",
  "landing.faq.a1":
    "When a trade from a subscribed strategy closes in profit, a percentage of that net profit (5–25%, set by the creator) is charged. The creator keeps 80% of it and the platform keeps 20%.",
  "landing.faq.q2": "Do I pay anything on losing trades?",
  "landing.faq.a2":
    "No. Losing trades are never charged, and profits under $1 are exempt so micro-gains never generate a fee.",
  "landing.faq.q3": "How does the watermark work?",
  "landing.faq.a3":
    "Each strategy tracks your cumulative P&L. After a drawdown you pay nothing until the strategy earns back the loss and makes a new high — you are never charged twice for the same gain.",
  "landing.faq.q4": "Do creators pay anything?",
  "landing.faq.a4":
    "Never. Listing, hosting, execution, the validation backtest pipeline and execution data are all free. The platform only earns when your subscribers earn.",
  "landing.faq.q5": "When am I actually charged?",
  "landing.faq.a5":
    "Fees accrue and are charged when they reach $10 or weekly, whichever comes first, with one itemised receipt instead of hundreds of micro-charges.",
};


const zhHant: Dict = {
  "nav.overview": "總覽",
  "nav.strategies": "策略",
  "nav.builder": "策略編輯器",
  "nav.backtest": "回測實驗室",
  "nav.paperTrading": "模擬交易",
  "nav.marketplace": "策略市集",
  "nav.models": "AI 模型",
  "nav.contributor": "創作者",
  "nav.myModels": "我的模型",
  "nav.payouts": "收款",
  "nav.dataLibrary": "數據庫",
  "nav.docs": "開發文件",
  "nav.teams": "團隊",
  "nav.risk": "風險中心",
  "nav.brokers": "券商",
  "nav.execution": "交易台",
  "nav.accounts": "已連結帳戶",
  "nav.dataSources": "數據來源",
  "nav.billing": "帳單與收益",
  "nav.settings": "設定",
  "nav.myWork": "我的作品",
  "nav.uploadModel": "AI 模型",
  "nav.resourceLibrary": "資源庫",
  "nav.fineTuningGuide": "微調指南",
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
  "landing.getStarted": "免費開始",
  "landing.nav.marketplace": "市場",
  "landing.nav.pricing": "定價",
  "landing.nav.creators": "創作者",
  "landing.badge": "免費建立 · 只在獲利時付費",
  "landing.heroTitle": "免費建立。$12 上線。只在賺錢時付費。",
  "landing.heroBody":
    "瀏覽與模擬交易永久免費。實盤執行每月 $12，另按每筆獲利平倉收取績效費——虧損永不收費。創作者（AI 模型與量化演算法）永遠免費，並可分得 80% 績效費。",
  "landing.ctaPrimary": "免費開始",
  "landing.ctaSecondary": "瀏覽市場",
  "landing.proof.verified.title": "平台驗證回測",
  "landing.proof.verified.body": "每個上架策略都須通過前推驗證流程。",
  "landing.proof.watermark.title": "累計高水位",
  "landing.proof.watermark.body": "先補回先前虧損，才會再次收取績效費。",
  "landing.proof.nolosses.title": "虧損零收費",
  "landing.proof.nolosses.body": "只有獲利平倉才計費，微利同樣豁免。",
  "landing.proof.creatorsfree.title": "創作者永久免費",
  "landing.proof.creatorsfree.body": "託管、執行、回測與資料全部免費。",
  "landing.traders.title": "交易者如何使用",
  "landing.traders.body": "先驗證，再上線，最後才付費。",
  "landing.traders.s1.title": "1 · 挑選已驗證策略",
  "landing.traders.s1.body": "在市場中篩選 AI 模型與量化演算法，查看回測報告與實盤紀錄。",
  "landing.traders.s2.title": "2 · 免費模擬交易",
  "landing.traders.s2.body": "無限模擬交易，並預覽若實盤將產生多少績效費。",
  "landing.traders.s3.title": "3 · $12 上線",
  "landing.traders.s3.body": "實盤執行不限策略數量，僅在獲利平倉時收取績效費。",
  "landing.creators.title": "創作者如何賺錢",
  "landing.creators.body": "AI 模型與量化演算法一視同仁。",
  "landing.creators.s1.title": "1 · 建立",
  "landing.creators.s1.body": "上傳 AI 模型，或用視覺化編輯器建立規則型演算法。",
  "landing.creators.s2.title": "2 · 通過驗證",
  "landing.creators.s2.body": "平台前推回測流程免費執行，通過後取得驗證徽章。",
  "landing.creators.s3.title": "3 · 賺取收入",
  "landing.creators.s3.body": "使用者獲利時你取得 80% 績效費，自動結算至你的帳戶。",
  "landing.pricingTitle": "兩個方案，沒有隱藏費用",
  "landing.pricingBody": "無策略數量上限，無回測配額，無上架費。",
  "landing.perMonth": "/ 月",
  "landing.mostPopular": "實盤執行",
  "landing.plan.free.cta": "免費開始",
  "landing.plan.basic.cta": "以 $12 上線",
  "landing.fee.title": "績效費如何運作",
  "landing.fee.cta": "查看完整計算器",
  "landing.trust.title": "透明且利益一致",
  "landing.trust.badge": "只在獲利交易付費",
  "landing.trust.body": "你虧損時我們分文不取，因此我們只有動力推薦真正有效的策略。",
  "landing.trust.link1": "我們如何賺錢",
  "landing.trust.link2": "驗證標準",
  "landing.featuresTitle": "平台能力",
  "landing.featuresBody": "研究、驗證、執行模擬與風險控制，統一在一個工作台。",
  "landing.faqTitle": "常見問題",
  "landing.footer":
    "aiAlgo 為交易研究與模擬平台。此處內容不構成投資建議。過往回測或實盤表現不代表未來結果。",

  "landing.feature.builder.title": "視覺化策略編輯器",
  "landing.feature.builder.body":
    "拖曳資料、條件、動作與風險節點，連成完整交易系統。無需寫程式。",
  "landing.feature.ai.title": "AI 策略助手",
  "landing.feature.ai.body":
    "用自然語言描述想法，一鍵產生策略圖並直接套用。",
  "landing.feature.backtest.title": "已驗證回測",
  "landing.feature.backtest.body":
    "逐根 K 線執行，含手續費、滑點與停損，並進行前推一致性檢驗。",
  "landing.feature.paper.title": "模擬交易",
  "landing.feature.paper.body":
    "即時報價下的模擬部署，含持倉、訂單流與緊急停止開關。",
  "landing.feature.risk.title": "風險控制中心",
  "landing.feature.risk.body":
    "自動執行單日虧損上限、回撤限制與部位控制，並記錄風險事件。",
  "landing.feature.market.title": "策略與模型市場",
  "landing.feature.market.body":
    "訂閱社群的 AI 模型與量化演算法，或發布自己的作品賺取收入。",

  "landing.faq.q1": "績效費是什麼？",
  "landing.faq.a1":
    "每筆獲利平倉時，依創作者設定的比例（5%–25%）自淨利中收取，其中 80% 歸創作者，20% 歸平台。",
  "landing.faq.q2": "虧損的交易會收費嗎？",
  "landing.faq.a2":
    "不會。虧損交易零費用，且利潤低於 $1 的微利同樣豁免。",
  "landing.faq.q3": "高水位如何運作？",
  "landing.faq.a3":
    "每個策略獨立記錄累計損益。出現虧損後，必須先補回虧損、創出新高，才會再次產生績效費。",
  "landing.faq.q4": "創作者需要付費嗎？",
  "landing.faq.a4":
    "永遠不需要。上架、託管、執行、回測流程與執行資料全部免費。平台只在你賺錢時才有收入。",
  "landing.faq.q5": "費用如何結算？",
  "landing.faq.a5":
    "費用先累計，達到 $10 或每週結算一次，以先到者為準，並提供明細收據。",
};


const zhHans: Dict = {
  "nav.overview": "总览",
  "nav.strategies": "策略",
  "nav.builder": "策略编辑器",
  "nav.backtest": "回测实验室",
  "nav.paperTrading": "模拟交易",
  "nav.marketplace": "策略市场",
  "nav.models": "AI 模型",
  "nav.contributor": "创作者",
  "nav.myModels": "我的模型",
  "nav.payouts": "收款",
  "nav.dataLibrary": "数据库",
  "nav.docs": "开发文档",
  "nav.teams": "团队",
  "nav.risk": "风险中心",
  "nav.brokers": "券商",
  "nav.execution": "交易台",
  "nav.accounts": "已连接账户",
  "nav.dataSources": "数据源",
  "nav.billing": "账单与收益",
  "nav.settings": "设置",
  "nav.myWork": "我的作品",
  "nav.uploadModel": "AI 模型",
  "nav.resourceLibrary": "资源库",
  "nav.fineTuningGuide": "微调指南",
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
