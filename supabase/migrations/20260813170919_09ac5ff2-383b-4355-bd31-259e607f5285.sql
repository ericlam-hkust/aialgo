-- Rewrite can_view_model without model_access_grants
CREATE OR REPLACE FUNCTION public.can_view_model(_model_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.can_manage_model(_model_id, _user_id)
    OR EXISTS (
      SELECT 1 FROM public.ai_models m
      WHERE m.id = _model_id AND m.team_id IS NOT NULL AND public.is_team_member(m.team_id, _user_id)
    )
$function$;

DROP TABLE IF EXISTS public.user_data_addons CASCADE;
DROP TABLE IF EXISTS public.data_addons CASCADE;
DROP TABLE IF EXISTS public.referral_clicks CASCADE;
DROP TABLE IF EXISTS public.referral_partners CASCADE;
DROP TABLE IF EXISTS public.broker_referrals CASCADE;
DROP TABLE IF EXISTS public.promoted_listings CASCADE;
DROP TABLE IF EXISTS public.signal_api_usage CASCADE;
DROP TABLE IF EXISTS public.signal_events CASCADE;
DROP TABLE IF EXISTS public.gateway_status CASCADE;
DROP TABLE IF EXISTS public.compute_usage CASCADE;
DROP TABLE IF EXISTS public.contributor_billing CASCADE;
DROP TABLE IF EXISTS public.consumer_fee_settings CASCADE;
DROP TABLE IF EXISTS public.creator_payouts CASCADE;
DROP TABLE IF EXISTS public.marketplace_subscriptions CASCADE;
DROP TABLE IF EXISTS public.model_purchases CASCADE;
DROP TABLE IF EXISTS public.user_wallets CASCADE;
DROP TABLE IF EXISTS public.compliance_flags CASCADE;
DROP TABLE IF EXISTS public.market_data_intraday CASCADE;
DROP TABLE IF EXISTS public.model_appeals CASCADE;
DROP TABLE IF EXISTS public.model_access_grants CASCADE;

-- Drop enums no longer referenced by any remaining column
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['signal_plan','compute_plan','hosting_mode','model_access_role'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.udt_name = t AND c.table_schema = 'public'
    ) THEN
      EXECUTE format('DROP TYPE IF EXISTS public.%I', t);
    END IF;
  END LOOP;
END $$;