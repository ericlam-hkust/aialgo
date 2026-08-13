ALTER TABLE public.ai_models
  ADD COLUMN IF NOT EXISTS frequency_class public.frequency_class NOT NULL DEFAULT 'swing',
  ADD COLUMN IF NOT EXISTS gateway_secret_hash text,
  ADD COLUMN IF NOT EXISTS promoted boolean NOT NULL DEFAULT false;

UPDATE public.ai_models SET frequency_class = CASE
  WHEN timeframe IN ('5m','15m') AND hosting_mode = 'remote' THEN 'hft'
  WHEN timeframe IN ('5m','15m','30m','1h') THEN 'intraday'
  WHEN timeframe = '4h' THEN 'swing'
  ELSE 'position' END::public.frequency_class
WHERE frequency_class = 'swing';

CREATE TABLE IF NOT EXISTS public.broker_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker text NOT NULL,
  region text NOT NULL DEFAULT 'Global',
  blurb text NOT NULL,
  disclosure text NOT NULL,
  referral_url text NOT NULL,
  payout_note text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.broker_referrals TO anon, authenticated;
GRANT ALL ON public.broker_referrals TO service_role;
ALTER TABLE public.broker_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "broker_referrals_public_read" ON public.broker_referrals FOR SELECT USING (active);
CREATE POLICY "broker_referrals_admin_write" ON public.broker_referrals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_id uuid NOT NULL REFERENCES public.broker_referrals(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.referral_clicks TO authenticated;
GRANT ALL ON public.referral_clicks TO service_role;
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referral_clicks_own" ON public.referral_clicks FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "referral_clicks_insert" ON public.referral_clicks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.compliance_acks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL,
  reference text,
  version text NOT NULL DEFAULT 'v1',
  acknowledged_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.compliance_acks TO authenticated;
GRANT ALL ON public.compliance_acks TO service_role;
ALTER TABLE public.compliance_acks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compliance_acks_own" ON public.compliance_acks FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "compliance_acks_insert" ON public.compliance_acks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

INSERT INTO public.broker_referrals (broker, region, blurb, disclosure, referral_url, payout_note, sort_order) VALUES
  ('Interactive Brokers', 'Global', 'Low-cost global market access with a mature API — works with every hosted model on aiAlgo.', 'aiAlgo receives a referral fee if you open an account through this link. This does not affect your pricing or which models we show you.', 'https://www.interactivebrokers.com', 'Referral fee per funded account', 1),
  ('Futu / moomoo', 'Hong Kong', 'Popular HK broker with fast HKEX execution and an OpenAPI gateway.', 'aiAlgo receives a referral fee if you open an account through this link. This does not affect your pricing or which models we show you.', 'https://www.futuhk.com', 'Referral fee per funded account', 2),
  ('Tiger Brokers', 'Asia', 'HK and US market access with API trading suitable for intraday strategies.', 'aiAlgo receives a referral fee if you open an account through this link. This does not affect your pricing or which models we show you.', 'https://www.itiger.com', 'Referral fee per funded account', 3),
  ('Alpaca', 'US', 'Commission-free US equities API broker, well suited to high-frequency remote models.', 'aiAlgo receives a referral fee if you open an account through this link. This does not affect your pricing or which models we show you.', 'https://alpaca.markets', 'Revenue share on trading activity', 4)
ON CONFLICT DO NOTHING;