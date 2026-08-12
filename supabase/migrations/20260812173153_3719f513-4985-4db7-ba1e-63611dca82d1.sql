CREATE TYPE public.plan_tier AS ENUM ('free','pro','elite');

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  product_id text,
  price_id text,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.usage_counters (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period text NOT NULL,
  backtests_run integer NOT NULL DEFAULT 0,
  ai_calls integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period)
);
GRANT SELECT ON public.usage_counters TO authenticated;
GRANT ALL ON public.usage_counters TO service_role;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own usage" ON public.usage_counters FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.creator_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id uuid REFERENCES public.strategies(id) ON DELETE SET NULL,
  strategy_name text,
  subscriber_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  gross_amount numeric NOT NULL DEFAULT 0,
  fee_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  fee_rate numeric NOT NULL DEFAULT 0.2,
  currency text NOT NULL DEFAULT 'HKD',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_creator_payouts_creator ON public.creator_payouts(creator_id);
GRANT SELECT, INSERT ON public.creator_payouts TO authenticated;
GRANT ALL ON public.creator_payouts TO service_role;
ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators view own payouts" ON public.creator_payouts FOR SELECT TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Subscribers record payouts" ON public.creator_payouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = subscriber_id);

CREATE OR REPLACE FUNCTION public.current_plan_tier(_user_id uuid, _env text DEFAULT 'sandbox')
RETURNS public.plan_tier
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN s.price_id LIKE 'elite%' THEN 'elite'::public.plan_tier
      WHEN s.price_id LIKE 'pro%' THEN 'pro'::public.plan_tier
      ELSE 'free'::public.plan_tier
    END
    FROM public.subscriptions s
    WHERE s.user_id = _user_id
      AND s.environment = _env
      AND (
        (s.status IN ('active','trialing','past_due') AND (s.current_period_end IS NULL OR s.current_period_end > now()))
        OR (s.status = 'canceled' AND s.current_period_end > now())
      )
    ORDER BY CASE WHEN s.price_id LIKE 'elite%' THEN 2 ELSE 1 END DESC, s.created_at DESC
    LIMIT 1
  ), 'free'::public.plan_tier)
$$;
REVOKE EXECUTE ON FUNCTION public.current_plan_tier(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.current_plan_tier(uuid, text) TO authenticated, service_role;