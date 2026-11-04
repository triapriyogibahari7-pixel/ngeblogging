-- Audited function-body snapshots from 2026-11-04 metadata reads.
-- Only installed in disposable CI. Quote fixtures exercise the legacy verified branch.
CREATE OR REPLACE FUNCTION public.domain_begin_production_checkout(p_user_id uuid, p_order_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
 SET lock_timeout TO '2s'
AS $function$
DECLARE
 o public.domain_purchase_orders%ROWTYPE; q public.domain_sale_quotes%ROWTYPE; s public.domain_checkout_sessions%ROWTYPE;
 now_at timestamptz; anchor_at timestamptz; limit_at timestamptz; minutes integer;
BEGIN
 IF current_user<>'service_role' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','SERVER_ONLY'); END IF;
 IF p_user_id IS NULL OR p_order_id IS NULL OR p_order_id!~'^DOM-[a-f0-9]{40}$' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INVALID_CHECKOUT_REQUEST'); END IF;
 SELECT * INTO o FROM public.domain_purchase_orders WHERE order_id=p_order_id AND user_id=p_user_id AND environment='production' FOR UPDATE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','DOMAIN_ORDER_NOT_FOUND'); END IF;
 IF o.payment_state<>'pending' OR o.registration_state<>'not_started' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','ORDER_ALREADY_PROCESSED'); END IF;
 SELECT * INTO q FROM public.domain_sale_quotes WHERE id=o.quote_id AND user_id=p_user_id AND environment='production';
 IF NOT FOUND OR q.currency<>'IDR' OR q.sale_price_idr IS DISTINCT FROM o.amount_idr THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','QUOTE_SNAPSHOT_MISMATCH'); END IF;
 IF q.pricing_version='reference-budget-20261103-v1' OR q.cost_basis->>'pricing_mode'='public_reference_budget' THEN
  IF NOT public.domain_reference_quote_valid_v1(q.environment,q.provider_id,q.years,q.sale_price_idr,q.registrar_cost_idr,q.other_direct_costs_idr,q.payment_cost_idr,q.pricing_version,q.cost_basis,q.checked_at,q.expires_at,q.sale_price_usd,q.fx_rate_usd_idr,q.fx_source,q.fx_observed_at,q.fx_expires_at) THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','PRODUCTION_QUOTE_UNVERIFIED'); END IF;
 ELSE
 IF COALESCE(q.cost_basis->>'fixture_only'='true',false) OR q.cost_basis->>'tax_status' IS DISTINCT FROM 'verified' OR pg_catalog.jsonb_typeof(q.cost_basis->'tax_source_ref') IS DISTINCT FROM 'string' OR pg_catalog.btrim(COALESCE(q.cost_basis->>'tax_source_ref',''))='' OR pg_catalog.jsonb_typeof(q.cost_basis->'payment_fee_source_ref') IS DISTINCT FROM 'string' OR pg_catalog.btrim(COALESCE(q.cost_basis->>'payment_fee_source_ref',''))='' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','PRODUCTION_QUOTE_UNVERIFIED'); END IF;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.domain_registration_jobs r WHERE r.order_id=p_order_id AND r.user_id=p_user_id AND r.quote_id=o.quote_id AND r.amount_idr=o.amount_idr AND r.state='prepared') THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','REGISTRANT_DETAILS_REQUIRED');END IF;
 SELECT * INTO s FROM public.domain_checkout_sessions WHERE order_id=p_order_id FOR UPDATE;
 IF FOUND THEN
  IF s.user_id IS DISTINCT FROM p_user_id OR s.environment<>'production' OR s.currency<>'IDR' OR s.amount_idr IS DISTINCT FROM o.amount_idr THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','CHECKOUT_SESSION_CONFLICT'); END IF;
  IF s.state='ready' THEN
   IF s.expires_at<=pg_catalog.clock_timestamp() THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','CHECKOUT_EXPIRED'); END IF;
   IF o.snap_token IS DISTINCT FROM s.snap_token OR o.checkout_url IS DISTINCT FROM s.checkout_url THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','CHECKOUT_RECONCILIATION_REQUIRED'); END IF;
   RETURN pg_catalog.jsonb_build_object('ok',true,'action','reuse','order_id',o.order_id,'environment','production','currency','IDR','amount_idr',o.amount_idr,'domain',q.domain,'display_currency',q.display_currency,'sale_price_usd',q.sale_price_usd::text,'attempt_id',s.attempt_id,'expiry_anchor_at',s.expiry_anchor_at,'expires_at',s.expires_at,'snap_token',s.snap_token,'checkout_url',s.checkout_url);
  END IF;
  RETURN pg_catalog.jsonb_build_object('ok',false,'error',CASE WHEN s.state='creating' THEN 'CHECKOUT_IN_PROGRESS' ELSE 'CHECKOUT_RECONCILIATION_REQUIRED' END);
 END IF;
 IF o.snap_token IS NOT NULL OR o.checkout_url IS NOT NULL THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','CHECKOUT_RECONCILIATION_REQUIRED'); END IF;
 now_at:=pg_catalog.clock_timestamp();
 IF o.created_at>now_at THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','CHECKOUT_CLOCK_UNAVAILABLE'); END IF;
 anchor_at:=pg_catalog.date_trunc('second',now_at);
 limit_at:=LEAST(o.created_at+interval '15 minutes',q.fx_expires_at);
 minutes:=pg_catalog.floor(EXTRACT(EPOCH FROM (limit_at-anchor_at))/60)::integer;
 IF minutes<1 OR minutes>15 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','CHECKOUT_WINDOW_EXPIRED'); END IF;
 INSERT INTO public.domain_checkout_sessions(order_id,user_id,environment,currency,amount_idr,attempt_id,state,expiry_anchor_at,expires_at) VALUES(o.order_id,o.user_id,'production','IDR',o.amount_idr,pg_catalog.gen_random_uuid(),'creating',anchor_at,anchor_at+minutes*interval '1 minute') RETURNING * INTO s;
 RETURN pg_catalog.jsonb_build_object('ok',true,'action','create','order_id',o.order_id,'environment','production','currency','IDR','amount_idr',o.amount_idr,'domain',q.domain,'display_currency',q.display_currency,'sale_price_usd',q.sale_price_usd::text,'attempt_id',s.attempt_id,'expiry_anchor_at',s.expiry_anchor_at,'expires_at',s.expires_at,'duration_minutes',minutes,'fixture_only',COALESCE(q.cost_basis->>'fixture_only'='true',false));
END;
$function$;
CREATE OR REPLACE FUNCTION public.domain_record_production_payment(p_order_id text, p_amount_idr bigint, p_transaction_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
 SET lock_timeout TO '2s'
AS $function$
DECLARE
 o public.domain_purchase_orders%ROWTYPE;
 e public.domain_payment_events%ROWTYPE;
 expected_event_key text;
 event_reused boolean := false;
 payment_updated boolean := false;
BEGIN
 IF current_user <> 'service_role' THEN
  RETURN pg_catalog.jsonb_build_object('ok',false,'error','SERVER_ONLY');
 END IF;
 IF p_order_id IS NULL OR p_order_id !~ '^DOM-[a-f0-9]{40}$' OR p_amount_idr IS NULL OR p_amount_idr<1 OR p_amount_idr>1000000000000 OR p_transaction_id IS NULL OR pg_catalog.length(p_transaction_id)<1 OR pg_catalog.length(p_transaction_id)>128 OR p_transaction_id<>pg_catalog.btrim(p_transaction_id) OR p_transaction_id ~ '[[:cntrl:]]' THEN
  RETURN pg_catalog.jsonb_build_object('ok',false,'error','INVALID_PRODUCTION_PAYMENT_REQUEST');
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('production-domain-midtrans:'||p_transaction_id,0::bigint));
 SELECT * INTO o FROM public.domain_purchase_orders WHERE order_id=p_order_id AND environment='production' FOR UPDATE;
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object('ok',false,'error','DOMAIN_ORDER_NOT_FOUND');
 END IF;
 IF o.currency<>'IDR' OR o.amount_idr IS DISTINCT FROM p_amount_idr THEN
  RETURN pg_catalog.jsonb_build_object('ok',false,'error','PAYMENT_AMOUNT_MISMATCH');
 END IF;
 IF o.midtrans_transaction_id IS NOT NULL AND o.midtrans_transaction_id IS DISTINCT FROM p_transaction_id THEN
  RETURN pg_catalog.jsonb_build_object('ok',false,'error','PAYMENT_TRANSACTION_CONFLICT');
 END IF;
 IF o.payment_state NOT IN ('pending','paid') OR (o.payment_state='pending' AND o.registration_state<>'not_started') THEN
  RETURN pg_catalog.jsonb_build_object('ok',false,'error','PAYMENT_REVIEW_REQUIRED');
 END IF;
 IF o.payment_state='paid' AND (o.midtrans_transaction_id IS NULL OR o.paid_at IS NULL) THEN
  RETURN pg_catalog.jsonb_build_object('ok',false,'error','PAYMENT_REVIEW_REQUIRED');
 END IF;
 IF EXISTS (SELECT 1 FROM public.domain_purchase_orders WHERE environment='production' AND midtrans_transaction_id=p_transaction_id AND order_id<>p_order_id) THEN
  RETURN pg_catalog.jsonb_build_object('ok',false,'error','PAYMENT_TRANSACTION_CONFLICT');
 END IF;
 expected_event_key:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.jsonb_build_array('domain-payment-v1','production','midtrans',p_order_id,p_transaction_id,'paid')::text,'UTF8')),'hex');
 SELECT * INTO e FROM public.domain_payment_events WHERE event_key=expected_event_key;
 IF FOUND THEN
  IF e.order_id IS DISTINCT FROM p_order_id OR e.environment IS DISTINCT FROM 'production' OR e.provider IS DISTINCT FROM 'midtrans' OR e.currency IS DISTINCT FROM 'IDR' OR e.amount_idr IS DISTINCT FROM p_amount_idr OR e.transaction_id IS DISTINCT FROM p_transaction_id OR e.verified_state IS DISTINCT FROM 'paid' THEN
   RETURN pg_catalog.jsonb_build_object('ok',false,'error','PAYMENT_EVENT_CONFLICT');
  END IF;
  event_reused:=true;
 END IF;
 IF o.payment_state='pending' THEN
  UPDATE public.domain_purchase_orders SET payment_state='paid',midtrans_transaction_id=p_transaction_id,paid_at=pg_catalog.clock_timestamp(),updated_at=pg_catalog.clock_timestamp() WHERE order_id=p_order_id AND environment='production' RETURNING * INTO o;
  payment_updated:=true;
 END IF;
 IF NOT event_reused THEN
  INSERT INTO public.domain_payment_events(event_key,order_id,environment,provider,currency,amount_idr,transaction_id,verified_state)
  VALUES(expected_event_key,p_order_id,'production','midtrans','IDR',p_amount_idr,p_transaction_id,'paid');
 END IF;
 RETURN pg_catalog.jsonb_build_object('ok',true,'event_reused',event_reused,'payment_updated',payment_updated,'event_key',expected_event_key,'order_id',o.order_id,'environment','production','currency','IDR','amount_idr',o.amount_idr,'payment_state',o.payment_state,'registration_state',o.registration_state,'registration_action_taken',false);
EXCEPTION WHEN unique_violation THEN
 RETURN pg_catalog.jsonb_build_object('ok',false,'error','PAYMENT_RECORD_CONFLICT');
END;
$function$;
REVOKE ALL ON FUNCTION public.domain_begin_production_checkout(uuid,text),public.domain_record_production_payment(text,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.domain_begin_production_checkout(uuid,text),public.domain_record_production_payment(text,bigint,text) TO service_role;
