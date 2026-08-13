ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Hong_Kong',
  ADD COLUMN IF NOT EXISTS base_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS notify_fills boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_risk boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_payouts boolean NOT NULL DEFAULT true;