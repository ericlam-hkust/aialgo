-- 1. Data source connections
CREATE TABLE public.data_source_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  label text,
  api_key_encrypted text,
  key_suffix text,
  use_platform_key boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'unverified',
  status_message text,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_source_connections TO authenticated;
GRANT ALL ON public.data_source_connections TO service_role;
ALTER TABLE public.data_source_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own data sources" ON public.data_source_connections FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_data_sources_updated BEFORE UPDATE ON public.data_source_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Live quotes (shared, server-written)
CREATE TABLE public.market_quotes (
  symbol text PRIMARY KEY,
  price numeric NOT NULL,
  prev_close numeric,
  change_pct numeric,
  day_open numeric,
  day_high numeric,
  day_low numeric,
  volume bigint,
  currency text,
  provider text,
  quoted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.market_quotes TO anon, authenticated;
GRANT ALL ON public.market_quotes TO service_role;
ALTER TABLE public.market_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes public read" ON public.market_quotes FOR SELECT TO anon, authenticated USING (true);

-- 3. Intraday bars
CREATE TABLE public.market_data_intraday (
  id bigserial PRIMARY KEY,
  symbol text NOT NULL,
  interval text NOT NULL,
  ts timestamptz NOT NULL,
  open numeric NOT NULL,
  high numeric NOT NULL,
  low numeric NOT NULL,
  close numeric NOT NULL,
  volume bigint NOT NULL DEFAULT 0,
  provider text,
  UNIQUE (symbol, interval, ts)
);
CREATE INDEX idx_intraday_symbol_ts ON public.market_data_intraday (symbol, interval, ts DESC);
GRANT SELECT ON public.market_data_intraday TO anon, authenticated;
GRANT ALL ON public.market_data_intraday TO service_role;
ALTER TABLE public.market_data_intraday ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intraday public read" ON public.market_data_intraday FOR SELECT TO anon, authenticated USING (true);

-- allow server writes to existing daily table via service_role
GRANT ALL ON public.market_data_daily TO service_role;
GRANT ALL ON SEQUENCE public.market_data_daily_id_seq TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_symbol_date ON public.market_data_daily (symbol, date);

-- 4. Sync runs
CREATE TABLE public.data_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  provider text NOT NULL,
  symbol text,
  range_start date,
  range_end date,
  rows_written integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sync_runs_user_created ON public.data_sync_runs (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.data_sync_runs TO authenticated;
GRANT ALL ON public.data_sync_runs TO service_role;
ALTER TABLE public.data_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sync runs" ON public.data_sync_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own sync runs" ON public.data_sync_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 5. Broker positions / orders
CREATE TABLE public.broker_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_connection_id uuid NOT NULL REFERENCES public.broker_connections(id) ON DELETE CASCADE,
  account_id text,
  symbol text NOT NULL,
  quantity numeric NOT NULL,
  avg_cost numeric NOT NULL DEFAULT 0,
  market_price numeric NOT NULL DEFAULT 0,
  market_value numeric NOT NULL DEFAULT 0,
  unrealized_pnl numeric NOT NULL DEFAULT 0,
  currency text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (broker_connection_id, account_id, symbol)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broker_positions TO authenticated;
GRANT ALL ON public.broker_positions TO service_role;
ALTER TABLE public.broker_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own broker positions" ON public.broker_positions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.broker_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_connection_id uuid NOT NULL REFERENCES public.broker_connections(id) ON DELETE CASCADE,
  account_id text,
  broker_order_id text NOT NULL,
  symbol text NOT NULL,
  side text NOT NULL,
  order_type text,
  quantity numeric NOT NULL DEFAULT 0,
  filled_quantity numeric NOT NULL DEFAULT 0,
  limit_price numeric,
  avg_fill_price numeric,
  status text NOT NULL DEFAULT 'unknown',
  placed_at timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (broker_connection_id, broker_order_id)
);
CREATE INDEX idx_broker_orders_user ON public.broker_orders (user_id, placed_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broker_orders TO authenticated;
GRANT ALL ON public.broker_orders TO service_role;
ALTER TABLE public.broker_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own broker orders" ON public.broker_orders FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Broker connection extras
ALTER TABLE public.broker_connections
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'simulation',
  ADD COLUMN IF NOT EXISTS credentials_encrypted text,
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS account_id text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'HKD',
  ADD COLUMN IF NOT EXISTS auto_sync_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text;