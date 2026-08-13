-- ENUMS
CREATE TYPE public.asset_class AS ENUM ('stocks','crypto','forex','futures');
CREATE TYPE public.model_strategy_type AS ENUM ('momentum','mean_reversion','ml_signal','arbitrage');
CREATE TYPE public.model_risk_level AS ENUM ('low','medium','high');
CREATE TYPE public.model_pricing_model AS ENUM ('one_time','subscription','per_signal');
CREATE TYPE public.model_listing_status AS ENUM ('draft','pending_review','backtest_validation','paper_trading','live','rejected','paused','delisted');
CREATE TYPE public.payout_status AS ENUM ('pending','processing','paid','failed');

-- CONTRIBUTORS
CREATE TABLE public.contributor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text NOT NULL UNIQUE,
  display_name text NOT NULL,
  avatar_url text,
  bio text,
  country text,
  stripe_account_id text,
  payout_status text NOT NULL DEFAULT 'not_started',
  payout_email text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contributor_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contributor_profiles TO authenticated;
GRANT ALL ON public.contributor_profiles TO service_role;
ALTER TABLE public.contributor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contributors public read" ON public.contributor_profiles FOR SELECT USING (true);
CREATE POLICY "contributors insert own" ON public.contributor_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "contributors update own" ON public.contributor_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER t_contrib_updated BEFORE UPDATE ON public.contributor_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- AI MODELS
CREATE TABLE public.ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id uuid NOT NULL REFERENCES public.contributor_profiles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  description text NOT NULL DEFAULT '',
  risk_disclosure text,
  tags text[] NOT NULL DEFAULT '{}',
  asset_class public.asset_class NOT NULL DEFAULT 'stocks',
  strategy_type public.model_strategy_type NOT NULL DEFAULT 'momentum',
  timeframe text NOT NULL DEFAULT '1d',
  risk_level public.model_risk_level NOT NULL DEFAULT 'medium',
  status public.model_listing_status NOT NULL DEFAULT 'draft',
  pricing_model public.model_pricing_model NOT NULL DEFAULT 'subscription',
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'HKD',
  package_kind text NOT NULL DEFAULT 'api',
  api_endpoint text,
  api_auth_encrypted text,
  package_path text,
  parameters jsonb NOT NULL DEFAULT '[]'::jsonb,
  sharpe numeric NOT NULL DEFAULT 0,
  max_drawdown numeric NOT NULL DEFAULT 0,
  win_rate numeric NOT NULL DEFAULT 0,
  cagr numeric NOT NULL DEFAULT 0,
  live_return_30d numeric NOT NULL DEFAULT 0,
  rating numeric NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  active_users integer NOT NULL DEFAULT 0,
  executions integer NOT NULL DEFAULT 0,
  listed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_models_status ON public.ai_models(status);
CREATE INDEX idx_ai_models_contributor ON public.ai_models(contributor_id);
GRANT SELECT ON public.ai_models TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_models TO authenticated;
GRANT ALL ON public.ai_models TO service_role;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "models public read live" ON public.ai_models FOR SELECT USING (status IN ('live','paper_trading'));
CREATE POLICY "models owner read" ON public.ai_models FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "models owner insert" ON public.ai_models FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "models owner update" ON public.ai_models FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "models owner delete" ON public.ai_models FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER t_models_updated BEFORE UPDATE ON public.ai_models FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- VERSIONS
CREATE TABLE public.model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.ai_models(id) ON DELETE CASCADE,
  version text NOT NULL,
  changelog text NOT NULL DEFAULT '',
  is_current boolean NOT NULL DEFAULT false,
  released_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.model_versions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_versions TO authenticated;
GRANT ALL ON public.model_versions TO service_role;
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "versions public read" ON public.model_versions FOR SELECT USING (true);
CREATE POLICY "versions owner write" ON public.model_versions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_models m WHERE m.id = model_id AND (m.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ai_models m WHERE m.id = model_id AND (m.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- METRICS (equity curves)
CREATE TABLE public.model_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.ai_models(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'backtest',
  series jsonb NOT NULL DEFAULT '[]'::jsonb,
  monthly_returns jsonb NOT NULL DEFAULT '[]'::jsonb,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_model_metrics_model ON public.model_metrics(model_id);
GRANT SELECT ON public.model_metrics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_metrics TO authenticated;
GRANT ALL ON public.model_metrics TO service_role;
ALTER TABLE public.model_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics public read" ON public.model_metrics FOR SELECT USING (true);
CREATE POLICY "metrics owner write" ON public.model_metrics FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_models m WHERE m.id = model_id AND (m.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ai_models m WHERE m.id = model_id AND (m.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- REVIEWS
CREATE TABLE public.model_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.ai_models(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Trader',
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_model_reviews_unique ON public.model_reviews(model_id, user_id) WHERE user_id IS NOT NULL;
GRANT SELECT ON public.model_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_reviews TO authenticated;
GRANT ALL ON public.model_reviews TO service_role;
ALTER TABLE public.model_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.model_reviews FOR SELECT USING (true);
CREATE POLICY "reviews own write" ON public.model_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews own update" ON public.model_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews own delete" ON public.model_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- PURCHASES
CREATE TABLE public.model_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.ai_models(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pricing_model public.model_pricing_model NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'HKD',
  status text NOT NULL DEFAULT 'active',
  stripe_session_id text,
  stripe_subscription_id text,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_purchases TO authenticated;
GRANT ALL ON public.model_purchases TO service_role;
ALTER TABLE public.model_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchases own read" ON public.model_purchases FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "purchases own write" ON public.model_purchases FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "purchases own update" ON public.model_purchases FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_purchases_updated BEFORE UPDATE ON public.model_purchases FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ACTIVATIONS
CREATE TABLE public.model_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.ai_models(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_id uuid REFERENCES public.model_purchases(id) ON DELETE SET NULL,
  broker_connection_id uuid REFERENCES public.broker_connections(id) ON DELETE SET NULL,
  mode text NOT NULL DEFAULT 'paper',
  capital_allocation numeric NOT NULL DEFAULT 100000,
  max_position_size_pct numeric NOT NULL DEFAULT 10,
  daily_loss_limit_pct numeric NOT NULL DEFAULT 3,
  stop_loss_pct numeric NOT NULL DEFAULT 5,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  pnl numeric NOT NULL DEFAULT 0,
  pnl_pct numeric NOT NULL DEFAULT 0,
  activated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_activations TO authenticated;
GRANT ALL ON public.model_activations TO service_role;
ALTER TABLE public.model_activations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activations own all" ON public.model_activations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_activations_updated BEFORE UPDATE ON public.model_activations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- TRANSACTIONS
CREATE TABLE public.model_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES public.ai_models(id) ON DELETE SET NULL,
  model_name text,
  contributor_id uuid REFERENCES public.contributor_profiles(id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'purchase',
  gross_amount numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0.2,
  currency text NOT NULL DEFAULT 'HKD',
  payout_batch_id uuid,
  status text NOT NULL DEFAULT 'settled',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_model_tx_contributor ON public.model_transactions(contributor_id);
CREATE INDEX idx_model_tx_buyer ON public.model_transactions(buyer_id);
GRANT SELECT ON public.model_transactions TO authenticated;
GRANT ALL ON public.model_transactions TO service_role;
ALTER TABLE public.model_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx visible to parties" ON public.model_transactions FOR SELECT TO authenticated USING (
  buyer_id = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.contributor_profiles c WHERE c.id = contributor_id AND c.user_id = auth.uid())
);

-- PAYOUT BATCHES
CREATE TABLE public.payout_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id uuid NOT NULL REFERENCES public.contributor_profiles(id) ON DELETE CASCADE,
  period text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'HKD',
  status public.payout_status NOT NULL DEFAULT 'pending',
  stripe_transfer_id text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payout_batches TO authenticated;
GRANT ALL ON public.payout_batches TO service_role;
ALTER TABLE public.payout_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts visible to owner" ON public.payout_batches FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.contributor_profiles c WHERE c.id = contributor_id AND c.user_id = auth.uid())
);

-- WALLETS
CREATE TABLE public.user_wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'HKD',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_wallets TO authenticated;
GRANT ALL ON public.user_wallets TO service_role;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet own read" ON public.user_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- PLATFORM SETTINGS
CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO anon;
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "settings admin write" ON public.platform_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.platform_settings(key, value) VALUES ('commission', '{"rate":0.2}'::jsonb) ON CONFLICT DO NOTHING;

-- SUBMISSIONS
CREATE TABLE public.model_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.ai_models(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.model_listing_status NOT NULL DEFAULT 'pending_review',
  reviewer_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.model_submissions TO authenticated;
GRANT ALL ON public.model_submissions TO service_role;
ALTER TABLE public.model_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submissions owner read" ON public.model_submissions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "submissions owner insert" ON public.model_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "submissions admin update" ON public.model_submissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER t_submissions_updated BEFORE UPDATE ON public.model_submissions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ SEED DATA ============
INSERT INTO public.contributor_profiles (handle, display_name, avatar_url, bio, country, verified, payout_status)
VALUES
 ('quantlab_hk','QuantLab HK','https://api.dicebear.com/7.x/shapes/svg?seed=quantlab','Systematic research desk in Central, focused on HK equities microstructure.','HK',true,'active'),
 ('nova_signals','Nova Signals','https://api.dicebear.com/7.x/shapes/svg?seed=nova','ML-first signal shop. Gradient boosting on cross-sectional features.','SG',true,'active'),
 ('delta_edge','Delta Edge','https://api.dicebear.com/7.x/shapes/svg?seed=delta','Futures spread and basis specialists.','US',true,'active'),
 ('kappa_research','Kappa Research','https://api.dicebear.com/7.x/shapes/svg?seed=kappa','Volatility and options-informed equity models.','UK',false,'pending'),
 ('orion_capital','Orion Capital','https://api.dicebear.com/7.x/shapes/svg?seed=orion','Crypto market-neutral and funding-rate arbitrage.','HK',true,'active'),
 ('tessera_fx','Tessera FX','https://api.dicebear.com/7.x/shapes/svg?seed=tessera','G10 and Asia FX carry plus momentum overlays.','JP',false,'active');

INSERT INTO public.ai_models
 (contributor_id, slug, name, tagline, description, risk_disclosure, tags, asset_class, strategy_type, timeframe, risk_level, status, pricing_model, price, sharpe, max_drawdown, win_rate, cagr, live_return_30d, rating, rating_count, active_users, executions, listed_at)
SELECT
 c.id,
 d.slug, d.name, d.tagline,
 '## Overview' || E'\n\n' || d.tagline || E'\n\n' ||
 'This model is trained on ' || d.timeframe || ' bars across a diversified ' || d.asset_class::text || ' universe. Signals are generated from a blend of trend persistence, cross-sectional ranking and volatility-adjusted position sizing.' || E'\n\n' ||
 '### How it works' || E'\n\n' ||
 '1. Universe screening for liquidity and spread quality.' || E'\n' ||
 '2. Feature computation (momentum, realised volatility, order-flow imbalance proxies).' || E'\n' ||
 '3. Signal scoring and portfolio construction with a volatility target.' || E'\n' ||
 '4. Risk overlay: per-position caps, daily loss limit and trailing stops.' || E'\n\n' ||
 '### Best used for' || E'\n\n' ||
 'Accounts that can hold positions for the full signal horizon and tolerate a ' || round(d.max_drawdown::numeric,1) || '% historical drawdown.',
 'Past performance is not indicative of future results. This model may lose capital. Verified metrics are computed on out-of-sample data with realistic commission and slippage assumptions, but live results will differ.',
 d.tags, d.asset_class::public.asset_class, d.strategy_type::public.model_strategy_type, d.timeframe, d.risk_level::public.model_risk_level,
 'live'::public.model_listing_status, d.pricing_model::public.model_pricing_model, d.price,
 d.sharpe, d.max_drawdown, d.win_rate, d.cagr, d.live_30d, d.rating, d.rating_count, d.active_users, d.executions,
 now() - (d.age_days || ' days')::interval
FROM (VALUES
 ('quantlab_hk','hsi-momentum-pro','HSI Momentum Pro','Cross-sectional momentum on Hang Seng constituents with a volatility target.',ARRAY['hk','momentum','equities'],'stocks','momentum','1d','medium','subscription',299,1.84,14.2,58.4,26.7,3.9,4.7,128,842,15420,410),
 ('quantlab_hk','hk-reversion-alpha','HK Reversion Alpha','Intraday mean reversion on liquid HK large caps.',ARRAY['hk','mean-reversion','intraday'],'stocks','mean_reversion','15m','high','subscription',499,2.11,18.6,63.1,34.2,5.4,4.5,86,517,48210,365),
 ('nova_signals','gbm-signal-us','GBM Signal US','Gradient-boosted cross-sectional model on US large caps.',ARRAY['us','ml','equities'],'stocks','ml_signal','1d','medium','subscription',399,1.96,12.8,56.2,29.4,2.8,4.8,214,1630,22140,520),
 ('nova_signals','deep-flow-qqq','Deep Flow QQQ','Order-flow neural signal for NASDAQ ETFs.',ARRAY['etf','ml','flow'],'stocks','ml_signal','5m','high','per_signal',12,1.62,21.4,54.8,31.5,-1.2,4.1,63,289,96400,240),
 ('delta_edge','es-basis-arb','ES Basis Arb','Futures basis arbitrage between ES and SPY.',ARRAY['futures','arbitrage','us'],'futures','arbitrage','1h','low','subscription',899,2.64,6.3,71.5,18.9,1.4,4.9,74,318,8930,600),
 ('delta_edge','crude-trend-rider','Crude Trend Rider','Multi-timeframe trend following on WTI and Brent.',ARRAY['futures','trend','energy'],'futures','momentum','4h','high','one_time',2499,1.41,26.8,47.2,33.8,6.7,4.2,51,176,4120,540),
 ('orion_capital','funding-harvest','Funding Harvest','Perpetual funding-rate arbitrage across major venues.',ARRAY['crypto','arbitrage','delta-neutral'],'crypto','arbitrage','1h','low','subscription',699,3.02,4.9,78.3,22.4,1.9,4.9,192,1204,64300,455),
 ('orion_capital','btc-regime-switch','BTC Regime Switch','Regime-aware BTC trend model with volatility scaling.',ARRAY['crypto','trend','btc'],'crypto','momentum','4h','high','subscription',349,1.55,29.1,49.6,41.2,8.3,4.3,167,988,12800,380),
 ('orion_capital','alt-basket-reversion','Alt Basket Reversion','Mean reversion on a curated altcoin basket.',ARRAY['crypto','mean-reversion'],'crypto','mean_reversion','1h','high','per_signal',8,1.28,33.5,52.1,37.6,-4.1,3.8,44,163,71200,300),
 ('tessera_fx','g10-carry-plus','G10 Carry Plus','Carry with momentum and drawdown overlay across G10 pairs.',ARRAY['forex','carry','g10'],'forex','momentum','1d','medium','subscription',259,1.73,11.4,57.9,15.8,1.1,4.4,98,604,9840,470),
 ('tessera_fx','asia-fx-reversion','Asia FX Reversion','Short-horizon reversion in USDJPY, USDCNH and AUDUSD.',ARRAY['forex','mean-reversion','asia'],'forex','mean_reversion','30m','medium','subscription',199,1.49,13.7,60.3,17.2,0.6,4.0,57,341,26700,320),
 ('kappa_research','vol-carry-equity','Vol Carry Equity','Equity exposure scaled by implied-realised volatility spread.',ARRAY['equities','volatility'],'stocks','ml_signal','1d','medium','one_time',1899,1.88,15.9,55.4,24.1,2.2,4.6,71,402,7310,500),
 ('kappa_research','earnings-drift','Earnings Drift','Post-earnings announcement drift capture on US mid caps.',ARRAY['us','event','equities'],'stocks','momentum','1d','medium','subscription',329,1.67,17.3,53.8,21.9,3.4,4.2,66,287,5620,430),
 ('quantlab_hk','china-adr-pairs','China ADR Pairs','Statistical arbitrage between HK listings and US ADRs.',ARRAY['hk','us','pairs'],'stocks','arbitrage','1h','low','subscription',549,2.31,8.1,68.7,19.6,1.7,4.7,89,463,18900,410),
 ('nova_signals','smallcap-ml','Smallcap ML','Ensemble model on US small-cap liquidity and momentum features.',ARRAY['us','ml','smallcap'],'stocks','ml_signal','1d','high','subscription',449,1.44,24.6,51.3,32.7,-2.6,3.9,48,214,6180,350),
 ('delta_edge','gold-spread','Gold Spread','Calendar spread trading on COMEX gold futures.',ARRAY['futures','spread','metals'],'futures','arbitrage','1d','low','subscription',629,2.18,7.4,69.9,14.7,0.8,4.5,39,152,3410,560),
 ('tessera_fx','fx-breakout-hunter','FX Breakout Hunter','Volatility breakout system across 14 currency pairs.',ARRAY['forex','breakout'],'forex','momentum','15m','high','per_signal',6,1.33,27.9,46.5,28.3,4.8,3.7,55,231,88400,290),
 ('orion_capital','eth-staking-basis','ETH Staking Basis','Basis capture between staked ETH yield and perp funding.',ARRAY['crypto','arbitrage','eth'],'crypto','arbitrage','4h','low','subscription',479,2.72,5.6,74.8,20.3,1.5,4.8,112,701,15600,440),
 ('kappa_research','defensive-rotation','Defensive Rotation','Sector rotation into low-beta names during risk-off regimes.',ARRAY['us','rotation','defensive'],'stocks','ml_signal','1d','low','subscription',229,1.52,9.8,59.2,12.4,0.9,4.1,43,268,3980,510),
 ('quantlab_hk','tech-momentum-asia','Tech Momentum Asia','Momentum on Asian technology leaders including 0700.HK and 9988.HK.',ARRAY['hk','tech','momentum'],'stocks','momentum','1d','medium','subscription',279,1.79,16.4,56.8,27.9,4.6,4.4,103,586,8740,460),
 ('nova_signals','macro-nowcast','Macro Nowcast','Macro nowcasting signal driving index futures exposure.',ARRAY['macro','futures','ml'],'futures','ml_signal','1d','medium','one_time',3299,1.91,13.2,57.4,23.6,2.1,4.6,58,197,2940,530),
 ('delta_edge','nikkei-trend','Nikkei Trend','Trend following on Nikkei 225 futures with session filters.',ARRAY['futures','japan','trend'],'futures','momentum','1h','medium','subscription',389,1.58,19.7,52.9,25.1,3.2,4.0,47,209,11300,370),
 ('tessera_fx','usdcnh-band','USDCNH Band','Band-reversion model calibrated to PBoC fixing dynamics.',ARRAY['forex','china','mean-reversion'],'forex','mean_reversion','1h','medium','subscription',319,1.86,10.9,64.2,16.8,1.3,4.5,61,352,14200,400),
 ('orion_capital','sol-momentum','SOL Momentum','High-beta momentum model on SOL perpetuals.',ARRAY['crypto','momentum','sol'],'crypto','momentum','1h','high','per_signal',10,1.21,36.2,48.7,44.9,11.6,3.6,38,141,52800,260)
) AS d(handle,slug,name,tagline,tags,asset_class,strategy_type,timeframe,risk_level,pricing_model,price,sharpe,max_drawdown,win_rate,cagr,live_30d,rating,rating_count,active_users,executions,age_days)
JOIN public.contributor_profiles c ON c.handle = d.handle;

-- Versions
INSERT INTO public.model_versions (model_id, version, changelog, is_current, released_at)
SELECT m.id, v.version, v.changelog, v.is_current, now() - (v.age || ' days')::interval
FROM public.ai_models m
CROSS JOIN (VALUES
 ('1.0.0','Initial public release with verified out-of-sample backtest.',false,420),
 ('1.1.0','Added volatility targeting and improved slippage model.',false,240),
 ('1.2.0','Retrained on 18 months of new data; tightened risk overlay.',false,90),
 ('1.3.0','Latency improvements and support for paper-trading mode.',true,21)
) AS v(version,changelog,is_current,age);

-- Metric curves (backtest + live)
INSERT INTO public.model_metrics (model_id, kind, series, monthly_returns, stats)
SELECT m.id, k.kind,
  (SELECT jsonb_agg(jsonb_build_object(
     'date', to_char((current_date - ((k.points - g) * k.step)), 'YYYY-MM-DD'),
     'equity', round((100000 * exp( (ln(1 + m.cagr/100.0) / 365.0) * (g * k.step) + 0.012 * sin(g::numeric/3.0) * k.noise ))::numeric, 2),
     'benchmark', round((100000 * exp( 0.00022 * (g * k.step) + 0.006 * sin(g::numeric/4.0) ))::numeric, 2)
   ) ORDER BY g)
   FROM generate_series(0, k.points) g),
  (SELECT jsonb_agg(jsonb_build_object(
     'month', to_char(date_trunc('month', current_date) - ((11 - i) || ' months')::interval, 'YYYY-MM'),
     'return', round((m.cagr/12.0 + 3.2 * sin((i + m.sharpe)::numeric))::numeric, 2)
   ) ORDER BY i)
   FROM generate_series(0,11) i),
  jsonb_build_object('sharpe', m.sharpe, 'maxDrawdown', m.max_drawdown, 'winRate', m.win_rate, 'cagr', m.cagr, 'trades', m.executions/20)
FROM public.ai_models m
CROSS JOIN (VALUES ('backtest', 250, 3, 1.0), ('live', 120, 1, 1.6)) AS k(kind, points, step, noise);

-- Reviews
INSERT INTO public.model_reviews (model_id, author_name, rating, comment, created_at)
SELECT m.id, r.author, r.rating, r.comment, now() - (r.age || ' days')::interval
FROM public.ai_models m
CROSS JOIN (VALUES
 ('Marcus T.',5,'Running this on paper for two months, tracking the published live curve closely. Risk controls are sensible.',12),
 ('Wing L.',4,'Solid signal quality. Would like more granular parameter control in the config screen.',31),
 ('A. Rahman',5,'Best risk-adjusted model I have used on this platform. Drawdowns matched the disclosure.',54),
 ('Sofia K.',4,'Good documentation and the contributor answers questions quickly.',77),
 ('Danny C.',3,'Performance is fine but the per-signal fees add up when volatility spikes.',95)
) AS r(author,rating,comment,age);

-- Transactions and payouts
INSERT INTO public.model_transactions (model_id, model_name, contributor_id, kind, gross_amount, commission_amount, net_amount, commission_rate, created_at)
SELECT m.id, m.name, m.contributor_id, 'purchase',
  m.price, round((m.price*0.2)::numeric,2), round((m.price*0.8)::numeric,2), 0.2,
  now() - ((g * 3) || ' days')::interval
FROM public.ai_models m
CROSS JOIN generate_series(1, 14) g;

INSERT INTO public.payout_batches (contributor_id, period, amount, status, paid_at)
SELECT c.id, to_char(date_trunc('month', current_date) - ((p) || ' months')::interval, 'YYYY-MM'),
  round((8000 + (random()*24000))::numeric, 2),
  CASE WHEN p = 0 THEN 'pending'::public.payout_status ELSE 'paid'::public.payout_status END,
  CASE WHEN p = 0 THEN NULL ELSE date_trunc('month', current_date) - ((p-1) || ' months')::interval END
FROM public.contributor_profiles c
CROSS JOIN generate_series(0,5) p;