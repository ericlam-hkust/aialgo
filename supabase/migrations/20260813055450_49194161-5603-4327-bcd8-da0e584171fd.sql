-- ENUMS
CREATE TYPE public.team_role AS ENUM ('owner', 'maintainer', 'viewer');
CREATE TYPE public.model_visibility AS ENUM ('public', 'unlisted', 'private');
CREATE TYPE public.model_access_role AS ENUM ('viewer', 'beta_tester');

-- TEAMS
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  avatar_url text,
  website text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT SELECT ON public.teams TO anon;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.team_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  token_prefix text NOT NULL,
  token_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_api_tokens TO authenticated;
GRANT ALL ON public.team_api_tokens TO service_role;
ALTER TABLE public.team_api_tokens ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTIONS (security definer, avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.team_role_of(_team_id uuid, _user_id uuid)
RETURNS public.team_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.team_members WHERE team_id = _team_id AND user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(_team_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = _team_id AND user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.can_manage_team(_team_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = _team_id AND user_id = _user_id AND role IN ('owner', 'maintainer')
  ) OR public.has_role(_user_id, 'admin')
$$;

-- TEAM POLICIES
CREATE POLICY "teams public read" ON public.teams FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "teams insert own" ON public.teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "teams manage" ON public.teams FOR UPDATE TO authenticated
  USING (public.can_manage_team(id, auth.uid())) WITH CHECK (public.can_manage_team(id, auth.uid()));
CREATE POLICY "teams delete owner" ON public.teams FOR DELETE TO authenticated
  USING (public.team_role_of(id, auth.uid()) = 'owner' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "team members read" ON public.team_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_team_member(team_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "team members insert" ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_team(team_id, auth.uid())
    OR (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.created_by = auth.uid()))
  );
CREATE POLICY "team members update" ON public.team_members FOR UPDATE TO authenticated
  USING (public.can_manage_team(team_id, auth.uid())) WITH CHECK (public.can_manage_team(team_id, auth.uid()));
CREATE POLICY "team members delete" ON public.team_members FOR DELETE TO authenticated
  USING (public.can_manage_team(team_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "team tokens read" ON public.team_api_tokens FOR SELECT TO authenticated
  USING (public.is_team_member(team_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "team tokens write" ON public.team_api_tokens FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_team(team_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "team tokens update" ON public.team_api_tokens FOR UPDATE TO authenticated
  USING (public.can_manage_team(team_id, auth.uid())) WITH CHECK (public.can_manage_team(team_id, auth.uid()));
CREATE POLICY "team tokens delete" ON public.team_api_tokens FOR DELETE TO authenticated
  USING (public.can_manage_team(team_id, auth.uid()));

-- MODEL NAMESPACE + VISIBILITY
ALTER TABLE public.ai_models
  ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN visibility public.model_visibility NOT NULL DEFAULT 'public';

CREATE TABLE public.model_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.ai_models(id) ON DELETE CASCADE,
  user_id uuid,
  email text,
  role public.model_access_role NOT NULL DEFAULT 'viewer',
  note text,
  granted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX model_access_grants_model_user_idx ON public.model_access_grants (model_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX model_access_grants_model_email_idx ON public.model_access_grants (model_id, lower(email)) WHERE email IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_access_grants TO authenticated;
GRANT ALL ON public.model_access_grants TO service_role;
ALTER TABLE public.model_access_grants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_model(_model_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ai_models m
    WHERE m.id = _model_id
      AND (m.user_id = _user_id OR (m.team_id IS NOT NULL AND public.can_manage_team(m.team_id, _user_id)))
  ) OR public.has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.can_view_model(_model_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_manage_model(_model_id, _user_id)
    OR EXISTS (
      SELECT 1 FROM public.ai_models m
      WHERE m.id = _model_id AND m.team_id IS NOT NULL AND public.is_team_member(m.team_id, _user_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.model_access_grants g
      WHERE g.model_id = _model_id
        AND (g.user_id = _user_id
             OR lower(g.email) = lower((SELECT p.email FROM public.profiles p WHERE p.id = _user_id)))
    )
$$;

CREATE POLICY "grants read" ON public.model_access_grants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_model(model_id, auth.uid()));
CREATE POLICY "grants insert" ON public.model_access_grants FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_model(model_id, auth.uid()) AND granted_by = auth.uid());
CREATE POLICY "grants update" ON public.model_access_grants FOR UPDATE TO authenticated
  USING (public.can_manage_model(model_id, auth.uid())) WITH CHECK (public.can_manage_model(model_id, auth.uid()));
CREATE POLICY "grants delete" ON public.model_access_grants FOR DELETE TO authenticated
  USING (public.can_manage_model(model_id, auth.uid()));

-- MODEL VISIBILITY POLICIES
DROP POLICY IF EXISTS "models public read live" ON public.ai_models;
CREATE POLICY "models public read live" ON public.ai_models FOR SELECT TO anon, authenticated
  USING (
    status = ANY (ARRAY['live'::model_listing_status, 'paper_trading'::model_listing_status])
    AND visibility <> 'private'
  );
CREATE POLICY "models team read" ON public.ai_models FOR SELECT TO authenticated
  USING (team_id IS NOT NULL AND public.is_team_member(team_id, auth.uid()));
CREATE POLICY "models shared read" ON public.ai_models FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.model_access_grants g
    WHERE g.model_id = id
      AND (g.user_id = auth.uid()
           OR lower(g.email) = lower((SELECT p.email FROM public.profiles p WHERE p.id = auth.uid())))
  ));
CREATE POLICY "models team manage" ON public.ai_models FOR UPDATE TO authenticated
  USING (team_id IS NOT NULL AND public.can_manage_team(team_id, auth.uid()))
  WITH CHECK (team_id IS NOT NULL AND public.can_manage_team(team_id, auth.uid()));

-- API CHANGELOG + STATUS
CREATE TABLE public.api_changelog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'added',
  breaking boolean NOT NULL DEFAULT false,
  deprecation_notice text,
  sunset_on date,
  released_at date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.api_changelog TO anon, authenticated;
GRANT ALL ON public.api_changelog TO service_role;
ALTER TABLE public.api_changelog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "changelog public read" ON public.api_changelog FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "changelog admin write" ON public.api_changelog FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.api_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  component text NOT NULL DEFAULT 'api',
  impact text NOT NULL DEFAULT 'minor',
  status text NOT NULL DEFAULT 'resolved',
  summary text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  uptime_pct numeric NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.api_incidents TO anon, authenticated;
GRANT ALL ON public.api_incidents TO service_role;
ALTER TABLE public.api_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incidents public read" ON public.api_incidents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "incidents admin write" ON public.api_incidents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER teams_touch_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.api_changelog (version, title, body, kind, breaking, deprecation_notice, sunset_on, released_at) VALUES
  ('v1.4', 'Team-scoped API tokens', 'Tokens can now be issued at the team level with scopes: models:read, models:write, signals:read, executions:write, backtests:run.', 'added', false, NULL, NULL, '2026-08-10'),
  ('v1.3', 'Model visibility field', 'GET /v1/models now returns "visibility" (public, unlisted, private). Private models require a token with access granted.', 'added', false, NULL, NULL, '2026-07-02'),
  ('v1.2', 'Signal payload confidence is now required', 'The confidence field on signal responses is always present and normalised to 0-1.', 'changed', false, 'Nullable confidence responses are deprecated and stop being served after the sunset date.', '2026-11-01', '2026-05-18'),
  ('v1.1', 'Backtest job polling endpoint', 'Added GET /v1/backtests/{id} returning stage, progress and results.', 'added', false, NULL, NULL, '2026-03-11'),
  ('v1.0', 'Stable /v1 API', 'First stable release of the /v1 API under the stability policy.', 'added', false, NULL, NULL, '2026-01-15');

INSERT INTO public.api_incidents (title, component, impact, status, summary, started_at, resolved_at, uptime_pct) VALUES
  ('Elevated latency on /v1/signals', 'api', 'minor', 'resolved', 'A cache node degraded and signal reads saw p95 latency above 2s for 34 minutes. Traffic was shifted and latency recovered.', '2026-08-04 02:10+00', '2026-08-04 02:44+00', 99.95),
  ('Backtest queue backlog', 'backtests', 'major', 'resolved', 'A surge of sandbox runs delayed validation jobs by up to 40 minutes. Queue capacity has been increased.', '2026-06-21 11:05+00', '2026-06-21 12:31+00', 99.82),
  ('Broker sync errors for one provider', 'brokers', 'minor', 'resolved', 'An upstream broker gateway returned intermittent 502s. Retries were added and the provider recovered.', '2026-05-09 07:40+00', '2026-05-09 08:15+00', 99.98);