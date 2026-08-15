-- pricing mode on listings
DO $$ BEGIN
  CREATE TYPE public.pricing_mode AS ENUM ('builder', 'platform');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.ai_models
  ADD COLUMN IF NOT EXISTS pricing_mode public.pricing_mode NOT NULL DEFAULT 'builder',
  ADD COLUMN IF NOT EXISTS price_set_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS price_source_note text,
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sentiment_avg numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS demand_score numeric NOT NULL DEFAULT 0;

-- likes
CREATE TABLE IF NOT EXISTS public.model_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.ai_models(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_owner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_id, user_id)
);
GRANT SELECT ON public.model_likes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_likes TO authenticated;
GRANT ALL ON public.model_likes TO service_role;
ALTER TABLE public.model_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes readable" ON public.model_likes FOR SELECT USING (true);
CREATE POLICY "own like insert" ON public.model_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own like delete" ON public.model_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- comments
CREATE TABLE IF NOT EXISTS public.model_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.ai_models(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Member',
  body text NOT NULL,
  sentiment text NOT NULL DEFAULT 'neutral',
  sentiment_score numeric NOT NULL DEFAULT 0,
  verified_owner boolean NOT NULL DEFAULT false,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.model_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_comments TO authenticated;
GRANT ALL ON public.model_comments TO service_role;
ALTER TABLE public.model_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments readable" ON public.model_comments FOR SELECT USING (hidden = false OR auth.uid() = user_id OR public.can_manage_model(model_id, auth.uid()));
CREATE POLICY "own comment insert" ON public.model_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own comment update" ON public.model_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.can_manage_model(model_id, auth.uid())) WITH CHECK (true);
CREATE POLICY "own comment delete" ON public.model_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.can_manage_model(model_id, auth.uid()));
CREATE TRIGGER t_model_comments_updated BEFORE UPDATE ON public.model_comments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- price history
CREATE TABLE IF NOT EXISTS public.model_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.ai_models(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  previous_price numeric,
  mode public.pricing_mode NOT NULL,
  reason text,
  factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.model_price_history TO anon;
GRANT SELECT ON public.model_price_history TO authenticated;
GRANT ALL ON public.model_price_history TO service_role;
ALTER TABLE public.model_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price history readable" ON public.model_price_history FOR SELECT USING (true);

-- marketplace sales ledger
CREATE TABLE IF NOT EXISTS public.model_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES public.ai_models(id) ON DELETE SET NULL,
  model_name text NOT NULL,
  contributor_id uuid REFERENCES public.contributor_profiles(id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'purchase',
  gross_amount numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0.2,
  currency text NOT NULL DEFAULT 'HKD',
  status text NOT NULL DEFAULT 'settled',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.model_transactions TO authenticated;
GRANT ALL ON public.model_transactions TO service_role;
ALTER TABLE public.model_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer or contributor can read sales" ON public.model_transactions FOR SELECT TO authenticated
  USING (
    buyer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.contributor_profiles cp WHERE cp.id = model_transactions.contributor_id AND cp.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_model_comments_model ON public.model_comments(model_id);
CREATE INDEX IF NOT EXISTS idx_model_likes_model ON public.model_likes(model_id);
CREATE INDEX IF NOT EXISTS idx_price_history_model ON public.model_price_history(model_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_tx_contributor ON public.model_transactions(contributor_id, created_at DESC);