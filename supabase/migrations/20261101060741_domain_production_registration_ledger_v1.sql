DO $migration$
BEGIN
 SET LOCAL lock_timeout='2s';
 CREATE TABLE public.domain_registration_jobs(
  order_id text PRIMARY KEY REFERENCES public.domain_purchase_orders(order_id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  quote_id uuid NOT NULL REFERENCES public.domain_sale_quotes(id),
  domain text NOT NULL CHECK(domain=lower(domain) AND length(domain) BETWEEN 4 AND 253),
  amount_idr bigint NOT NULL CHECK(amount_idr BETWEEN 1 AND 1000000000000),
  expected_cost_usd numeric NOT NULL CHECK(expected_cost_usd>0 AND expected_cost_usd<=1000000000000 AND expected_cost_usd=round(expected_cost_usd,6)),
  payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object' AND octet_length(payload::text)<=16384),
  payload_sha256 text NOT NULL CHECK(payload_sha256~'^[a-f0-9]{64}$'),
  schema_sha256 text NOT NULL CHECK(schema_sha256~'^[a-f0-9]{64}$'),
  terms_version text NOT NULL CHECK(length(terms_version) BETWEEN 1 AND 100),
  consent_at timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'prepared' CHECK(state IN ('prepared','submitted','processing','blocked','action_required','succeeded','failed','review_required','conflict')),
  attempt_id uuid UNIQUE,post_started_at timestamptz,preflight_checked_at timestamptz,live_cost_usd numeric,
  provider_state text,provider_updated_at timestamptz,provider_resource_ref text CHECK(length(provider_resource_ref)<=1024),
  evidence_sha256 text CHECK(evidence_sha256~'^[a-f0-9]{64}$'),
  observation_count integer NOT NULL DEFAULT 0 CHECK(observation_count BETWEEN 0 AND 13),
  next_check_at timestamptz,review_code text CHECK(length(review_code)<=100),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK(state<>'prepared' OR (attempt_id IS NULL AND post_started_at IS NULL)),
  CHECK(state NOT IN ('submitted','processing','blocked','action_required','succeeded','failed') OR (attempt_id IS NOT NULL AND post_started_at IS NOT NULL))
 );
 CREATE UNIQUE INDEX domain_registration_jobs_domain_hold ON public.domain_registration_jobs(domain) WHERE state NOT IN ('prepared','conflict');
 CREATE INDEX domain_registration_jobs_due ON public.domain_registration_jobs(next_check_at) WHERE next_check_at IS NOT NULL;
 ALTER TABLE public.domain_registration_jobs ENABLE ROW LEVEL SECURITY;
 REVOKE ALL ON public.domain_registration_jobs FROM PUBLIC,anon,authenticated;
 GRANT SELECT,INSERT,UPDATE ON public.domain_registration_jobs TO service_role;
 CREATE FUNCTION public.domain_save_production_registration_details(p_user_id uuid,p_order_id text,p_payload jsonb,p_schema_sha256 text,p_terms_version text,p_accepted boolean)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' SET lock_timeout='2s' AS $save$
 DECLARE o public.domain_purchase_orders%ROWTYPE;q public.domain_sale_quotes%ROWTYPE;j public.domain_registration_jobs%ROWTYPE;v_domain text;k text;v text;c jsonb;cost numeric;
 BEGIN
  IF current_user<>'service_role' THEN RETURN jsonb_build_object('ok',false,'error','SERVER_ONLY'); END IF;
  IF p_user_id IS NULL OR p_order_id IS NULL OR p_order_id!~'^DOM-[a-f0-9]{40}$' OR p_accepted IS DISTINCT FROM true OR p_schema_sha256 IS NULL OR p_schema_sha256!~'^[a-f0-9]{64}$' OR p_terms_version IS NULL OR length(p_terms_version) NOT BETWEEN 1 AND 100 OR p_terms_version~'[[:cntrl:]]' OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' OR octet_length(p_payload::text)>16384 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_REGISTRANT_DETAILS'); END IF;
  SELECT z.domain INTO v_domain FROM public.domain_purchase_orders x JOIN public.domain_sale_quotes z ON z.id=x.quote_id WHERE x.order_id=p_order_id AND x.user_id=p_user_id AND x.environment='production';
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','DOMAIN_ORDER_NOT_FOUND'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('production-domain-registration:'||v_domain,0::bigint));
  SELECT * INTO o FROM public.domain_purchase_orders WHERE order_id=p_order_id AND user_id=p_user_id AND environment='production' FOR UPDATE;
  IF o.payment_state<>'pending' OR o.registration_state<>'not_started' OR o.review_reason IS NOT NULL OR o.created_at+interval '15 minutes'<=clock_timestamp() OR EXISTS(SELECT 1 FROM public.domain_checkout_sessions WHERE order_id=p_order_id) THEN RETURN jsonb_build_object('ok',false,'error','REGISTRATION_DETAILS_LOCKED'); END IF;
  SELECT * INTO q FROM public.domain_sale_quotes WHERE id=o.quote_id AND user_id=p_user_id AND environment='production';
  IF NOT FOUND OR q.domain IS DISTINCT FROM v_domain OR q.provider_id<>'cloudflare' OR q.years<>1 OR q.operation<>'registration' OR q.fx_expires_at<=clock_timestamp() OR q.cost_basis->>'provider_price_currency' IS DISTINCT FROM 'USD' OR COALESCE(q.cost_basis->>'provider_price_amount','')!~'^[0-9]{1,12}([.][0-9]{1,6})?$' THEN RETURN jsonb_build_object('ok',false,'error','REGISTRATION_QUOTE_UNVERIFIED'); END IF;
  cost:=(q.cost_basis->>'provider_price_amount')::numeric;IF cost<=0 OR cost>1000000000000 THEN RETURN jsonb_build_object('ok',false,'error','REGISTRATION_QUOTE_UNVERIFIED'); END IF;
  IF p_payload->>'domain_name' IS DISTINCT FROM q.domain OR p_payload->'years' IS DISTINCT FROM '1'::jsonb OR p_payload->'auto_renew' IS DISTINCT FROM 'false'::jsonb OR p_payload->>'privacy_mode' IS NULL OR p_payload->>'privacy_mode' NOT IN ('off','redaction') OR jsonb_typeof(p_payload#>'{contacts,registrant}') IS DISTINCT FROM 'object' THEN RETURN jsonb_build_object('ok',false,'error','INVALID_REGISTRANT_DETAILS'); END IF;
  c:=p_payload#>'{contacts,registrant}';
  FOREACH k IN ARRAY ARRAY['email','phone'] LOOP v:=c->>k;IF jsonb_typeof(c->k) IS DISTINCT FROM 'string' OR length(btrim(COALESCE(v,''))) NOT BETWEEN 1 AND 254 OR v~'[[:cntrl:]]' THEN RETURN jsonb_build_object('ok',false,'error','INVALID_REGISTRANT_DETAILS'); END IF;END LOOP;
  IF c->>'email'!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' OR c->>'phone'!~'^\+[0-9]{1,3}[.][0-9]{4,15}$' OR length(regexp_replace(c->>'phone','[^0-9]','','g'))>15 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_REGISTRANT_DETAILS'); END IF;
  IF jsonb_typeof(c#>'{postal_info,name}') IS DISTINCT FROM 'string' OR length(btrim(COALESCE(c#>>'{postal_info,name}',''))) NOT BETWEEN 1 AND 300 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_REGISTRANT_DETAILS'); END IF;
  FOREACH k IN ARRAY ARRAY['street','city','state','postal_code','country_code'] LOOP v:=c#>>ARRAY['postal_info','address',k];IF jsonb_typeof(c#>ARRAY['postal_info','address',k]) IS DISTINCT FROM 'string' OR length(btrim(COALESCE(v,''))) NOT BETWEEN 1 AND 500 OR v~'[[:cntrl:]]' THEN RETURN jsonb_build_object('ok',false,'error','INVALID_REGISTRANT_DETAILS'); END IF;END LOOP;
  IF c#>>'{postal_info,address,country_code}'!~'^[A-Z]{2}$' THEN RETURN jsonb_build_object('ok',false,'error','INVALID_REGISTRANT_DETAILS'); END IF;
  IF EXISTS(SELECT 1 FROM public.domain_registration_jobs r JOIN public.domain_purchase_orders x ON x.order_id=r.order_id WHERE r.domain=q.domain AND r.order_id<>p_order_id AND (r.state NOT IN ('prepared','conflict') OR (r.state='prepared' AND x.payment_state NOT IN ('failed','expired','cancelled','refunded') AND (x.payment_state<>'pending' OR x.created_at+interval '15 minutes'>clock_timestamp() OR EXISTS(SELECT 1 FROM public.domain_checkout_sessions s WHERE s.order_id=x.order_id))))) THEN RETURN jsonb_build_object('ok',false,'error','DOMAIN_REGISTRATION_RESERVED'); END IF;
  INSERT INTO public.domain_registration_jobs(order_id,user_id,quote_id,domain,amount_idr,expected_cost_usd,payload,payload_sha256,schema_sha256,terms_version,consent_at) VALUES(o.order_id,o.user_id,o.quote_id,q.domain,o.amount_idr,cost,p_payload,encode(sha256(convert_to(p_payload::text,'UTF8')),'hex'),p_schema_sha256,p_terms_version,clock_timestamp()) ON CONFLICT(order_id) DO UPDATE SET payload=EXCLUDED.payload,payload_sha256=EXCLUDED.payload_sha256,schema_sha256=EXCLUDED.schema_sha256,terms_version=EXCLUDED.terms_version,consent_at=EXCLUDED.consent_at,updated_at=clock_timestamp() WHERE domain_registration_jobs.state='prepared' RETURNING * INTO j;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','REGISTRATION_DETAILS_LOCKED'); END IF;
  RETURN jsonb_build_object('ok',true,'order_id',j.order_id,'environment','production','state',j.state,'details_saved',true,'registration_action_taken',false);
 END;$save$;
 CREATE FUNCTION public.domain_claim_production_registration(p_order_id text,p_schema_sha256 text,p_live_cost_usd numeric,p_checked_at timestamptz)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' SET lock_timeout='2s' AS $claim$
 DECLARE o public.domain_purchase_orders%ROWTYPE;j public.domain_registration_jobs%ROWTYPE;v_domain text;
 BEGIN
  IF current_user<>'service_role' THEN RETURN jsonb_build_object('ok',false,'error','SERVER_ONLY'); END IF;
  IF p_order_id IS NULL OR p_order_id!~'^DOM-[a-f0-9]{40}$' THEN RETURN jsonb_build_object('ok',false,'error','INVALID_REGISTRATION_REQUEST'); END IF;
  SELECT domain INTO v_domain FROM public.domain_registration_jobs WHERE order_id=p_order_id;IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','REGISTRANT_DETAILS_REQUIRED'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('production-domain-registration:'||v_domain,0::bigint));
  SELECT * INTO o FROM public.domain_purchase_orders WHERE order_id=p_order_id AND environment='production' FOR UPDATE;
  SELECT * INTO j FROM public.domain_registration_jobs WHERE order_id=p_order_id FOR UPDATE;
  IF o.order_id IS NULL OR j.user_id IS DISTINCT FROM o.user_id OR j.quote_id IS DISTINCT FROM o.quote_id OR j.amount_idr IS DISTINCT FROM o.amount_idr OR o.currency<>'IDR' THEN RETURN jsonb_build_object('ok',false,'error','REGISTRATION_ORDER_MISMATCH'); END IF;
  IF j.state<>'prepared' THEN RETURN jsonb_build_object('ok',true,'order_id',p_order_id,'state',j.state,'attempt_id',j.attempt_id,'action',CASE WHEN j.state='succeeded' THEN 'done' ELSE 'reconcile' END,'new_registration_allowed',false); END IF;
  IF o.payment_state<>'paid' OR o.paid_at IS NULL OR o.midtrans_transaction_id IS NULL OR o.registration_state<>'not_started' OR o.review_reason IS NOT NULL OR NOT EXISTS(SELECT 1 FROM public.domain_payment_events e WHERE e.order_id=o.order_id AND e.environment='production' AND e.provider='midtrans' AND e.currency='IDR' AND e.amount_idr=o.amount_idr AND e.transaction_id=o.midtrans_transaction_id AND e.verified_state='paid') THEN RETURN jsonb_build_object('ok',false,'error','VERIFIED_PAYMENT_REQUIRED'); END IF;
  IF p_schema_sha256 IS DISTINCT FROM j.schema_sha256 OR p_live_cost_usd IS NULL OR p_live_cost_usd<=0 OR p_live_cost_usd>j.expected_cost_usd OR p_live_cost_usd<>round(p_live_cost_usd,6) OR p_checked_at IS NULL OR NOT isfinite(p_checked_at) OR p_checked_at>clock_timestamp() OR p_checked_at<clock_timestamp()-interval '30 seconds' THEN RETURN jsonb_build_object('ok',false,'error','REGISTRATION_PREFLIGHT_UNVERIFIED'); END IF;
  IF EXISTS(SELECT 1 FROM public.domain_registration_jobs r WHERE r.domain=j.domain AND r.order_id<>j.order_id AND r.state NOT IN ('prepared','conflict')) THEN UPDATE public.domain_registration_jobs SET state='conflict',review_code='domain_conflict',updated_at=clock_timestamp() WHERE order_id=p_order_id;UPDATE public.domain_purchase_orders SET registration_state='review_required',review_reason=COALESCE(review_reason,'registration:domain_conflict'),updated_at=clock_timestamp() WHERE order_id=p_order_id;RETURN jsonb_build_object('ok',false,'error','DOMAIN_REGISTRATION_CONFLICT'); END IF;
  UPDATE public.domain_registration_jobs SET state='submitted',attempt_id=gen_random_uuid(),post_started_at=clock_timestamp(),preflight_checked_at=p_checked_at,live_cost_usd=p_live_cost_usd,updated_at=clock_timestamp() WHERE order_id=p_order_id RETURNING * INTO j;
  UPDATE public.domain_purchase_orders SET registration_state='processing',updated_at=clock_timestamp() WHERE order_id=p_order_id;
  RETURN jsonb_build_object('ok',true,'order_id',p_order_id,'environment','production','action','create','new_registration_allowed',true,'attempt_id',j.attempt_id,'domain',j.domain,'payload',j.payload,'payload_sha256',j.payload_sha256,'post_started_at',j.post_started_at);
 END;$claim$;
 CREATE FUNCTION public.domain_observe_production_registration(p_order_id text,p_attempt_id uuid,p_provider_state text,p_resource_ref text,p_registered_at timestamptz,p_observed_at timestamptz,p_evidence_sha256 text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' SET lock_timeout='2s' AS $observe$
 DECLARE o public.domain_purchase_orders%ROWTYPE;j public.domain_registration_jobs%ROWTYPE;v_domain text;v_state text;v_reason text;v_ref text;
 BEGIN
  IF current_user<>'service_role' THEN RETURN jsonb_build_object('ok',false,'error','SERVER_ONLY'); END IF;
  IF p_order_id IS NULL OR p_order_id!~'^DOM-[a-f0-9]{40}$' OR p_provider_state IS NULL OR p_provider_state NOT IN ('pending','in_progress','blocked','action_required','succeeded','failed','unknown') OR p_observed_at IS NULL OR NOT isfinite(p_observed_at) OR p_observed_at>clock_timestamp()+interval '5 minutes' OR p_evidence_sha256 IS NULL OR p_evidence_sha256!~'^[a-f0-9]{64}$' THEN RETURN jsonb_build_object('ok',false,'error','INVALID_REGISTRATION_OBSERVATION'); END IF;
  SELECT domain INTO v_domain FROM public.domain_registration_jobs WHERE order_id=p_order_id;IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','REGISTRATION_JOB_NOT_FOUND'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('production-domain-registration:'||v_domain,0::bigint));
  SELECT * INTO o FROM public.domain_purchase_orders WHERE order_id=p_order_id AND environment='production' FOR UPDATE;SELECT * INTO j FROM public.domain_registration_jobs WHERE order_id=p_order_id FOR UPDATE;
  IF o.order_id IS NULL OR p_attempt_id IS DISTINCT FROM j.attempt_id OR (j.attempt_id IS NULL AND p_provider_state<>'unknown') THEN RETURN jsonb_build_object('ok',false,'error','REGISTRATION_ATTEMPT_CONFLICT'); END IF;
  v_ref:='/accounts/095e57b46e7ba7f6b188480d9e4e5fe7/registrar/registrations/'||j.domain;
  IF p_resource_ref IS NOT NULL AND p_resource_ref<>v_ref THEN RETURN jsonb_build_object('ok',false,'error','REGISTRAR_RESOURCE_MISMATCH'); END IF;
  IF j.state='succeeded' THEN RETURN jsonb_build_object('ok',true,'order_id',p_order_id,'state',j.state,'registration_confirmed',o.registration_state='registered','registration_action_taken',false); END IF;
  IF j.state='failed' AND p_provider_state NOT IN ('failed','unknown') THEN RETURN jsonb_build_object('ok',false,'error','REGISTRATION_TERMINAL_CONFLICT'); END IF;
  IF p_provider_state<>'unknown' AND j.provider_updated_at IS NOT NULL AND p_observed_at<j.provider_updated_at THEN RETURN jsonb_build_object('ok',true,'order_id',p_order_id,'state',j.state,'stale_ignored',true,'registration_action_taken',false); END IF;
  IF p_provider_state='succeeded' AND (p_resource_ref IS DISTINCT FROM v_ref OR p_registered_at IS NULL OR NOT isfinite(p_registered_at) OR j.post_started_at IS NULL OR p_registered_at<j.post_started_at-interval '5 minutes' OR p_registered_at>clock_timestamp()+interval '5 minutes') THEN RETURN jsonb_build_object('ok',false,'error','REGISTRATION_SUCCESS_UNVERIFIED'); END IF;
  v_state:=CASE p_provider_state WHEN 'pending' THEN 'processing' WHEN 'in_progress' THEN 'processing' WHEN 'unknown' THEN 'review_required' ELSE p_provider_state END;
  IF v_state IN ('failed','review_required','action_required') THEN v_reason:='registration:'||p_provider_state;END IF;
  IF j.observation_count>=12 AND v_state IN ('processing','blocked') THEN v_state:='review_required';v_reason:='registration:poll_limit';END IF;
  IF EXISTS(SELECT 1 FROM public.domain_registration_jobs r WHERE r.domain=j.domain AND r.order_id<>j.order_id AND r.state NOT IN ('prepared','conflict')) THEN v_state:='conflict';v_reason:='registration:domain_conflict';END IF;
  UPDATE public.domain_registration_jobs SET state=v_state,provider_state=p_provider_state,provider_updated_at=CASE WHEN p_provider_state='unknown' THEN provider_updated_at ELSE p_observed_at END,provider_resource_ref=COALESCE(p_resource_ref,provider_resource_ref),evidence_sha256=p_evidence_sha256,observation_count=LEAST(observation_count+1,13),review_code=v_reason,next_check_at=CASE WHEN v_state IN ('processing','blocked') THEN clock_timestamp()+make_interval(secs=>LEAST(3600,(CASE WHEN v_state='blocked' THEN 60 ELSE 10 END)*power(2::numeric,LEAST(observation_count,8))::integer)) ELSE NULL END,updated_at=clock_timestamp() WHERE order_id=p_order_id;
  IF v_state='succeeded' AND o.payment_state='paid' THEN UPDATE public.domain_purchase_orders SET registration_state='registered',registered_at=p_registered_at,registrar_domain_ref=CASE WHEN length(v_ref)<=200 THEN v_ref ELSE 'cloudflare:sha256:'||encode(sha256(convert_to(v_ref,'UTF8')),'hex') END,review_reason=CASE WHEN review_reason LIKE 'registration:%' THEN NULL ELSE review_reason END,updated_at=clock_timestamp() WHERE order_id=p_order_id;
  ELSE UPDATE public.domain_purchase_orders SET registration_state=CASE WHEN v_state='failed' THEN 'failed' WHEN v_state IN ('review_required','conflict','action_required','succeeded') OR payment_state<>'paid' THEN 'review_required' ELSE 'processing' END,review_reason=COALESCE(review_reason,v_reason,CASE WHEN payment_state<>'paid' THEN 'registration:payment_changed' END),updated_at=clock_timestamp() WHERE order_id=p_order_id;END IF;
  RETURN jsonb_build_object('ok',true,'order_id',p_order_id,'environment','production','state',v_state,'observation_recorded',true,'registration_confirmed',v_state='succeeded' AND o.payment_state='paid','registration_action_taken',false);
 END;$observe$;
 DO $guard$
 DECLARE d text;a text:=' SELECT * INTO s FROM public.domain_checkout_sessions WHERE order_id=p_order_id FOR UPDATE;';
 BEGIN
  d:=pg_get_functiondef('public.domain_begin_production_checkout(uuid,text)'::regprocedure);
  IF (length(d)-length(replace(d,a,'')))/length(a)<>1 OR position('domain_registration_jobs' in d)>0 THEN RAISE EXCEPTION 'Production checkout guard anchor differs; stop';END IF;
  EXECUTE replace(d,a,' IF NOT EXISTS(SELECT 1 FROM public.domain_registration_jobs r WHERE r.order_id=p_order_id AND r.user_id=p_user_id AND r.quote_id=o.quote_id AND r.amount_idr=o.amount_idr AND r.state=''prepared'') THEN RETURN pg_catalog.jsonb_build_object(''ok'',false,''error'',''REGISTRANT_DETAILS_REQUIRED'');END IF;'||chr(10)||a);
 END;$guard$;
 REVOKE ALL ON FUNCTION public.domain_save_production_registration_details(uuid,text,jsonb,text,text,boolean),public.domain_claim_production_registration(text,text,numeric,timestamptz),public.domain_observe_production_registration(text,uuid,text,text,timestamptz,timestamptz,text) FROM PUBLIC,anon,authenticated;
 GRANT EXECUTE ON FUNCTION public.domain_save_production_registration_details(uuid,text,jsonb,text,text,boolean),public.domain_claim_production_registration(text,text,numeric,timestamptz),public.domain_observe_production_registration(text,uuid,text,text,timestamptz,timestamptz,text) TO service_role;
 COMMENT ON TABLE public.domain_registration_jobs IS 'Private production registrar ledger with registrant PII. Trusted backend must verify customer identity, validate the live extension schema and collect genuine terms consent. Claim requires independently verified payment and live registrar preflight; claim is not proof a request was sent. Never automatically repeat POST after a claimed attempt. Observe only validated Cloudflare production workflows; unknown means reconciliation, never success. No provider calls or refunds occur in these RPCs.';
END;
$migration$;