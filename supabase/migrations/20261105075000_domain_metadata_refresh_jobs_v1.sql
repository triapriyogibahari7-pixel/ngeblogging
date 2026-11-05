BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='30s';
CREATE TABLE public.domain_metadata_refresh_jobs_v1(
 order_id text PRIMARY KEY,user_id uuid NOT NULL,attempt_id uuid NOT NULL,claimed_until timestamptz,next_check_at timestamptz NOT NULL,result_code text NOT NULL CHECK(result_code IN ('claimed','saved','unavailable')),
 FOREIGN KEY(order_id,user_id) REFERENCES public.domain_purchase_orders(order_id,user_id)
);
ALTER TABLE public.domain_metadata_refresh_jobs_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.domain_metadata_refresh_jobs_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.domain_metadata_refresh_jobs_v1 TO service_role;
CREATE INDEX domain_metadata_refresh_due_v1 ON public.domain_metadata_refresh_jobs_v1(next_check_at,order_id);

CREATE FUNCTION public.domain_claim_metadata_refresh_v1(p_limit integer DEFAULT 5) RETURNS jsonb LANGUAGE plpgsql SET search_path='' SET lock_timeout='2s' AS $fn$
DECLARE item record;a uuid;jobs jsonb:='[]'::jsonb;at_time timestamptz:=clock_timestamp();
BEGIN
 IF current_user<>'service_role' THEN RETURN jsonb_build_object('ok',false,'error','SERVER_ONLY');END IF;
 IF p_limit IS NULL OR p_limit<1 OR p_limit>5 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_LIMIT');END IF;
 FOR item IN
 SELECT o.order_id,o.user_id,
  jsonb_build_object('order_id',o.order_id,'user_id',o.user_id,'quote_id',o.quote_id,'environment',o.environment,'currency',o.currency,'amount_idr',o.amount_idr,'payment_state',o.payment_state,'registration_state',o.registration_state,'review_reason',o.review_reason,'paid_at',o.paid_at,'registered_at',o.registered_at,'midtrans_transaction_id',o.midtrans_transaction_id) AS order_data,
  jsonb_build_object('id',q.id,'user_id',q.user_id,'environment',q.environment,'provider_id',q.provider_id,'currency',q.currency,'sale_price_idr',q.sale_price_idr,'domain',q.domain) AS quote_data
 FROM public.domain_purchase_orders o JOIN public.domain_sale_quotes q ON q.id=o.quote_id AND q.user_id=o.user_id AND q.environment=o.environment AND q.currency=o.currency AND q.sale_price_idr=o.amount_idr
 LEFT JOIN public.domain_metadata_refresh_jobs_v1 l ON l.order_id=o.order_id
 WHERE o.environment='production' AND o.payment_state='paid' AND o.registration_state='registered' AND o.review_reason IS NULL AND q.provider_id='cloudflare' AND COALESCE(l.next_check_at,'-infinity'::timestamptz)<=at_time
  AND EXISTS(SELECT 1 FROM public.domain_payment_events e WHERE e.order_id=o.order_id AND e.environment='production' AND e.provider='midtrans' AND e.currency='IDR' AND e.amount_idr=o.amount_idr AND e.transaction_id=o.midtrans_transaction_id AND e.verified_state='paid')
  AND EXISTS(SELECT 1 FROM public.domain_registration_jobs r WHERE r.order_id=o.order_id AND r.user_id=o.user_id AND r.quote_id=o.quote_id AND r.amount_idr=o.amount_idr AND r.state='succeeded')
 ORDER BY COALESCE(l.next_check_at,'-infinity'::timestamptz),o.order_id LIMIT p_limit FOR UPDATE OF o SKIP LOCKED
 LOOP
  INSERT INTO public.domain_metadata_refresh_jobs_v1(order_id,user_id,attempt_id,claimed_until,next_check_at,result_code) VALUES(item.order_id,item.user_id,gen_random_uuid(),at_time+interval '10 minutes',at_time+interval '10 minutes','claimed')
  ON CONFLICT(order_id) DO UPDATE SET attempt_id=EXCLUDED.attempt_id,claimed_until=EXCLUDED.claimed_until,next_check_at=EXCLUDED.next_check_at,result_code='claimed' WHERE domain_metadata_refresh_jobs_v1.user_id=EXCLUDED.user_id AND domain_metadata_refresh_jobs_v1.next_check_at<=at_time RETURNING attempt_id INTO a;
  IF FOUND THEN jobs:=jobs||jsonb_build_array(jsonb_build_object('order',item.order_data,'quote',item.quote_data,'attemptId',a));END IF;
 END LOOP;
 RETURN jsonb_build_object('ok',true,'jobs',jobs);
END $fn$;
REVOKE ALL ON FUNCTION public.domain_claim_metadata_refresh_v1(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.domain_claim_metadata_refresh_v1(integer) TO service_role;

CREATE FUNCTION public.domain_complete_metadata_refresh_v1(p_order_id text,p_attempt_id uuid,p_metadata jsonb,p_evidence_sha256 text) RETURNS jsonb LANGUAGE plpgsql SET search_path='' SET lock_timeout='2s' AS $fn$
DECLARE o public.domain_purchase_orders%ROWTYPE;j public.domain_metadata_refresh_jobs_v1%ROWTYPE;ns text[];registered timestamptz;expires timestamptz;checked timestamptz;
BEGIN
 IF current_user<>'service_role' THEN RETURN jsonb_build_object('ok',false,'error','SERVER_ONLY');END IF;
 IF p_order_id IS NULL OR p_order_id !~ '^DOM-[a-f0-9]{40}$' OR p_attempt_id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','INVALID_REFRESH');END IF;
 SELECT * INTO o FROM public.domain_purchase_orders WHERE order_id=p_order_id AND environment='production' FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','DOMAIN_ORDER_NOT_FOUND');END IF;
 SELECT * INTO j FROM public.domain_metadata_refresh_jobs_v1 WHERE order_id=p_order_id FOR UPDATE;
 IF NOT FOUND OR j.user_id IS DISTINCT FROM o.user_id OR j.attempt_id IS DISTINCT FROM p_attempt_id OR j.result_code<>'claimed' OR j.claimed_until IS NULL OR j.claimed_until<=clock_timestamp() THEN RETURN jsonb_build_object('ok',false,'error','REFRESH_CLAIM_CONFLICT');END IF;
 IF p_metadata IS NULL THEN
  UPDATE public.domain_metadata_refresh_jobs_v1 SET claimed_until=NULL,next_check_at=clock_timestamp()+interval '1 hour',result_code='unavailable' WHERE order_id=p_order_id;
  RETURN jsonb_build_object('ok',true,'orderId',p_order_id,'attemptId',p_attempt_id,'snapshotSaved',false);
 END IF;
 IF o.payment_state<>'paid' OR o.registration_state<>'registered' OR o.review_reason IS NOT NULL OR p_metadata->>'status' IS DISTINCT FROM 'observed' OR p_metadata->>'source' IS DISTINCT FROM 'registrar_api' OR p_metadata->'providerActionTaken' IS DISTINCT FROM 'false'::jsonb OR COALESCE(p_metadata->>'registrarStatus','') NOT IN ('active','expired') OR jsonb_typeof(p_metadata->'autoRenew') IS DISTINCT FROM 'boolean' OR jsonb_typeof(p_metadata->'nameservers') IS DISTINCT FROM 'array' OR p_evidence_sha256 IS NULL OR p_evidence_sha256 !~ '^[a-f0-9]{64}$' THEN RETURN jsonb_build_object('ok',false,'error','METADATA_UNVERIFIED');END IF;
 IF NOT EXISTS(SELECT 1 FROM public.domain_payment_events e WHERE e.order_id=o.order_id AND e.environment='production' AND e.provider='midtrans' AND e.currency='IDR' AND e.amount_idr=o.amount_idr AND e.transaction_id=o.midtrans_transaction_id AND e.verified_state='paid') OR NOT EXISTS(SELECT 1 FROM public.domain_registration_jobs r WHERE r.order_id=o.order_id AND r.user_id=o.user_id AND r.quote_id=o.quote_id AND r.amount_idr=o.amount_idr AND r.state='succeeded') THEN RETURN jsonb_build_object('ok',false,'error','METADATA_UNVERIFIED');END IF;
 IF jsonb_array_length(p_metadata->'nameservers') NOT BETWEEN 2 AND 13 OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_metadata->'nameservers') x WHERE jsonb_typeof(x) IS DISTINCT FROM 'string') THEN RETURN jsonb_build_object('ok',false,'error','METADATA_UNVERIFIED');END IF;
 SELECT array_agg(value ORDER BY ordinality) INTO ns FROM jsonb_array_elements_text(p_metadata->'nameservers') WITH ORDINALITY;
 IF EXISTS(SELECT 1 FROM unnest(ns) n WHERE length(n)>253 OR n<>lower(n) OR n !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$') OR cardinality(ns)<>(SELECT count(DISTINCT n) FROM unnest(ns) n) THEN RETURN jsonb_build_object('ok',false,'error','METADATA_UNVERIFIED');END IF;
 IF jsonb_typeof(p_metadata->'registeredAt') IS DISTINCT FROM 'string' OR jsonb_typeof(p_metadata->'expiresAt') IS DISTINCT FROM 'string' OR jsonb_typeof(p_metadata->'checkedAt') IS DISTINCT FROM 'string' THEN RETURN jsonb_build_object('ok',false,'error','METADATA_UNVERIFIED');END IF;
 registered:=(p_metadata->>'registeredAt')::timestamptz;expires:=(p_metadata->>'expiresAt')::timestamptz;checked:=(p_metadata->>'checkedAt')::timestamptz;
 IF NOT isfinite(registered) OR NOT isfinite(expires) OR NOT isfinite(checked) OR registered>=expires OR registered>checked+interval '5 minutes' OR checked>clock_timestamp()+interval '5 seconds' OR checked<clock_timestamp()-interval '10 minutes' THEN RETURN jsonb_build_object('ok',false,'error','METADATA_UNVERIFIED');END IF;
 INSERT INTO public.domain_management_snapshots_v1(order_id,user_id,nameservers,registrar_registered_at,registrar_expires_at,auto_renew,registrar_checked_at,evidence_sha256) VALUES(o.order_id,o.user_id,ns,registered,expires,(p_metadata->>'autoRenew')::boolean,checked,p_evidence_sha256)
 ON CONFLICT(order_id) DO UPDATE SET nameservers=EXCLUDED.nameservers,registrar_registered_at=EXCLUDED.registrar_registered_at,registrar_expires_at=EXCLUDED.registrar_expires_at,auto_renew=EXCLUDED.auto_renew,registrar_checked_at=EXCLUDED.registrar_checked_at,evidence_sha256=EXCLUDED.evidence_sha256,updated_at=clock_timestamp() WHERE domain_management_snapshots_v1.user_id=EXCLUDED.user_id AND domain_management_snapshots_v1.registrar_checked_at<=EXCLUDED.registrar_checked_at;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','METADATA_OBSERVATION_CONFLICT');END IF;
 UPDATE public.domain_metadata_refresh_jobs_v1 SET claimed_until=NULL,next_check_at=clock_timestamp()+interval '5 hours',result_code='saved' WHERE order_id=p_order_id;
 RETURN jsonb_build_object('ok',true,'orderId',p_order_id,'attemptId',p_attempt_id,'snapshotSaved',true);
EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN RETURN jsonb_build_object('ok',false,'error','METADATA_UNVERIFIED');
END $fn$;
REVOKE ALL ON FUNCTION public.domain_complete_metadata_refresh_v1(text,uuid,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.domain_complete_metadata_refresh_v1(text,uuid,jsonb,text) TO service_role;
COMMENT ON TABLE public.domain_metadata_refresh_jobs_v1 IS 'Private metadata-read reservations only. No registration, purchase, DNS write, expiry extension or email delivery. Backend must use exact provider/account/domain matching and a digest of its sanitized observation. Cron configuration and production enablement require a separate rollout.';
COMMIT;
