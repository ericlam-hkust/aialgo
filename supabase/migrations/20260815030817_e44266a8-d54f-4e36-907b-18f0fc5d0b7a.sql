ALTER TABLE public.broker_orders
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'broker',
  ADD COLUMN IF NOT EXISTS strategy_id uuid REFERENCES public.strategies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.ai_models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS activation_id uuid REFERENCES public.model_activations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS placed_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS client_order_id text,
  ADD COLUMN IF NOT EXISTS time_in_force text,
  ADD COLUMN IF NOT EXISTS reject_reason text;

ALTER TABLE public.broker_orders
  DROP CONSTRAINT IF EXISTS broker_orders_source_check;
ALTER TABLE public.broker_orders
  ADD CONSTRAINT broker_orders_source_check
  CHECK (source IN ('manual', 'algo', 'ai_model', 'broker'));

CREATE INDEX IF NOT EXISTS broker_orders_user_synced_idx
  ON public.broker_orders (user_id, synced_at DESC);

ALTER TABLE public.execution_orders
  ADD COLUMN IF NOT EXISTS broker_order_id uuid REFERENCES public.broker_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'algo';