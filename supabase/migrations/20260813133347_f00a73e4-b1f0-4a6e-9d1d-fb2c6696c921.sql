ALTER TABLE public.strategies
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS code_mode text NOT NULL DEFAULT 'generated';