-- CANDIDATE, NOT APPLIED. Requires cancellation ledger, preflight-v1 and accept-v1.
-- Review and run PostgreSQL regression tests in a disposable DB before migration approval.
-- Manual reconciliation is an explicit prerequisite; Core GET Status 404 is insufficient.
BEGIN;
SET LOCAL lock_timeout='2s';
DO $guard$ BEGIN
 IF to_regprocedure('public.domain_accept_order_recovery_v1(uuid,text,uuid,uuid,timestamptz,uuid,bigint,boolean,text,boolean,timestamptz,text)') IS NULL OR to_regclass('public.domain_order_cancellations_v1') IS NULL THEN RAISE EXCEPTION 'Recovery prerequisites missing';END IF;
END $guard$;
ALTER TABLE public.domain_order_recoveries_v1
 ADD COLUMN acceptance_policy text,
 ADD COLUMN checkout_anchor_at timestamptz,
 ADD COLUMN checkout_expires_at timestamptz,
 ADD COLUMN accepted_payload_sha256 text,
 ADD COLUMN accepted_schema_sha256 text,
 ADD COLUMN accepted_terms_version text,
 ADD CONSTRAINT recovery_v2_window CHECK(acceptance_policy IS NULL OR (acceptance_policy='same-order-recovery-2h-v2' AND checkout_anchor_at IS NOT NULL AND checkout_expires_at IS NOT NULL AND checkout_anchor_at<=accepted_at AND accepted_at<checkout_anchor_at+interval '1 second' AND checkout_expires_at=checkout_anchor_at+interval '2 hours' AND accepted_payload_sha256 IS NOT NULL AND accepted_payload_sha256~'^[a-f0-9]{64}$' AND accepted_schema_sha256 IS NOT NULL AND accepted_schema_sha256~'^[a-f0-9]{64}$' AND accepted_terms_version IS NOT NULL AND accepted_terms_version='cloudflare-domain-registration-2026-08-20')),
 ADD CONSTRAINT recovery_v2_session_reference UNIQUE(order_id,checkout_anchor_at,checkout_expires_at);
CREATE TABLE public.domain_recovery_snap_reconciliations_v2(
 evidence_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id text NOT NULL REFERENCES public.domain_purchase_orders(order_id),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 previous_quote_id uuid NOT NULL REFERENCES public.domain_sale_quotes(id),
 previous_amount_idr bigint NOT NULL CHECK(previous_amount_idr BETWEEN 1 AND 1000000000000),
 order_updated_at timestamptz NOT NULL,
 merchant_id text NOT NULL CHECK(merchant_id='M190228985'),
 source text NOT NULL CHECK(source='merchant-dashboard-snap-reconciliation'),
 evidence_sha256 text NOT NULL CHECK(evidence_sha256~'^[a-f0-9]{64}$'),
 reviewer_id uuid NOT NULL REFERENCES auth.users(id),
 verified_at timestamptz NOT NULL,
 valid_until timestamptz NOT NULL CHECK(valid_until>verified_at AND valid_until<=verified_at+interval '15 seconds'),
 no_snap_checkout_confirmed boolean NOT NULL CHECK(no_snap_checkout_confirmed),
 used_request_id uuid UNIQUE
);
ALTER TABLE public.domain_recovery_snap_reconciliations_v2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.domain_recovery_snap_reconciliations_v2 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.domain_recovery_snap_reconciliations_v2 TO service_role;
CREATE FUNCTION public.domain_recovery_deadline_v2(p_order_id text,p_quote_id uuid,p_amount_idr bigint)
RETURNS timestamptz LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $fn$
 SELECT checkout_expires_at FROM public.domain_order_recoveries_v1
 WHERE order_id=p_order_id AND accepted_quote_id=p_quote_id AND accepted_amount_idr=p_amount_idr AND acceptance_policy='same-order-recovery-2h-v2'
$fn$;
-- Strict source anchors abort on drift.
DO $patch$
DECLARE d text;old text;replacement text;
BEGIN
 d:=pg_get_functiondef('public.domain_save_production_registration_details(uuid,text,jsonb,text,text,boolean)'::regprocedure);
 old:='o.created_at+interval ''15 minutes''<=clock_timestamp()';
 replacement:='COALESCE(public.domain_recovery_deadline_v2(o.order_id,o.quote_id,o.amount_idr),o.created_at+interval ''15 minutes'')<=clock_timestamp()';
 IF (length(d)-length(replace(d,old,'')))/length(old)<>1 THEN RAISE EXCEPTION 'registrant order window anchor differs';END IF;d:=replace(d,old,replacement);
 old:='q.fx_expires_at<=clock_timestamp()';
 replacement:='(q.fx_expires_at<=clock_timestamp() AND COALESCE(public.domain_recovery_deadline_v2(o.order_id,o.quote_id,o.amount_idr),''-infinity''::timestamptz)<=clock_timestamp())';
 IF (length(d)-length(replace(d,old,'')))/length(old)<>1 THEN RAISE EXCEPTION 'registrant FX anchor differs';END IF;d:=replace(d,old,replacement);
 old:='x.created_at+interval ''15 minutes''>clock_timestamp()';
 replacement:='COALESCE(public.domain_recovery_deadline_v2(x.order_id,x.quote_id,x.amount_idr),x.created_at+interval ''15 minutes'')>clock_timestamp()';
 IF (length(d)-length(replace(d,old,'')))/length(old)<>1 THEN RAISE EXCEPTION 'domain reservation anchor differs';END IF;d:=replace(d,old,replacement);
 old:='DO UPDATE SET payload=EXCLUDED.payload';replacement:='DO UPDATE SET quote_id=EXCLUDED.quote_id,amount_idr=EXCLUDED.amount_idr,expected_cost_usd=EXCLUDED.expected_cost_usd,payload=EXCLUDED.payload';
 IF (length(d)-length(replace(d,old,'')))/length(old)<>1 THEN RAISE EXCEPTION 'registrant upsert anchor differs';END IF;d:=replace(d,old,replacement);
 old:='WHERE domain_registration_jobs.state=''prepared'' RETURNING';replacement:='WHERE domain_registration_jobs.state=''prepared'' AND domain_registration_jobs.attempt_id IS NULL AND domain_registration_jobs.post_started_at IS NULL AND domain_registration_jobs.provider_state IS NULL AND domain_registration_jobs.provider_resource_ref IS NULL AND domain_registration_jobs.evidence_sha256 IS NULL AND domain_registration_jobs.review_code IS NULL RETURNING';
 IF (length(d)-length(replace(d,old,'')))/length(old)<>1 THEN RAISE EXCEPTION 'registrant job guard anchor differs';END IF;d:=replace(d,old,replacement);
 EXECUTE d;
END $patch$;
CREATE FUNCTION public.domain_accept_order_recovery_v2(
 p_user_id uuid,p_order_id text,p_request_id uuid,p_previous_quote_id uuid,p_expected_updated_at timestamptz,p_quote_id uuid,p_amount_idr bigint,
 p_payload jsonb,p_schema_sha256 text,p_terms_version text,p_accepted boolean,p_gateway_checked_at timestamptz,p_gateway_evidence_sha256 text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' SET lock_timeout='2s' AS $fn$
DECLARE o public.domain_purchase_orders%ROWTYPE;a public.domain_order_recoveries_v1%ROWTYPE;e public.domain_recovery_snap_reconciliations_v2%ROWTYPE;j public.domain_registration_jobs%ROWTYPE;r jsonb;v_domain text;h text;now_at timestamptz;
BEGIN
 IF current_user<>'service_role' THEN RETURN jsonb_build_object('ok',false,'error','SERVER_ONLY');END IF;
 IF p_user_id IS NULL OR p_order_id IS NULL OR p_order_id!~'^DOM-[a-f0-9]{40}$' OR p_request_id IS NULL OR p_previous_quote_id IS NULL OR p_quote_id IS NULL OR p_expected_updated_at IS NULL OR NOT isfinite(p_expected_updated_at) OR p_amount_idr IS NULL OR p_amount_idr NOT BETWEEN 1 AND 1000000000000 OR p_accepted IS DISTINCT FROM true OR p_terms_version IS DISTINCT FROM 'cloudflare-domain-registration-2026-08-20' OR p_schema_sha256 IS NULL OR p_schema_sha256!~'^[a-f0-9]{64}$' OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' OR octet_length(p_payload::text)>16384 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_RECOVERY_ACCEPTANCE');END IF;
 SELECT z.domain INTO v_domain FROM public.domain_purchase_orders x JOIN public.domain_sale_quotes z ON z.id=x.quote_id WHERE x.order_id=p_order_id AND x.user_id=p_user_id AND x.environment='production';
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','DOMAIN_ORDER_NOT_FOUND');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('production-domain-registration:'||v_domain,0::bigint));
 SELECT * INTO o FROM public.domain_purchase_orders WHERE order_id=p_order_id AND user_id=p_user_id AND environment='production' FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','DOMAIN_ORDER_NOT_FOUND');END IF;
 IF o.payment_state IS DISTINCT FROM 'pending' OR o.registration_state IS DISTINCT FROM 'not_started' OR o.review_reason IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'error','ORDER_ALREADY_PROCESSED');END IF;
 h:=encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');
 SELECT * INTO a FROM public.domain_order_recoveries_v1 WHERE order_id=p_order_id FOR UPDATE;
 IF FOUND THEN
  IF a.acceptance_policy IS DISTINCT FROM 'same-order-recovery-2h-v2' OR a.user_id IS DISTINCT FROM p_user_id OR a.request_id IS DISTINCT FROM p_request_id OR a.previous_quote_id IS DISTINCT FROM p_previous_quote_id OR a.previous_order_updated_at IS DISTINCT FROM p_expected_updated_at OR a.accepted_quote_id IS DISTINCT FROM p_quote_id OR a.accepted_amount_idr IS DISTINCT FROM p_amount_idr OR a.accepted_payload_sha256 IS DISTINCT FROM h OR a.accepted_schema_sha256 IS DISTINCT FROM p_schema_sha256 OR a.accepted_terms_version IS DISTINCT FROM p_terms_version OR o.quote_id IS DISTINCT FROM a.accepted_quote_id OR o.amount_idr IS DISTINCT FROM a.accepted_amount_idr THEN RETURN jsonb_build_object('ok',false,'error','RECOVERY_ACCEPTANCE_CONFLICT');END IF;
  SELECT * INTO j FROM public.domain_registration_jobs WHERE order_id=p_order_id FOR SHARE;
  IF NOT FOUND OR j.quote_id IS DISTINCT FROM a.accepted_quote_id OR j.amount_idr IS DISTINCT FROM a.accepted_amount_idr OR j.user_id IS DISTINCT FROM p_user_id OR j.state IS DISTINCT FROM 'prepared' OR j.attempt_id IS NOT NULL OR j.post_started_at IS NOT NULL OR j.provider_state IS NOT NULL OR j.provider_resource_ref IS NOT NULL OR j.evidence_sha256 IS NOT NULL OR j.review_code IS NOT NULL OR j.schema_sha256 IS DISTINCT FROM p_schema_sha256 OR j.terms_version IS DISTINCT FROM p_terms_version OR j.payload_sha256 IS DISTINCT FROM h OR j.consent_at<a.accepted_at THEN RETURN jsonb_build_object('ok',false,'error','REGISTRATION_RECONCILIATION_REQUIRED');END IF;
  RETURN jsonb_build_object('ok',true,'reused',true,'order_id',a.order_id,'quote_id',a.accepted_quote_id,'amount_idr',a.accepted_amount_idr,'currency','IDR','environment','production','payment_window_policy',a.acceptance_policy,'expiry_anchor_at',a.checkout_anchor_at,'expires_at',a.checkout_expires_at,'registrant_revalidated',true,'checkout_created',false,'registration_action_taken',false);
 END IF;
 now_at:=clock_timestamp();
 SELECT * INTO e FROM public.domain_recovery_snap_reconciliations_v2 WHERE order_id=p_order_id AND user_id=p_user_id AND previous_quote_id=p_previous_quote_id AND previous_amount_idr=o.amount_idr AND order_updated_at=p_expected_updated_at AND used_request_id IS NULL AND verified_at<=now_at AND valid_until>now_at AND no_snap_checkout_confirmed ORDER BY verified_at DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','GATEWAY_RECONCILIATION_REQUIRED');END IF;
 r:=public.domain_accept_order_recovery_v1(p_user_id,p_order_id,p_request_id,p_previous_quote_id,p_expected_updated_at,p_quote_id,p_amount_idr,true,'same-order-recovery-2h-v1',true,p_gateway_checked_at,p_gateway_evidence_sha256);
 IF r->'ok' IS DISTINCT FROM 'true'::jsonb THEN RETURN r;END IF;
 UPDATE public.domain_order_recoveries_v1 SET acceptance_policy='same-order-recovery-2h-v2',checkout_anchor_at=date_trunc('second',accepted_at),checkout_expires_at=date_trunc('second',accepted_at)+interval '2 hours',accepted_payload_sha256=h,accepted_schema_sha256=p_schema_sha256,accepted_terms_version=p_terms_version WHERE order_id=p_order_id RETURNING * INTO a;
 r:=public.domain_save_production_registration_details(p_user_id,p_order_id,p_payload,p_schema_sha256,p_terms_version,true);
 -- Raise, not return: failed registrant validation rolls back quote and ledger too.
 IF r->'ok' IS DISTINCT FROM 'true'::jsonb OR r->'details_saved' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Atomic recovery registrant validation rejected';END IF;
 SELECT * INTO j FROM public.domain_registration_jobs WHERE order_id=p_order_id;
 IF j.quote_id IS DISTINCT FROM p_quote_id OR j.amount_idr IS DISTINCT FROM p_amount_idr OR j.payload_sha256 IS DISTINCT FROM h OR j.consent_at<a.accepted_at THEN RAISE EXCEPTION 'Atomic recovery registrant result differs';END IF;
 UPDATE public.domain_recovery_snap_reconciliations_v2 SET used_request_id=p_request_id WHERE evidence_id=e.evidence_id;
 RETURN jsonb_build_object('ok',true,'reused',false,'order_id',a.order_id,'quote_id',a.accepted_quote_id,'amount_idr',a.accepted_amount_idr,'currency','IDR','environment','production','payment_window_policy',a.acceptance_policy,'expiry_anchor_at',a.checkout_anchor_at,'expires_at',a.checkout_expires_at,'registrant_revalidated',true,'checkout_created',false,'registration_action_taken',false);
END $fn$;
ALTER TABLE public.domain_checkout_sessions
 ADD COLUMN payment_window_policy text NOT NULL DEFAULT 'standard-15m',
 ADD COLUMN recovery_order_id text,
 ADD CONSTRAINT checkout_recovery_window_v2 CHECK(expiry_anchor_at<=created_at AND created_at<expires_at AND expires_at>expiry_anchor_at AND ((payment_window_policy='standard-15m' AND recovery_order_id IS NULL AND expires_at<=expiry_anchor_at+interval '15 minutes') OR (environment='production' AND payment_window_policy='same-order-recovery-2h-v2' AND recovery_order_id IS NOT NULL AND recovery_order_id=order_id AND expires_at=expiry_anchor_at+interval '2 hours'))),
 ADD CONSTRAINT checkout_recovery_snapshot_v2 FOREIGN KEY(recovery_order_id,expiry_anchor_at,expires_at) REFERENCES public.domain_order_recoveries_v1(order_id,checkout_anchor_at,checkout_expires_at);
-- Match the audited constraint before replacing only this one check.
DO $constraint$ BEGIN
 IF (SELECT pg_get_constraintdef(oid,true) FROM pg_constraint WHERE conrelid='public.domain_checkout_sessions'::regclass AND conname='domain_checkout_sessions_check') IS DISTINCT FROM 'CHECK (expiry_anchor_at <= created_at AND created_at < expires_at AND expires_at > expiry_anchor_at AND expires_at <= (expiry_anchor_at + ''00:15:00''::interval))' THEN RAISE EXCEPTION 'checkout constraint source differs';END IF;
END $constraint$;
ALTER TABLE public.domain_checkout_sessions DROP CONSTRAINT domain_checkout_sessions_check;
CREATE FUNCTION public.domain_begin_recovery_checkout_v2(p_user_id uuid,p_order_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' SET lock_timeout='2s' AS $fn$
DECLARE o public.domain_purchase_orders%ROWTYPE;q public.domain_sale_quotes%ROWTYPE;a public.domain_order_recoveries_v1%ROWTYPE;s public.domain_checkout_sessions%ROWTYPE;j public.domain_registration_jobs%ROWTYPE;b public.domain_order_site_bindings%ROWTYPE;v_domain text;site_owner uuid;reused boolean:=false;
BEGIN
 IF current_user<>'service_role' THEN RETURN jsonb_build_object('ok',false,'error','SERVER_ONLY');END IF;
 IF p_user_id IS NULL OR p_order_id IS NULL OR p_order_id!~'^DOM-[a-f0-9]{40}$' THEN RETURN jsonb_build_object('ok',false,'error','INVALID_CHECKOUT_REQUEST');END IF;
 SELECT z.domain INTO v_domain FROM public.domain_purchase_orders x JOIN public.domain_sale_quotes z ON z.id=x.quote_id WHERE x.order_id=p_order_id AND x.user_id=p_user_id AND x.environment='production';
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','DOMAIN_ORDER_NOT_FOUND');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('production-domain-registration:'||v_domain,0::bigint));
 SELECT * INTO o FROM public.domain_purchase_orders WHERE order_id=p_order_id AND user_id=p_user_id AND environment='production' FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','DOMAIN_ORDER_NOT_FOUND');END IF;
 SELECT * INTO a FROM public.domain_order_recoveries_v1 WHERE order_id=p_order_id AND acceptance_policy='same-order-recovery-2h-v2';
 IF NOT FOUND THEN RETURN public.domain_begin_site_production_checkout(p_user_id,p_order_id);END IF;
 SELECT * INTO b FROM public.domain_order_site_bindings WHERE order_id=p_order_id;
 IF NOT FOUND OR b.user_id IS DISTINCT FROM p_user_id OR b.environment IS DISTINCT FROM 'production' OR b.site_id IS DISTINCT FROM a.site_id THEN RETURN jsonb_build_object('ok',false,'error','ORDER_SITE_BINDING_UNVERIFIED');END IF;
 SELECT owner_id INTO site_owner FROM public.sites WHERE id=b.site_id FOR SHARE;
 IF NOT FOUND OR site_owner IS DISTINCT FROM p_user_id THEN RETURN jsonb_build_object('ok',false,'error','SITE_OWNER_REQUIRED');END IF;
 IF o.currency IS DISTINCT FROM 'IDR' OR o.quote_id IS DISTINCT FROM a.accepted_quote_id OR o.amount_idr IS DISTINCT FROM a.accepted_amount_idr OR a.user_id IS DISTINCT FROM p_user_id OR o.payment_state IS DISTINCT FROM 'pending' OR o.registration_state IS DISTINCT FROM 'not_started' OR o.review_reason IS NOT NULL OR o.paid_at IS NOT NULL OR EXISTS(SELECT 1 FROM public.domain_order_cancellations_v1 WHERE order_id=p_order_id) THEN RETURN jsonb_build_object('ok',false,'error','ORDER_ALREADY_PROCESSED');END IF;
 IF a.checkout_anchor_at>clock_timestamp() OR a.checkout_expires_at<=clock_timestamp()+interval '30 seconds' THEN RETURN jsonb_build_object('ok',false,'error','CHECKOUT_WINDOW_EXPIRED');END IF;
 SELECT * INTO q FROM public.domain_sale_quotes WHERE id=o.quote_id AND user_id=p_user_id AND environment='production';
 IF NOT FOUND OR q.sale_price_idr IS DISTINCT FROM o.amount_idr OR q.domain IS DISTINCT FROM v_domain OR q.cost_basis->'merchant_absorbs_overrun' IS DISTINCT FROM 'true'::jsonb THEN RETURN jsonb_build_object('ok',false,'error','PRODUCTION_QUOTE_UNVERIFIED');END IF;
 SELECT * INTO j FROM public.domain_registration_jobs WHERE order_id=p_order_id FOR SHARE;
 IF NOT FOUND OR j.user_id IS DISTINCT FROM p_user_id OR j.quote_id IS DISTINCT FROM o.quote_id OR j.amount_idr IS DISTINCT FROM o.amount_idr OR j.domain IS DISTINCT FROM q.domain OR j.state IS DISTINCT FROM 'prepared' OR j.attempt_id IS NOT NULL OR j.post_started_at IS NOT NULL OR j.consent_at<a.accepted_at OR j.payload_sha256 IS DISTINCT FROM a.accepted_payload_sha256 OR j.schema_sha256 IS DISTINCT FROM a.accepted_schema_sha256 OR j.terms_version IS DISTINCT FROM a.accepted_terms_version THEN RETURN jsonb_build_object('ok',false,'error','REGISTRANT_DETAILS_REQUIRED');END IF;
 SELECT * INTO s FROM public.domain_checkout_sessions WHERE order_id=p_order_id FOR UPDATE;
 IF FOUND THEN
  IF s.user_id IS DISTINCT FROM p_user_id OR s.environment IS DISTINCT FROM 'production' OR s.currency IS DISTINCT FROM 'IDR' OR s.amount_idr IS DISTINCT FROM o.amount_idr OR s.payment_window_policy IS DISTINCT FROM a.acceptance_policy OR s.expiry_anchor_at IS DISTINCT FROM a.checkout_anchor_at OR s.expires_at IS DISTINCT FROM a.checkout_expires_at THEN RETURN jsonb_build_object('ok',false,'error','CHECKOUT_SESSION_CONFLICT');END IF;
  IF s.state IS DISTINCT FROM 'ready' THEN RETURN jsonb_build_object('ok',false,'error','CHECKOUT_RECONCILIATION_REQUIRED');END IF;
  IF o.snap_token IS DISTINCT FROM s.snap_token OR o.checkout_url IS DISTINCT FROM s.checkout_url THEN RETURN jsonb_build_object('ok',false,'error','CHECKOUT_RECONCILIATION_REQUIRED');END IF;reused:=true;
 ELSE
  IF o.snap_token IS NOT NULL OR o.checkout_url IS NOT NULL OR o.midtrans_transaction_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.domain_payment_events WHERE order_id=p_order_id) THEN RETURN jsonb_build_object('ok',false,'error','CHECKOUT_RECONCILIATION_REQUIRED');END IF;
  INSERT INTO public.domain_checkout_sessions(order_id,user_id,environment,currency,amount_idr,attempt_id,state,expiry_anchor_at,expires_at,payment_window_policy,recovery_order_id) VALUES(o.order_id,o.user_id,'production','IDR',o.amount_idr,gen_random_uuid(),'creating',a.checkout_anchor_at,a.checkout_expires_at,a.acceptance_policy,o.order_id) RETURNING * INTO s;
 END IF;
 RETURN jsonb_build_object('ok',true,'action',CASE WHEN reused THEN 'reuse' ELSE 'create' END,'order_id',o.order_id,'environment','production','currency','IDR','amount_idr',o.amount_idr,'attempt_id',s.attempt_id,'expiry_anchor_at',s.expiry_anchor_at,'expires_at',s.expires_at,'duration_minutes',120,'payment_window_policy',a.acceptance_policy,'fixture_only',false,'snap_token',s.snap_token,'checkout_url',s.checkout_url);
END $fn$;
REVOKE ALL ON FUNCTION public.domain_recovery_deadline_v2(text,uuid,bigint),public.domain_accept_order_recovery_v2(uuid,text,uuid,uuid,timestamptz,uuid,bigint,jsonb,text,text,boolean,timestamptz,text),public.domain_begin_recovery_checkout_v2(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.domain_recovery_deadline_v2(text,uuid,bigint),public.domain_accept_order_recovery_v2(uuid,text,uuid,uuid,timestamptz,uuid,bigint,jsonb,text,text,boolean,timestamptz,text),public.domain_begin_recovery_checkout_v2(uuid,text) TO service_role;
COMMIT;
