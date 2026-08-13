ALTER TABLE public.ai_models
  ADD COLUMN IF NOT EXISTS overfitting_risk boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consistency_score numeric NOT NULL DEFAULT 0;