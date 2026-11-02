DO $migration$
BEGIN
 SET LOCAL lock_timeout='2s';
 CREATE TABLE public.domain_order_site_bindings(
  order_id text PRIMARY KEY REFERENCES public.domain_purchase_orders(order_id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  site_id uuid NOT NULL,
  environment text NOT NULL DEFAULT 'production' CHECK(environment='production'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
 );
 ALTER TABLE public.domain_order_site_bindings ENABLE ROW LEVEL SECURITY;
 REVOKE ALL ON public.domain_order_site_bindings FROM PUBLIC,anon,authenticated,service_role;
 GRANT SELECT,INSERT ON public.domain_order_site_bindings TO service_role;
 CREATE FUNCTION public.domain_bind_production_order_site(p_user_id uuid,p_order_id text,p_site_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' SET lock_timeout='2s' AS $bind$
 DECLARE o public.domain_purchase_orders%ROWTYPE;b public.domain_order_site_bindings%ROWTYPE;site_owner uuid;
 BEGIN
  IF current_user<>'service_role' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','SERVER_ONLY');END IF;
  IF p_user_id IS NULL OR p_site_id IS NULL OR p_order_id IS NULL OR p_order_id!~'^DOM-[a-f0-9]{40}$' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INVALID_ORDER_SITE_BINDING');END IF;
  SELECT * INTO o FROM public.domain_purchase_orders WHERE order_id=p_order_id AND user_id=p_user_id AND environment='production' FOR UPDATE;
  IF NOT FOUND OR o.currency IS DISTINCT FROM 'IDR' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','DOMAIN_ORDER_NOT_FOUND');END IF;
  SELECT owner_id INTO site_owner FROM public.sites WHERE id=p_site_id FOR SHARE;
  IF NOT FOUND OR site_owner IS DISTINCT FROM p_user_id THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','SITE_OWNER_REQUIRED');END IF;
  SELECT * INTO b FROM public.domain_order_site_bindings WHERE order_id=p_order_id;
  IF FOUND THEN
   IF b.user_id IS DISTINCT FROM p_user_id OR b.site_id IS DISTINCT FROM p_site_id OR b.environment IS DISTINCT FROM 'production' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','ORDER_SITE_BINDING_CONFLICT');END IF;
   RETURN pg_catalog.jsonb_build_object('ok',true,'order_id',p_order_id,'user_id',p_user_id,'site_id',p_site_id,'environment','production','site_bound',true,'binding_reused',true,'checkout_created',false,'registration_action_taken',false);
  END IF;
  IF o.payment_state IS DISTINCT FROM 'pending' OR o.registration_state IS DISTINCT FROM 'not_started' OR o.review_reason IS NOT NULL OR o.created_at IS NULL OR o.created_at>clock_timestamp() OR o.created_at+interval '15 minutes'<=clock_timestamp() OR EXISTS(SELECT 1 FROM public.domain_checkout_sessions WHERE order_id=p_order_id) THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','ORDER_SITE_BINDING_LOCKED');END IF;
  INSERT INTO public.domain_order_site_bindings(order_id,user_id,site_id,environment) VALUES(p_order_id,p_user_id,p_site_id,'production');
  RETURN pg_catalog.jsonb_build_object('ok',true,'order_id',p_order_id,'user_id',p_user_id,'site_id',p_site_id,'environment','production','site_bound',true,'binding_reused',false,'checkout_created',false,'registration_action_taken',false);
 END;
 $bind$;
 REVOKE ALL ON FUNCTION public.domain_bind_production_order_site(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
 GRANT EXECUTE ON FUNCTION public.domain_bind_production_order_site(uuid,text,uuid) TO service_role;
 COMMENT ON TABLE public.domain_order_site_bindings IS 'Private immutable order destination snapshot. Backend must derive p_user_id from a verified session. No authenticated client access. site_id is intentionally not a foreign key so site deletion does not delete commerce history or gain a new deletion restriction. Every future installation must revalidate site existence and ownership. This table does not authorize payment, registration or installation.';
END;
$migration$;
