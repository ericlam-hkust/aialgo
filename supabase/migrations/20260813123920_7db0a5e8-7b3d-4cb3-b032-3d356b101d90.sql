ALTER TABLE public.ai_models
  ADD COLUMN IF NOT EXISTS performance_fee_pct numeric NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS fee_able_rate numeric,
  ADD COLUMN IF NOT EXISTS avg_fee_per_trade numeric,
  ADD COLUMN IF NOT EXISTS avg_monthly_fee_per_1k numeric;

UPDATE public.ai_models SET performance_fee_pct = 10 WHERE listing_kind = 'algo';

CREATE TABLE IF NOT EXISTS public.strategy_watermarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activation_id uuid NOT NULL,
  model_id uuid NOT NULL,
  cumulative_pnl numeric NOT NULL DEFAULT 0,
  high_water_mark numeric NOT NULL DEFAULT 0,
  fees_accrued numeric NOT NULL DEFAULT 0,
  simulated boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activation_id)
);
GRANT SELECT ON public.strategy_watermarks TO authenticated;
GRANT ALL ON public.strategy_watermarks TO service_role;
ALTER TABLE public.strategy_watermarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own watermarks" ON public.strategy_watermarks FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.fee_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  trigger text NOT NULL DEFAULT 'threshold',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  charged_at timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fee_batches TO authenticated;
GRANT ALL ON public.fee_batches TO service_role;
ALTER TABLE public.fee_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fee batches" ON public.fee_batches FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.performance_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activation_id uuid,
  model_id uuid NOT NULL,
  contributor_id uuid,
  order_id uuid,
  listing_kind public.listing_kind NOT NULL DEFAULT 'ai_model',
  symbol text NOT NULL DEFAULT '',
  gross_profit numeric NOT NULL DEFAULT 0,
  fee_pct numeric NOT NULL DEFAULT 0,
  fee_amount numeric NOT NULL DEFAULT 0,
  contributor_amount numeric NOT NULL DEFAULT 0,
  platform_amount numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0.2,
  exempt boolean NOT NULL DEFAULT false,
  exempt_reason text,
  simulated boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'accrued',
  batch_id uuid REFERENCES public.fee_batches(id) ON DELETE SET NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_perf_fees_user ON public.performance_fees(user_id, closed_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_fees_model ON public.performance_fees(model_id);
CREATE INDEX IF NOT EXISTS idx_perf_fees_contributor ON public.performance_fees(contributor_id);
GRANT SELECT ON public.performance_fees TO authenticated;
GRANT ALL ON public.performance_fees TO service_role;
ALTER TABLE public.performance_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriber reads own fees" ON public.performance_fees FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "contributor reads earned fees" ON public.performance_fees FOR SELECT TO authenticated USING (auth.uid() = contributor_id);

CREATE TABLE IF NOT EXISTS public.consumer_fee_settings (
  user_id uuid PRIMARY KEY,
  monthly_cap numeric,
  auto_pause_on_cap boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.consumer_fee_settings TO authenticated;
GRANT ALL ON public.consumer_fee_settings TO service_role;
ALTER TABLE public.consumer_fee_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fee settings" ON public.consumer_fee_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);