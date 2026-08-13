CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  link text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.model_activations
  ADD COLUMN IF NOT EXISTS pinned_version text,
  ADD COLUMN IF NOT EXISTS auto_upgrade boolean not null default true,
  ADD COLUMN IF NOT EXISTS kill_switch_drawdown_pct numeric not null default 15,
  ADD COLUMN IF NOT EXISTS peak_equity numeric not null default 0,
  ADD COLUMN IF NOT EXISTS paused_reason text,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz;

ALTER TABLE public.model_reviews
  ADD COLUMN IF NOT EXISTS verified boolean not null default false,
  ADD COLUMN IF NOT EXISTS days_active integer not null default 0;

ALTER TABLE public.contributor_profiles
  ADD COLUMN IF NOT EXISTS kyc_status text not null default 'not_started',
  ADD COLUMN IF NOT EXISTS tax_form_status text not null default 'not_started',
  ADD COLUMN IF NOT EXISTS tax_form_submitted_at timestamptz;