-- 1. Backtest jobs
CREATE TABLE public.backtest_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES public.ai_models(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'validation',
  model_version text NOT NULL DEFAULT '1.0.0',
  status text NOT NULL DEFAULT 'queued',
  stage text NOT NULL DEFAULT 'queued',
  progress integer NOT NULL DEFAULT 0,
  stage_message text,
  failure_code text,
  failure_reason text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  protocol jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb,
  eta_seconds integer NOT NULL DEFAULT 180,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_backtest_jobs_model ON public.backtest_jobs(model_id, created_at DESC);
CREATE INDEX idx_backtest_jobs_user ON public.backtest_jobs(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.backtest_jobs TO authenticated;
GRANT SELECT ON public.backtest_jobs TO anon;
GRANT ALL ON public.backtest_jobs TO service_role;
ALTER TABLE public.backtest_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their backtest jobs" ON public.backtest_jobs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all backtest jobs" ON public.backtest_jobs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update backtest jobs" ON public.backtest_jobs
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can read verified reports for live models" ON public.backtest_jobs
  FOR SELECT TO anon, authenticated
  USING (
    kind <> 'sandbox'
    AND status = 'completed'
    AND EXISTS (SELECT 1 FROM public.ai_models m WHERE m.id = backtest_jobs.model_id AND m.status = 'live')
  );

CREATE TRIGGER t_backtest_jobs_updated BEFORE UPDATE ON public.backtest_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Data catalog
CREATE TABLE public.data_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_class public.asset_class NOT NULL,
  symbol text NOT NULL,
  display_name text NOT NULL,
  market text NOT NULL,
  timeframes text[] NOT NULL DEFAULT ARRAY['1d']::text[],
  coverage_start date NOT NULL,
  coverage_end date NOT NULL,
  update_frequency text NOT NULL DEFAULT 'daily',
  row_count bigint NOT NULL DEFAULT 0,
  provider text NOT NULL DEFAULT 'AlgoForge',
  fields text[] NOT NULL DEFAULT ARRAY['open','high','low','close','volume']::text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (symbol, market)
);
GRANT SELECT ON public.data_catalog TO anon, authenticated;
GRANT ALL ON public.data_catalog TO service_role;
ALTER TABLE public.data_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Data catalog is public" ON public.data_catalog FOR SELECT TO anon, authenticated USING (true);

-- 3. Data requests
CREATE TABLE public.data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_class public.asset_class NOT NULL,
  symbol text NOT NULL,
  timeframe text NOT NULL,
  provider_hint text,
  reason text,
  status text NOT NULL DEFAULT 'open',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.data_requests TO authenticated;
GRANT ALL ON public.data_requests TO service_role;
ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their data requests" ON public.data_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create data requests" ON public.data_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view data requests" ON public.data_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER t_data_requests_updated BEFORE UPDATE ON public.data_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Model appeals
CREATE TABLE public.model_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.ai_models(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.backtest_jobs(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.model_appeals TO authenticated;
GRANT ALL ON public.model_appeals TO service_role;
ALTER TABLE public.model_appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their appeals" ON public.model_appeals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create appeals" ON public.model_appeals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view appeals" ON public.model_appeals
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update appeals" ON public.model_appeals
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER t_model_appeals_updated BEFORE UPDATE ON public.model_appeals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. Model columns
ALTER TABLE public.ai_models
  ADD COLUMN IF NOT EXISTS backtest_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sandbox_runs_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS validation_job_id uuid,
  ADD COLUMN IF NOT EXISTS last_validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_revalidation_at timestamptz,
  ADD COLUMN IF NOT EXISTS divergence_flagged boolean NOT NULL DEFAULT false;

-- 6. Global backtest protocol
INSERT INTO public.platform_settings (key, value)
VALUES ('backtest_protocol', jsonb_build_object(
  'inSampleStart', '2019-01-01',
  'inSampleEnd', '2023-12-31',
  'holdoutStart', '2024-01-01',
  'holdoutEnd', '2025-12-31',
  'slippagePct', 0.1,
  'feeBps', 10,
  'spreadBps', 2,
  'initialCapital', 100000,
  'positionSizingPct', 10,
  'maxLeverage', 1,
  'maxPositions', 5,
  'maxDrawdownLimitPct', 40,
  'benchmark', 'SPY',
  'revalidationMonths', 3,
  'minSharpe', 0.8,
  'minTrades', 30,
  'maxAllowedDrawdownPct', 35,
  'divergenceThresholdPct', 30
))
ON CONFLICT (key) DO NOTHING;

-- 7. Seed data catalog
INSERT INTO public.data_catalog (asset_class, symbol, display_name, market, timeframes, coverage_start, coverage_end, update_frequency, row_count, provider, notes) VALUES
('crypto','BTC/USDT','Bitcoin / Tether','BINANCE',ARRAY['1m','5m','1h','1d'],'2019-01-01','2026-08-12','realtime (1s)',3900000,'Binance','Spot pair, includes funding-free spot candles.'),
('crypto','ETH/USDT','Ethereum / Tether','BINANCE',ARRAY['1m','5m','1h','1d'],'2019-01-01','2026-08-12','realtime (1s)',3900000,'Binance','Spot pair.'),
('crypto','SOL/USDT','Solana / Tether','BINANCE',ARRAY['5m','1h','1d'],'2020-08-11','2026-08-12','realtime (1s)',620000,'Binance','Listed Aug 2020.'),
('crypto','BNB/USDT','BNB / Tether','BINANCE',ARRAY['5m','1h','1d'],'2019-01-01','2026-08-12','realtime (1s)',780000,'Binance',NULL),
('crypto','XRP/USDT','XRP / Tether','BINANCE',ARRAY['1h','1d'],'2019-01-01','2026-08-12','realtime (5s)',66000,'Binance',NULL),
('stocks','AAPL','Apple Inc.','NASDAQ',ARRAY['1m','5m','1h','1d'],'2015-01-02','2026-08-12','15-min delayed intraday, EOD daily',1150000,'Polygon','Split and dividend adjusted.'),
('stocks','TSLA','Tesla Inc.','NASDAQ',ARRAY['1m','5m','1h','1d'],'2015-01-02','2026-08-12','15-min delayed intraday, EOD daily',1150000,'Polygon','Split adjusted (2020, 2022).'),
('stocks','NVDA','NVIDIA Corp.','NASDAQ',ARRAY['5m','1h','1d'],'2015-01-02','2026-08-12','EOD daily',230000,'Polygon','Split adjusted (2021, 2024).'),
('stocks','MSFT','Microsoft Corp.','NASDAQ',ARRAY['5m','1h','1d'],'2015-01-02','2026-08-12','EOD daily',230000,'Polygon',NULL),
('stocks','SPY','SPDR S&P 500 ETF','NYSEARCA',ARRAY['1m','5m','1h','1d'],'2010-01-04','2026-08-12','EOD daily',1600000,'Polygon','Default benchmark series.'),
('stocks','QQQ','Invesco QQQ Trust','NASDAQ',ARRAY['5m','1h','1d'],'2010-01-04','2026-08-12','EOD daily',420000,'Polygon',NULL),
('stocks','0700.HK','Tencent Holdings','HKEX',ARRAY['5m','1h','1d'],'2016-01-04','2026-08-12','EOD daily',185000,'Futu','HKD denominated, lot size 100.'),
('stocks','9988.HK','Alibaba Group','HKEX',ARRAY['5m','1h','1d'],'2019-11-26','2026-08-12','EOD daily',120000,'Futu','HKD denominated.'),
('stocks','0005.HK','HSBC Holdings','HKEX',ARRAY['1h','1d'],'2016-01-04','2026-08-12','EOD daily',44000,'Futu',NULL),
('stocks','1299.HK','AIA Group','HKEX',ARRAY['1h','1d'],'2016-01-04','2026-08-12','EOD daily',44000,'Futu',NULL),
('stocks','3690.HK','Meituan','HKEX',ARRAY['1h','1d'],'2018-09-20','2026-08-12','EOD daily',36000,'Futu',NULL),
('forex','EUR/USD','Euro / US Dollar','FX',ARRAY['1m','5m','1h','1d'],'2014-01-01','2026-08-12','realtime (1s)',4400000,'OANDA','Mid prices, 24x5.'),
('forex','GBP/USD','Pound / US Dollar','FX',ARRAY['5m','1h','1d'],'2014-01-01','2026-08-12','realtime (1s)',880000,'OANDA',NULL),
('forex','USD/JPY','US Dollar / Yen','FX',ARRAY['5m','1h','1d'],'2014-01-01','2026-08-12','realtime (1s)',880000,'OANDA',NULL),
('forex','USD/HKD','US Dollar / HK Dollar','FX',ARRAY['1h','1d'],'2014-01-01','2026-08-12','hourly',105000,'OANDA','Pegged band 7.75-7.85.'),
('futures','ES','E-mini S&P 500','CME',ARRAY['1m','5m','1h','1d'],'2015-01-02','2026-08-12','realtime (1s)',2900000,'Databento','Continuous front-month, roll-adjusted.'),
('futures','NQ','E-mini Nasdaq 100','CME',ARRAY['1m','5m','1h','1d'],'2015-01-02','2026-08-12','realtime (1s)',2900000,'Databento','Continuous front-month.'),
('futures','CL','Crude Oil WTI','NYMEX',ARRAY['5m','1h','1d'],'2015-01-02','2026-08-12','realtime (5s)',560000,'Databento',NULL),
('futures','GC','Gold','COMEX',ARRAY['5m','1h','1d'],'2015-01-02','2026-08-12','realtime (5s)',560000,'Databento',NULL)
ON CONFLICT (symbol, market) DO NOTHING;