DO $migration$
BEGIN
 SET LOCAL lock_timeout='2s';
 CREATE TABLE public.domain_installation_jobs(
  order_id text PRIMARY KEY REFERENCES public.domain_purchase_orders(order_id),
  claim_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  site_id uuid NOT NULL,
  quote_id uuid NOT NULL REFERENCES public.domain_sale_quotes(id),
  domain text NOT NULL UNIQUE CHECK(domain=lower(domain) AND length(domain) BETWEEN 4 AND 127),
  registration_attempt_id uuid NOT NULL,
  registration_evidence_sha256 text NOT NULL CHECK(registration_evidence_sha256~'^[a-f0-9]{64}$'),
  environment text NOT NULL DEFAULT 'production' CHECK(environment='production'),
  state text NOT NULL DEFAULT 'claimed' CHECK(state IN ('claimed','review_required','installed')),
  claimed_at timestamptz NOT NULL DEFAULT clock_timestamp()
 );
 ALTER TABLE public.domain_installation_jobs ENABLE ROW LEVEL SECURITY;
 REVOKE ALL ON public.domain_installation_jobs FROM PUBLIC,anon,authenticated,service_role;
 GRANT SELECT,INSERT ON public.domain_installation_jobs TO service_role;
 CREATE FUNCTION public.domain_claim_paid_domain_installation(p_order_id text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' SET lock_timeout='2s' AS $claim$
 DECLARE o public.domain_purchase_orders%ROWTYPE;q public.domain_sale_quotes%ROWTYPE;b public.domain_order_site_bindings%ROWTYPE;i public.domain_installation_jobs%ROWTYPE;r record;v_domain text;v_ref text;site_owner uuid;mapping_count bigint;is_new boolean:=false;
 BEGIN
  IF current_user<>'service_role' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','SERVER_ONLY');END IF;
  IF p_order_id IS NULL OR p_order_id!~'^DOM-[a-f0-9]{40}$' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INVALID_INSTALLATION_ORDER');END IF;
  SELECT z.domain INTO v_domain FROM public.domain_purchase_orders x JOIN public.domain_sale_quotes z ON z.id=x.quote_id WHERE x.order_id=p_order_id AND x.environment='production';
  IF NOT FOUND OR v_domain IS NULL THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INSTALLATION_ORDER_UNVERIFIED');END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('production-domain-installation:'||v_domain,0::bigint));
  SELECT * INTO o FROM public.domain_purchase_orders WHERE order_id=p_order_id AND environment='production' FOR UPDATE;
  IF NOT FOUND OR o.user_id IS NULL OR o.currency IS DISTINCT FROM 'IDR' OR o.payment_state IS DISTINCT FROM 'paid' OR o.registration_state IS DISTINCT FROM 'registered' OR o.review_reason IS NOT NULL OR o.paid_at IS NULL OR NOT isfinite(o.paid_at) OR o.registered_at IS NULL OR NOT isfinite(o.registered_at) OR o.paid_at>clock_timestamp()+interval '5 minutes' OR o.registered_at>clock_timestamp()+interval '5 minutes' OR o.midtrans_transaction_id IS NULL OR o.midtrans_transaction_id!~'^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INSTALLATION_CONFIRMATIONS_REQUIRED');END IF;
  SELECT * INTO q FROM public.domain_sale_quotes WHERE id=o.quote_id;
  IF NOT FOUND OR q.user_id IS DISTINCT FROM o.user_id OR q.environment IS DISTINCT FROM 'production' OR q.provider_id IS DISTINCT FROM 'cloudflare' OR q.operation IS DISTINCT FROM 'registration' OR q.years IS DISTINCT FROM 1 OR q.currency IS DISTINCT FROM 'IDR' OR q.sale_price_idr IS DISTINCT FROM o.amount_idr OR q.domain IS DISTINCT FROM v_domain OR q.domain='ngeblogging.com' OR q.domain!~'^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?[.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INSTALLATION_QUOTE_UNVERIFIED');END IF;
  SELECT order_id,user_id,quote_id,domain,amount_idr,state,provider_state,attempt_id,evidence_sha256,provider_resource_ref,post_started_at,provider_updated_at INTO r FROM public.domain_registration_jobs WHERE order_id=p_order_id FOR SHARE;
  v_ref:='/accounts/095e57b46e7ba7f6b188480d9e4e5fe7/registrar/registrations/'||q.domain;
  IF NOT FOUND OR r.user_id IS DISTINCT FROM o.user_id OR r.quote_id IS DISTINCT FROM o.quote_id OR r.domain IS DISTINCT FROM q.domain OR r.amount_idr IS DISTINCT FROM o.amount_idr OR r.state IS DISTINCT FROM 'succeeded' OR r.provider_state IS DISTINCT FROM 'succeeded' OR r.attempt_id IS NULL OR r.evidence_sha256 IS NULL OR r.evidence_sha256!~'^[a-f0-9]{64}$' OR r.provider_resource_ref IS DISTINCT FROM v_ref OR o.registrar_domain_ref IS DISTINCT FROM v_ref OR r.post_started_at IS NULL OR NOT isfinite(r.post_started_at) OR r.provider_updated_at IS NULL OR NOT isfinite(r.provider_updated_at) OR r.post_started_at>clock_timestamp()+interval '5 minutes' OR r.provider_updated_at>clock_timestamp()+interval '5 minutes' OR o.registered_at<r.post_started_at-interval '5 minutes' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INSTALLATION_REGISTRATION_EVIDENCE_REQUIRED');END IF;
  SELECT * INTO b FROM public.domain_order_site_bindings WHERE order_id=p_order_id;
  IF NOT FOUND OR b.user_id IS DISTINCT FROM o.user_id OR b.environment IS DISTINCT FROM 'production' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INSTALLATION_SITE_BINDING_REQUIRED');END IF;
  SELECT owner_id INTO site_owner FROM public.sites WHERE id=b.site_id FOR SHARE;
  IF NOT FOUND OR site_owner IS DISTINCT FROM o.user_id THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INSTALLATION_SITE_OWNER_REQUIRED');END IF;
  PERFORM 1 FROM public.domain_payment_events e WHERE e.order_id=o.order_id AND e.environment='production' AND e.provider='midtrans' AND e.currency='IDR' AND e.amount_idr=o.amount_idr AND e.transaction_id=o.midtrans_transaction_id AND e.verified_state='paid';
  IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INSTALLATION_PAYMENT_EVIDENCE_REQUIRED');END IF;
  SELECT count(*) INTO mapping_count FROM public.site_domains WHERE hostname=q.domain;
  IF mapping_count>1 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INSTALLATION_DOMAIN_STATE_UNVERIFIED');END IF;
  IF EXISTS(SELECT 1 FROM public.site_domains WHERE hostname=q.domain AND (site_id IS DISTINCT FROM b.site_id OR provider IS DISTINCT FROM 'cloudflare-full-zone')) OR EXISTS(SELECT 1 FROM public.domain_installation_jobs WHERE domain=q.domain AND order_id<>p_order_id) THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INSTALLATION_DOMAIN_CONFLICT');END IF;
  SELECT * INTO i FROM public.domain_installation_jobs WHERE order_id=p_order_id;
  IF FOUND THEN
   IF i.user_id IS DISTINCT FROM o.user_id OR i.site_id IS DISTINCT FROM b.site_id OR i.quote_id IS DISTINCT FROM q.id OR i.domain IS DISTINCT FROM q.domain OR i.registration_attempt_id IS DISTINCT FROM r.attempt_id OR i.registration_evidence_sha256 IS DISTINCT FROM r.evidence_sha256 OR i.environment IS DISTINCT FROM 'production' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INSTALLATION_CLAIM_CONFLICT');END IF;
  ELSE
   INSERT INTO public.domain_installation_jobs(order_id,user_id,site_id,quote_id,domain,registration_attempt_id,registration_evidence_sha256) VALUES(o.order_id,o.user_id,b.site_id,q.id,q.domain,r.attempt_id,r.evidence_sha256) RETURNING * INTO i;
   is_new:=true;
  END IF;
  RETURN pg_catalog.jsonb_build_object('ok',true,'order_id',i.order_id,'claim_id',i.claim_id,'user_id',i.user_id,'site_id',i.site_id,'domain',i.domain,'environment','production','registration_attempt_id',i.registration_attempt_id,'registration_evidence_sha256',i.registration_evidence_sha256,'state',i.state,'claim_recorded',true,'new_claim',is_new,'reconciliation_only',NOT is_new,'provider_mutation_allowed',false,'installation_action_taken',false,'installation_confirmed',false);
 END;
 $claim$;
 REVOKE ALL ON FUNCTION public.domain_claim_paid_domain_installation(text) FROM PUBLIC,anon,authenticated;
 GRANT EXECUTE ON FUNCTION public.domain_claim_paid_domain_installation(text) TO service_role;
 COMMENT ON TABLE public.domain_installation_jobs IS 'Private persistent installation reservation. A claim is not provider authorization or installation success. No automatic expiry, release or new claim after uncertain effects. site_id is a historical UUID snapshot; every operation must revalidate the current owner. Existing manual domain writers do not automatically participate in this claim protocol. No provider calls occur in this RPC.';
END;
$migration$;
