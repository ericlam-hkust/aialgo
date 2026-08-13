DO $$ BEGIN
  CREATE TYPE public.listing_kind AS ENUM ('algo', 'ai_model');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.ai_models
  ADD COLUMN IF NOT EXISTS listing_kind public.listing_kind NOT NULL DEFAULT 'ai_model',
  ADD COLUMN IF NOT EXISTS strategy_id uuid REFERENCES public.strategies(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ai_models_strategy_id_uidx
  ON public.ai_models (strategy_id) WHERE strategy_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ai_models_listing_kind_idx ON public.ai_models (listing_kind);