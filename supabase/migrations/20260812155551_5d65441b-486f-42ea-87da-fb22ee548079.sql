
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('free','pro','admin');
CREATE TYPE public.risk_tolerance AS ENUM ('conservative','moderate','aggressive');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  risk_tolerance public.risk_tolerance NOT NULL DEFAULT 'moderate',
  subscription_tier text NOT NULL DEFAULT 'free',
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'free') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER t_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ STRATEGIES ============
CREATE TABLE public.strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'custom',
  market_condition text,
  risk_level text,
  graph jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT false,
  is_template boolean NOT NULL DEFAULT false,
  price numeric NOT NULL DEFAULT 0,
  rating numeric NOT NULL DEFAULT 0,
  subscriber_count integer NOT NULL DEFAULT 0,
  creator_name text,
  parent_strategy_id uuid REFERENCES public.strategies(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategies TO authenticated;
GRANT SELECT ON public.strategies TO anon;
GRANT ALL ON public.strategies TO service_role;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public strategies readable" ON public.strategies FOR SELECT TO anon, authenticated USING (is_public OR is_template);
CREATE POLICY "own strategies readable" ON public.strategies FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "insert own strategies" ON public.strategies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own strategies" ON public.strategies FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own strategies" ON public.strategies FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER t_strategies_updated BEFORE UPDATE ON public.strategies FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ BACKTESTS ============
CREATE TABLE public.backtests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id uuid REFERENCES public.strategies(id) ON DELETE CASCADE,
  strategy_name text,
  symbol text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  initial_capital numeric NOT NULL DEFAULT 100000,
  commission numeric NOT NULL DEFAULT 0.0003,
  slippage numeric NOT NULL DEFAULT 0.0001,
  total_return numeric,
  annualized_return numeric,
  sharpe_ratio numeric,
  max_drawdown numeric,
  win_rate numeric,
  profit_factor numeric,
  total_trades integer,
  avg_trade_return numeric,
  benchmark_return numeric,
  equity_curve jsonb NOT NULL DEFAULT '[]'::jsonb,
  trades_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  monthly_returns jsonb NOT NULL DEFAULT '[]'::jsonb,
  overfitting_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.backtests TO authenticated;
GRANT ALL ON public.backtests TO service_role;
ALTER TABLE public.backtests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own backtests" ON public.backtests FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ PAPER TRADES ============
CREATE TABLE public.paper_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id uuid REFERENCES public.strategies(id) ON DELETE SET NULL,
  strategy_name text,
  symbol text NOT NULL,
  side text NOT NULL,
  order_type text NOT NULL DEFAULT 'market',
  quantity numeric NOT NULL,
  entry_price numeric NOT NULL,
  exit_price numeric,
  stop_loss numeric,
  take_profit numeric,
  status text NOT NULL DEFAULT 'open',
  pnl numeric NOT NULL DEFAULT 0,
  pnl_percent numeric NOT NULL DEFAULT 0,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paper_trades TO authenticated;
GRANT ALL ON public.paper_trades TO service_role;
ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own paper trades" ON public.paper_trades FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.paper_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id uuid REFERENCES public.strategies(id) ON DELETE SET NULL,
  strategy_name text,
  symbol text NOT NULL,
  quantity numeric NOT NULL,
  avg_entry_price numeric NOT NULL,
  current_price numeric NOT NULL,
  unrealized_pnl numeric NOT NULL DEFAULT 0,
  unrealized_pnl_percent numeric NOT NULL DEFAULT 0,
  stop_loss numeric,
  take_profit numeric,
  sector text,
  market text NOT NULL DEFAULT 'HK',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paper_positions TO authenticated;
GRANT ALL ON public.paper_positions TO service_role;
ALTER TABLE public.paper_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own positions" ON public.paper_positions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_positions_updated BEFORE UPDATE ON public.paper_positions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ STRATEGY DEPLOYMENTS ============
CREATE TABLE public.strategy_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id uuid NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  strategy_name text NOT NULL,
  symbol text NOT NULL DEFAULT '0700.HK',
  status text NOT NULL DEFAULT 'running',
  total_pnl numeric NOT NULL DEFAULT 0,
  trades_today integer NOT NULL DEFAULT 0,
  deployed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategy_deployments TO authenticated;
GRANT ALL ON public.strategy_deployments TO service_role;
ALTER TABLE public.strategy_deployments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own deployments" ON public.strategy_deployments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_deploy_updated BEFORE UPDATE ON public.strategy_deployments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ BROKERS ============
CREATE TABLE public.broker_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_name text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  credentials jsonb,
  account_balance numeric NOT NULL DEFAULT 0,
  buying_power numeric NOT NULL DEFAULT 0,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, broker_name)
);
GRANT SELECT (id, user_id, broker_name, status, account_balance, buying_power, last_synced_at, created_at), INSERT, UPDATE (status, account_balance, buying_power, last_synced_at), DELETE ON public.broker_connections TO authenticated;
GRANT ALL ON public.broker_connections TO service_role;
ALTER TABLE public.broker_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own brokers" ON public.broker_connections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ RISK ============
CREATE TABLE public.risk_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  max_daily_loss_pct numeric NOT NULL DEFAULT 3,
  max_drawdown_pct numeric NOT NULL DEFAULT 10,
  max_position_size_pct numeric NOT NULL DEFAULT 20,
  max_correlated_exposure_pct numeric NOT NULL DEFAULT 40,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.risk_settings TO authenticated;
GRANT ALL ON public.risk_settings TO service_role;
ALTER TABLE public.risk_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own risk settings" ON public.risk_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_risk_updated BEFORE UPDATE ON public.risk_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id uuid REFERENCES public.strategies(id) ON DELETE SET NULL,
  strategy_name text,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  message text NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_events TO authenticated;
GRANT ALL ON public.risk_events TO service_role;
ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own risk events" ON public.risk_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ MARKETPLACE ============
CREATE TABLE public.marketplace_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id uuid NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  creator_id uuid,
  price_paid numeric NOT NULL DEFAULT 0,
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscriber_id, strategy_id)
);
GRANT SELECT, INSERT, DELETE ON public.marketplace_subscriptions TO authenticated;
GRANT ALL ON public.marketplace_subscriptions TO service_role;
ALTER TABLE public.marketplace_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subscriptions" ON public.marketplace_subscriptions FOR ALL TO authenticated USING (auth.uid() = subscriber_id OR auth.uid() = creator_id) WITH CHECK (auth.uid() = subscriber_id);

-- ============ AUDIT ============
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "insert own audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ MARKET DATA ============
CREATE TABLE public.market_data_daily (
  id bigserial PRIMARY KEY,
  symbol text NOT NULL,
  date date NOT NULL,
  open numeric NOT NULL,
  high numeric NOT NULL,
  low numeric NOT NULL,
  close numeric NOT NULL,
  volume bigint NOT NULL,
  market text NOT NULL,
  UNIQUE (symbol, date)
);
CREATE INDEX idx_market_symbol_date ON public.market_data_daily (symbol, date);
GRANT SELECT ON public.market_data_daily TO anon, authenticated;
GRANT ALL ON public.market_data_daily TO service_role;
ALTER TABLE public.market_data_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "market data public" ON public.market_data_daily FOR SELECT TO anon, authenticated USING (true);

-- Seed 2 years of daily OHLCV via random walk with drift
DO $$
DECLARE
  syms text[] := ARRAY['0700.HK','9988.HK','3690.HK','2318.HK','0005.HK','AAPL','TSLA','SPY','QQQ'];
  mkts text[] := ARRAY['HK','HK','HK','HK','HK','US','US','US','US'];
  starts numeric[] := ARRAY[320,72,110,45,58,175,240,430,360];
  vols numeric[] := ARRAY[0.022,0.026,0.030,0.018,0.014,0.017,0.038,0.009,0.012];
  drifts numeric[] := ARRAY[0.0004,0.0002,-0.0003,0.0001,0.0003,0.0007,0.0002,0.0004,0.0005];
  i int; d date; px numeric; o numeric; h numeric; l numeric; c numeric; trend numeric; k int;
BEGIN
  FOR i IN 1..array_length(syms,1) LOOP
    px := starts[i];
    d := (current_date - interval '2 years')::date;
    k := 0;
    trend := 0;
    WHILE d <= current_date LOOP
      IF extract(dow from d) BETWEEN 1 AND 5 THEN
        k := k + 1;
        IF k % 45 = 0 THEN trend := (random()-0.45) * vols[i] * 0.9; END IF;
        o := px;
        c := greatest(0.5, px * (1 + drifts[i] + trend + (random()-0.5)*2*vols[i]));
        h := greatest(o,c) * (1 + random()*vols[i]*0.5);
        l := least(o,c) * (1 - random()*vols[i]*0.5);
        INSERT INTO public.market_data_daily (symbol,date,open,high,low,close,volume,market)
        VALUES (syms[i], d, round(o,3), round(h,3), round(l,3), round(c,3),
                (random()*40000000 + 5000000)::bigint, mkts[i])
        ON CONFLICT DO NOTHING;
        px := c;
      END IF;
      d := d + 1;
    END LOOP;
  END LOOP;
END $$;
