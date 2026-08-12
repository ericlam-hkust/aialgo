DROP FUNCTION IF EXISTS public.current_plan_tier(uuid, text);

CREATE OR REPLACE FUNCTION public.my_plan_tier(_env text DEFAULT 'sandbox')
RETURNS public.plan_tier
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN s.price_id LIKE 'elite%' THEN 'elite'::public.plan_tier
      WHEN s.price_id LIKE 'pro%' THEN 'pro'::public.plan_tier
      ELSE 'free'::public.plan_tier
    END
    FROM public.subscriptions s
    WHERE s.user_id = auth.uid()
      AND s.environment = _env
      AND (
        (s.status IN ('active','trialing','past_due') AND (s.current_period_end IS NULL OR s.current_period_end > now()))
        OR (s.status = 'canceled' AND s.current_period_end > now())
      )
    ORDER BY CASE WHEN s.price_id LIKE 'elite%' THEN 2 ELSE 1 END DESC, s.created_at DESC
    LIMIT 1
  ), 'free'::public.plan_tier)
$$;
REVOKE EXECUTE ON FUNCTION public.my_plan_tier(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_plan_tier(text) TO authenticated, service_role;