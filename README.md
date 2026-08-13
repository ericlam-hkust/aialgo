# AlgoNavigator Pro

Build a full-stack algorithmic trading platform called "aiAlgo" designed for retail traders in Hong Kong and global markets. The platform enables users to create, backtest, and simulate automated trading strategies without writing code, using a visual drag-and-drop builder and AI-assisted natural language strategy creation.

### TECH STACK

- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui

- Backend & Database: Supabase (PostgreSQL, Auth, Row Level Security, Realtime)

- State Management: Zustand

- Charts: Lightweight Charts (TradingView) or Recharts

- AI Integration: OpenAI API for natural language strategy parsing

- Deployment: Vercel-ready

### DESIGN SYSTEM

- Theme: Clean, professional fintech aesthetic. Dark mode default with light mode toggle.

- Colors: Slate-950 background, emerald-500 for profits, rose-500 for losses, blue-500 for primary actions, amber-500 for warnings.

- Typography: Inter for UI, JetBrains Mono for code/data displays.

- Layout: Sidebar navigation (collapsible), main content area with breadcrumb header, bottom status bar showing connection status.

- All tables must be sortable, filterable, and paginated. Use data grids for large datasets.

### AUTHENTICATION & USER MANAGEMENT

- Supabase Auth with email/password and OAuth (Google).

- Role-based access: Free Tier, Pro Tier, Admin.

- User onboarding flow: 3-step wizard (profile, risk tolerance assessment, connect broker/paper trading).

- Row Level Security (RLS) on all tables ensuring users only see their own strategies, trades, and data.

### CORE FEATURES TO BUILD

#### 1. STRATEGY BUILDER (No-Code Visual Editor)

Create a visual canvas page at `/dashboard/strategies/builder` with:

- A left sidebar "Toolbox" containing draggable nodes:

  - DATA nodes: Price (OHLC), Volume, Technical Indicator (SMA, EMA, RSI, MACD, Bollinger Bands, ATR), Time/Date

  - CONDITION nodes: Cross Above, Cross Below, Greater Than, Less Than, Equals, And, Or, Not

  - ACTION nodes: Buy Market, Sell Market, Buy Limit, Sell Limit, Set Stop Loss, Set Take Profit, Close Position, Trailing Stop

  - RISK nodes: Max Position Size, Max Daily Loss, Max Drawdown Percent

- A central canvas area (using ReactFlow or a custom grid) where users connect nodes with edges to form a strategy flow.

- A right sidebar "Properties Panel" that opens when a node is selected, allowing parameter configuration (e.g., set SMA period to 20, set RSI threshold to 30).

- A top toolbar with: Save, Run Backtest, Deploy to Paper Trading, AI Assist button.

- "AI Assist" feature: A chat panel where users type natural language (e.g., "Buy when 50-day SMA crosses above 200-day SMA with RSI below 70, stop loss at 5%"). The AI suggests a node configuration that the user can apply with one click.

#### 2. STRATEGY TEMPLATE LIBRARY

Page at `/dashboard/strategies/templates`:

- Grid of pre-built strategy cards with:

  - Mean Reversion (RSI oversold/bought)

  - Trend Following (Dual Moving Average Crossover)

  - Breakout Trading (Bollinger Band Squeeze)

  - Grid Trading

  - Pairs Trading (mock correlation-based)

- Each card shows: Name, description, expected market condition (bull/bear/sideways), risk level, historical mock performance chart.

- "Clone & Customize" button that copies the template to the user's strategy library and opens it in the builder.

#### 3. BACKTESTING ENGINE (Simulated)

Page at `/dashboard/strategies/backtest`:

- When user clicks "Run Backtest" from the builder, open this page with:

  - Configuration form: Asset symbol (dropdown with HK stocks: 0700.HK, 9988.HK, 3690.HK, 2318.HK, 0005.HK, and US stocks: AAPL, TSLA, SPY), Date range (default last 2 years), Initial capital (default HKD 100,000), Commission per trade (default 0.03%), Slippage model (default 0.01%).

  - A "Run" button that triggers a simulated backtest.

- Results dashboard with:

  - Key metrics cards: Total Return, Annualized Return, Sharpe Ratio, Max Drawdown, Win Rate, Profit Factor, Number of Trades, Avg Trade Return.

  - Equity curve chart (line chart showing portfolio value over time vs buy-and-hold benchmark).

  - Drawdown chart (underwater curve).

  - Trade distribution histogram.

  - Monthly returns heatmap.

  - Trade log table: Entry date, exit date, entry price, exit price, P&L, return %, strategy signal.

  - Overfitting Warning Banner: If the strategy has >10 parameters or the backtest shows suspiciously perfect returns, display an amber warning: "This strategy may be overfitted to historical data. Consider walk-forward validation."

#### 4. PAPER TRADING SIMULATION

Page at `/dashboard/paper-trading`:

- Live simulation dashboard showing:

  - Current portfolio value, cash balance, open P&L, day P&L.

  - Active strategies table: Strategy name, status (Running/Paused/Stopped), current positions, today's trades, total P&L since deployment.

  - Open positions table: Symbol, quantity, entry price, current price, unrealized P&L, stop loss, take profit.

  - Recent orders table: Time, symbol, side, type, quantity, price, status (Filled/Pending/Cancelled).

  - Market data ticker strip at top showing mock real-time prices for major HK and US stocks (simulate with random walk data updated every 5 seconds).

- Controls: Start All, Pause All, Stop All, Emergency Kill Switch (big red button that stops all strategies and cancels all orders).

- Alert system: Toast notifications for order fills, stop loss triggers, and daily loss limit breaches.

#### 5. PORTFOLIO & ANALYTICS DASHBOARD

Page at `/dashboard`:

- Summary cards: Total Portfolio Value, Total P&L (today/this month/all time), Active Strategies count, Win Rate across all strategies.

- Asset allocation pie chart (by sector, by market HK/US).

- Performance comparison chart: User's portfolio vs Hang Seng Index vs S&P 500.

- Recent activity feed.

- Market overview widget: Major indices (HSI, SPX, NDX), top gainers/losers in watchlist.

#### 6. STRATEGY MARKETPLACE (Pro Feature)

Page at `/dashboard/marketplace`:

- Grid of community-created strategies.

- Each card: Creator name, strategy name, performance chart (verified backtest), price (free or subscription), rating stars, number of users.

- "Subscribe" button that copies the strategy to user's library (read-only copy).

- Creator dashboard at `/dashboard/marketplace/creator` showing: My published strategies, subscriber count, earnings, reviews.

#### 7. RISK MANAGEMENT CENTER

Page at `/dashboard/risk`:

- Global risk settings: Max daily loss % (default 3%), Max portfolio drawdown % (default 10%), Max single position size % (default 20%), Max correlated exposure.

- Active risk monitoring: Real-time gauges showing current exposure vs limits.

- Risk event log: Timestamped table of all risk triggers (e.g., "14:32 - Strategy 'TrendFollow_01' halted due to max daily loss breach").

#### 8. BROKER CONNECTION (Mock Architecture)

Page at `/dashboard/brokers`:

- UI for connecting broker accounts. Create mock integrations for:

  - Interactive Brokers (OAuth simulation)

  - Futu (API key input simulation)

  - Paper Trading (default, always available)

- Each broker card shows: Connection status (Connected/Disconnected), Account balance (mock), Buying power.

- Store broker credentials encrypted in Supabase Vault or environment variables (never expose in frontend).

### DATABASE SCHEMA (Supabase PostgreSQL)

Create these tables with RLS policies:

1. `profiles` (extends auth.users):

   - id, email, full_name, avatar_url, risk_tolerance (conservative/moderate/aggressive), subscription_tier (free/pro), created_at

2. `strategies`:

   - id, user_id, name, description, category, nodes (JSONB - the visual graph), parameters (JSONB), is_public, is_template, parent_strategy_id (for clones), created_at, updated_at

3. `backtests`:

   - id, strategy_id, symbol, start_date, end_date, initial_capital, commission, slippage, total_return, annualized_return, sharpe_ratio, max_drawdown, win_rate, profit_factor, total_trades, equity_curve (JSONB), trades_log (JSONB), overfitting_score, created_at

4. `paper_trades`:

   - id, user_id, strategy_id, symbol, side, order_type, quantity, entry_price, exit_price, stop_loss, take_profit, status (open/closed), pnl, pnl_percent, opened_at, closed_at

5. `paper_positions`:

   - id, user_id, strategy_id, symbol, quantity, avg_entry_price, current_price, unrealized_pnl, unrealized_pnl_percent, stop_loss, take_profit, created_at, updated_at

6. `broker_connections`:

   - id, user_id, broker_name (enum: 'interactive_brokers','futu','paper'), status, credentials (encrypted), account_balance, buying_power, last_synced_at

7. `risk_events`:

   - id, user_id, strategy_id, event_type, severity, message, triggered_at, resolved_at

8. `marketplace_subscriptions`:

   - id, subscriber_id, strategy_id, creator_id, price_paid, subscribed_at

9. `market_data_daily` (mock seed data):

   - id, symbol, date, open, high, low, close, volume, market (HK/US)

   - Seed with 2 years of realistic OHLCV data for: 0700.HK, 9988.HK, 3690.HK, 2318.HK, 0005.HK, AAPL, TSLA, SPY, QQQ. Generate using random walk with realistic volatility and occasional trends.

### MOCK TRADING ENGINE LOGIC (Serverless Functions / Edge Functions)

Create Supabase Edge Functions for:

1. `backtest-runner`:

   - Input: strategy_id, symbol, date_range, initial_capital

   - Parse the strategy JSON (nodes/edges) into executable logic

   - Iterate through historical OHLCV data day by day (or bar by bar)

   - Evaluate conditions at each step. When conditions met, simulate trade with commission and slippage

   - Track portfolio value, cash, positions

   - Return full metrics and equity curve

2. `paper-trading-engine`:

   - Runs on a cron schedule (every 1 minute simulation)

   - Check all active strategies

   - For each strategy, evaluate current market conditions against strategy rules

   - Generate mock orders, update positions, calculate P&L

   - Check risk limits. If breached, halt strategy and log risk event

   - Update real-time portfolio values

3. `market-data-simulator`:

   - Generate realistic mock intraday price updates for the ticker strip

   - Use random walk with drift based on previous close

### UI/UX REQUIREMENTS

- All forms must have validation with clear error messages.

- Loading states: Use skeleton screens for data loading, spinners for actions.

- Empty states: Friendly illustrations when no strategies, backtests, or trades exist.

- Responsive design: Must work on desktop (primary) and tablet. Mobile can be read-only dashboard view.

- Accessibility: WCAG 2.1 AA compliant (keyboard navigation, ARIA labels, sufficient contrast).

- Tooltips everywhere: Technical terms (Sharpe Ratio, Drawdown, Slippage) must have info icons with explanations on hover.

### SPECIFIC PAGES & ROUTES

- `/` - Landing page with hero section, feature grid, pricing cards, FAQ

- `/auth/login` - Login page

- `/auth/register` - Registration with risk assessment wizard

- `/dashboard` - Main portfolio overview

- `/dashboard/strategies` - Strategy library (user's saved strategies)

- `/dashboard/strategies/builder` - Visual strategy builder (ReactFlow canvas)

- `/dashboard/strategies/templates` - Template gallery

- `/dashboard/strategies/backtest` - Backtest results (can be accessed via builder or strategy detail)

- `/dashboard/paper-trading` - Live paper trading monitor

- `/dashboard/marketplace` - Community strategy marketplace

- `/dashboard/risk` - Risk management center

- `/dashboard/brokers` - Broker connections

- `/dashboard/settings` - Profile, billing, API keys, notification preferences

- `/admin` - Admin panel (user management, strategy moderation, system health)

### SECURITY & COMPLIANCE

- All API routes must verify JWT tokens.

- Never expose broker API keys or secrets in frontend code.

- Implement rate limiting on backtest requests (max 10 per hour for free users, unlimited for pro).

- Audit log: Track every strategy creation, modification, deployment, and manual trade override in an `audit_logs` table.

### MOCK DATA SEEDING

On first setup, seed the database with:

- 5 demo strategy templates with complete node configurations

- 2 years of daily OHLCV data for all supported symbols

- 1 demo user with 3 completed backtests and 5 paper trades showing realistic performance

### PERFORMANCE REQUIREMENTS

- Page load time < 2 seconds

- Backtest execution for 2 years of daily data should complete in < 5 seconds

- Real-time paper trading updates should reflect in UI within 3 seconds

- Charts must handle 500+ data points smoothly

Build the complete application with all pages, components, database schema, seed data, edge functions, and authentication fully implemented. Ensure the visual strategy builder is functional with drag-and-drop, node connection, and property editing. The backtest engine should actually process the strategy logic against the seeded historical data and return realistic results.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cb8bb814-bd30-4f34-ab50-fe280d262d2b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
