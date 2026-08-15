-- 1. Purge and drop broker credentials
UPDATE public.broker_connections SET credentials_encrypted = NULL;
ALTER TABLE public.broker_connections DROP COLUMN IF EXISTS credentials_encrypted;
ALTER TABLE public.broker_connections
  ADD COLUMN IF NOT EXISTS linking_mode TEXT NOT NULL DEFAULT 'agent_only',
  ADD COLUMN IF NOT EXISTS auth_status TEXT NOT NULL DEFAULT 'needs_link',
  ADD COLUMN IF NOT EXISTS scope TEXT,
  ADD COLUMN IF NOT EXISTS token_ref TEXT;
UPDATE public.broker_connections SET auth_status = 'simulated' WHERE broker_name = 'paper';

UPDATE public.data_source_connections SET api_key_encrypted = NULL WHERE broker_connection_id IS NOT NULL;

-- 2. Drop the commission / performance-fee system
DROP TABLE IF EXISTS public.performance_fees CASCADE;
DROP TABLE IF EXISTS public.fee_batches CASCADE;
DROP TABLE IF EXISTS public.payout_batches CASCADE;
DROP TABLE IF EXISTS public.platform_revenue_events CASCADE;
DROP TABLE IF EXISTS public.strategy_watermarks CASCADE;
DROP TABLE IF EXISTS public.model_transactions CASCADE;

-- 3. Release registry
CREATE TABLE public.releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'engine',
  channel TEXT NOT NULL DEFAULT 'stable',
  title TEXT NOT NULL,
  changelog TEXT NOT NULL DEFAULT '',
  signature TEXT,
  artifact_hash TEXT,
  min_tier TEXT NOT NULL DEFAULT 'free',
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (version, kind)
);
GRANT SELECT ON public.releases TO authenticated;
GRANT ALL ON public.releases TO service_role;
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "releases readable by signed-in users" ON public.releases FOR SELECT TO authenticated USING (true);

-- 4. Deployments on user-owned infrastructure
CREATE TABLE public.deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  strategy_id uuid,
  machine_label TEXT NOT NULL,
  host_kind TEXT NOT NULL DEFAULT 'self_managed',
  package_version TEXT NOT NULL DEFAULT '0.0.0',
  pinned_version TEXT,
  channel TEXT NOT NULL DEFAULT 'stable',
  status TEXT NOT NULL DEFAULT 'pending',
  agent_token_hash TEXT,
  last_heartbeat_at TIMESTAMPTZ,
  last_known_good_version TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deployments TO authenticated;
GRANT ALL ON public.deployments TO service_role;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own deployments" ON public.deployments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.deployment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  deployment_id uuid REFERENCES public.deployments(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok',
  from_version TEXT,
  to_version TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.deployment_events TO authenticated;
GRANT ALL ON public.deployment_events TO service_role;
ALTER TABLE public.deployment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own deployment events" ON public.deployment_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own deployment events" ON public.deployment_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 5. Update policy
CREATE TABLE public.update_policies (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  infra_patches TEXT NOT NULL DEFAULT 'auto',
  parameter_changes TEXT NOT NULL DEFAULT 'notify',
  logic_changes TEXT NOT NULL DEFAULT 'approve',
  param_bound_pct NUMERIC NOT NULL DEFAULT 10,
  paper_run_first BOOLEAN NOT NULL DEFAULT true,
  canary_pct NUMERIC NOT NULL DEFAULT 25,
  auto_rollback BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.update_policies TO authenticated;
GRANT ALL ON public.update_policies TO service_role;
ALTER TABLE public.update_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own update policy" ON public.update_policies FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Approvals for logic changes
CREATE TABLE public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  deployment_id uuid REFERENCES public.deployments(id) ON DELETE CASCADE,
  release_id uuid REFERENCES public.releases(id) ON DELETE SET NULL,
  change_kind TEXT NOT NULL DEFAULT 'logic',
  summary TEXT NOT NULL DEFAULT '',
  diff TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.approvals TO authenticated;
GRANT ALL ON public.approvals TO service_role;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own approvals" ON public.approvals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Data-sync consent
CREATE TABLE public.sync_consents (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  scope TEXT NOT NULL DEFAULT 'positions_orders',
  version TEXT NOT NULL DEFAULT 'v1',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_consents TO authenticated;
GRANT ALL ON public.sync_consents TO service_role;
ALTER TABLE public.sync_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sync consent" ON public.sync_consents FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. Seed the release registry
INSERT INTO public.releases (version, kind, channel, title, changelog, min_tier, artifact_hash) VALUES
  ('1.4.0', 'engine', 'stable', 'Execution engine 1.4.0', 'Local order router hardening, faster indicator warm-up, OpenD reconnect backoff.', 'free', 'sha256-4f1c9a'),
  ('1.3.2', 'engine', 'stable', 'Execution engine 1.3.2', 'Security patch for the update agent TLS pinning.', 'free', 'sha256-91be07'),
  ('1.4.1', 'agent', 'beta', 'Update agent 1.4.1', 'Canary sizing and automatic rollback to last-known-good.', 'pro', 'sha256-2ad330');