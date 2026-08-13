ALTER TABLE public.ai_models
  ADD COLUMN IF NOT EXISTS data_source_kind text NOT NULL DEFAULT 'platform',
  ADD COLUMN IF NOT EXISTS data_source_label text,
  ADD COLUMN IF NOT EXISTS data_source_id uuid REFERENCES public.data_source_connections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS backtest_ran_at timestamptz,
  ADD COLUMN IF NOT EXISTS loss_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit_factor numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_trades integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_return numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suggested_price numeric,
  ADD COLUMN IF NOT EXISTS pricing_score numeric;

ALTER TABLE public.ai_models
  DROP CONSTRAINT IF EXISTS ai_models_data_source_kind_check;

ALTER TABLE public.ai_models
  ADD CONSTRAINT ai_models_data_source_kind_check
  CHECK (data_source_kind IN ('platform', 'contributor'));