-- 1. Purge and drop stored broker credentials (regulatory: platform never holds them)
UPDATE public.broker_connections SET credentials = NULL;
ALTER TABLE public.broker_connections DROP COLUMN IF EXISTS credentials;
ALTER TABLE public.broker_connections
  ALTER COLUMN linking_mode SET DEFAULT 'agent_only';
UPDATE public.broker_connections SET linking_mode = COALESCE(linking_mode, 'agent_only');

-- 2. Contributor revenue pool funded from subscription revenue
CREATE TABLE IF NOT EXISTS public.revenue_pool_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL UNIQUE,
  subscription_revenue_cents bigint NOT NULL DEFAULT 0,
  pool_share_pct numeric NOT NULL DEFAULT 20,
  pool_cents bigint NOT NULL DEFAULT 0,
  total_usage_points bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.revenue_pool_periods TO authenticated, anon;
GRANT ALL ON public.revenue_pool_periods TO service_role;
ALTER TABLE public.revenue_pool_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Revenue pool periods are public" ON public.revenue_pool_periods;
CREATE POLICY "Revenue pool periods are public" ON public.revenue_pool_periods FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.contributor_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id uuid REFERENCES public.ai_models(id) ON DELETE SET NULL,
  usage_points bigint NOT NULL DEFAULT 0,
  share_pct numeric NOT NULL DEFAULT 0,
  amount_cents bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'accrued',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period, user_id, model_id)
);
GRANT SELECT ON public.contributor_allocations TO authenticated;
GRANT ALL ON public.contributor_allocations TO service_role;
ALTER TABLE public.contributor_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Contributors read their own allocations" ON public.contributor_allocations;
CREATE POLICY "Contributors read their own allocations" ON public.contributor_allocations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS contributor_allocations_user_idx ON public.contributor_allocations (user_id, period DESC);