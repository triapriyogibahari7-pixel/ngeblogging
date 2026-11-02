DO $migration$
BEGIN
 SET LOCAL lock_timeout='2s';
 CREATE FUNCTION public.domain_begin_site_production_checkout(p_user_id uuid,p_order_id text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' SET lock_timeout='2s' AS $guard$
 DECLARE o public.domain_purchase_orders%ROWTYPE;b public.domain_order_site_bindings%ROWTYPE;site_owner uuid;r jsonb;
 BEGIN
  IF current_user<>'service_role' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','SERVER_ONLY');END IF;
  IF p_user_id IS NULL OR p_order_id IS NULL OR p_order_id!~'^DOM-[a-f0-9]{40}$' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INVALID_CHECKOUT_REQUEST');END IF;
  SELECT * INTO o FROM public.domain_purchase_orders WHERE order_id=p_order_id AND user_id=p_user_id AND environment='production' FOR UPDATE;
  IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','DOMAIN_ORDER_NOT_FOUND');END IF;
  SELECT * INTO b FROM public.domain_order_site_bindings WHERE order_id=p_order_id;
  IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','ORDER_SITE_BINDING_REQUIRED');END IF;
  IF o.currency IS DISTINCT FROM 'IDR' OR b.user_id IS DISTINCT FROM p_user_id OR b.environment IS DISTINCT FROM 'production' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','ORDER_SITE_BINDING_UNVERIFIED');END IF;
  SELECT owner_id INTO site_owner FROM public.sites WHERE id=b.site_id FOR SHARE;
  IF NOT FOUND OR site_owner IS DISTINCT FROM p_user_id THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','SITE_OWNER_REQUIRED');END IF;
  r:=public.domain_begin_production_checkout(p_user_id,p_order_id);
  IF r->'ok'='true'::jsonb AND (r->>'order_id' IS DISTINCT FROM p_order_id OR r->>'environment' IS DISTINCT FROM 'production') THEN RAISE EXCEPTION 'Site checkout response contract differs; stop';END IF;
  RETURN r;
 END;
 $guard$;
 REVOKE ALL ON FUNCTION public.domain_begin_site_production_checkout(uuid,text) FROM PUBLIC,anon,authenticated;
 GRANT EXECUTE ON FUNCTION public.domain_begin_site_production_checkout(uuid,text) TO service_role;
END;
$migration$;
