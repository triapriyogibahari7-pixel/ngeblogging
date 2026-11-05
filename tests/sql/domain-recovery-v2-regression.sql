-- Synthetic fixture only. These helpers never belong in a production migration.
CREATE FUNCTION public.recovery_ci_assert(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $f$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %',label;END IF;END $f$;
CREATE FUNCTION public.recovery_ci_expect(i integer,err text,p jsonb DEFAULT NULL,req uuid DEFAULT NULL,owner uuid DEFAULT '00000000-0000-4000-8000-000000000001') RETURNS void LANGUAGE sql AS $f$
 SELECT public.recovery_ci_assert(public.recovery_ci_accept(i,p,req,owner)->>'error'=err,'expected '||err)
$f$;
CREATE FUNCTION public.recovery_ci_rollback(i integer,p jsonb DEFAULT NULL) RETURNS void LANGUAGE plpgsql AS $f$
DECLARE c public.recovery_ci_cases%ROWTYPE;
BEGIN
 BEGIN
  PERFORM public.recovery_ci_accept(i,p);RAISE EXCEPTION 'Expected atomic rejection';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Atomic recovery registrant validation rejected' THEN RAISE;END IF;END;
 SELECT * INTO STRICT c FROM public.recovery_ci_cases WHERE n=i;
 PERFORM public.recovery_ci_assert(NOT EXISTS(SELECT 1 FROM public.domain_order_recoveries_v1 WHERE order_id=c.order_id) AND EXISTS(SELECT 1 FROM public.domain_purchase_orders WHERE order_id=c.order_id AND quote_id=c.old_quote AND amount_idr=200000) AND EXISTS(SELECT 1 FROM public.domain_registration_jobs WHERE order_id=c.order_id AND quote_id=c.old_quote AND expected_cost_usd=9) AND NOT EXISTS(SELECT 1 FROM public.domain_recovery_snap_reconciliations_v2 WHERE order_id=c.order_id AND used_request_id IS NOT NULL),'quote, registrant, ledger and evidence rollback');
END $f$;
BEGIN;
SELECT public.recovery_ci_seed(i) FROM generate_series(1,12) AS i;
SET LOCAL ROLE service_role;
DO $test$
DECLARE r jsonb;s jsonb;c public.recovery_ci_cases%ROWTYPE;deadline timestamptz;
BEGIN
 PERFORM public.recovery_ci_assert(has_column_privilege('service_role','public.domain_order_recoveries_v1','acceptance_policy','UPDATE') AND NOT has_column_privilege('service_role','public.domain_order_recoveries_v1','accepted_at','UPDATE'),'column-only ledger grant');
 PERFORM public.recovery_ci_evidence(1);r:=public.recovery_ci_accept(1);SELECT * INTO c FROM public.recovery_ci_cases WHERE n=1;deadline:=(r->>'expires_at')::timestamptz;
 PERFORM public.recovery_ci_assert(r->'ok'='true'::jsonb AND r->'registrant_revalidated'='true'::jsonb AND deadline-(r->>'expiry_anchor_at')::timestamptz=interval '2 hours' AND EXISTS(SELECT 1 FROM public.domain_purchase_orders WHERE order_id=c.order_id AND quote_id=c.new_quote AND amount_idr=257000 AND created_at=c.original_created) AND EXISTS(SELECT 1 FROM public.domain_registration_jobs WHERE order_id=c.order_id AND quote_id=c.new_quote AND amount_idr=257000 AND expected_cost_usd=10 AND schema_sha256=repeat('a',64)),'atomic acceptance and two-hour snapshot');
 s:=public.recovery_ci_accept(1);PERFORM public.recovery_ci_assert(s->'reused'='true'::jsonb AND (s->>'expires_at')::timestamptz=deadline AND (SELECT count(*) FROM public.domain_order_recoveries_v1 WHERE order_id=c.order_id)=1,'idempotent retry');
 PERFORM public.recovery_ci_expect(1,'RECOVERY_ACCEPTANCE_CONFLICT',NULL,gen_random_uuid());
 PERFORM public.recovery_ci_expect(2,'GATEWAY_RECONCILIATION_REQUIRED');
 PERFORM public.recovery_ci_evidence(3);PERFORM public.recovery_ci_expect(3,'DOMAIN_ORDER_NOT_FOUND',NULL,NULL,'00000000-0000-4000-8000-000000000002');
 PERFORM public.recovery_ci_evidence(4,true);PERFORM public.recovery_ci_expect(4,'GATEWAY_RECONCILIATION_REQUIRED');
 PERFORM public.recovery_ci_evidence(5);UPDATE public.domain_purchase_orders SET updated_at=updated_at+interval '1 second' WHERE order_id=(SELECT order_id FROM public.recovery_ci_cases WHERE n=5);PERFORM public.recovery_ci_expect(5,'ORDER_CHANGED');
 PERFORM public.recovery_ci_evidence(6);INSERT INTO public.domain_order_cancellations_v1 SELECT order_id FROM public.recovery_ci_cases WHERE n=6;PERFORM public.recovery_ci_expect(6,'ORDER_ALREADY_CANCELLED');
 PERFORM public.recovery_ci_evidence(7);INSERT INTO public.domain_payment_events(event_key,order_id,environment,provider,currency,amount_idr,transaction_id,verified_state) SELECT repeat('e',64),order_id,'production','midtrans','IDR',200000,'fixture-only-pending','pending' FROM public.recovery_ci_cases WHERE n=7;PERFORM public.recovery_ci_expect(7,'GATEWAY_RECONCILIATION_REQUIRED');
 PERFORM public.recovery_ci_evidence(8);UPDATE public.domain_sale_quotes SET expires_at=clock_timestamp()-interval '1 second' WHERE id=(SELECT new_quote FROM public.recovery_ci_cases WHERE n=8);PERFORM public.recovery_ci_expect(8,'RECOVERY_QUOTE_UNVERIFIED');
 PERFORM public.recovery_ci_evidence(9);PERFORM public.recovery_ci_rollback(9,'{}'::jsonb);
 PERFORM public.recovery_ci_evidence(11);PERFORM public.recovery_ci_rollback(11);
 PERFORM public.recovery_ci_evidence(10);PERFORM public.recovery_ci_assert(public.recovery_ci_accept(10)->'ok'='true'::jsonb,'expiry fixture');
 PERFORM public.recovery_ci_evidence(12);PERFORM public.recovery_ci_assert(public.recovery_ci_accept(12)->'ok'='true'::jsonb,'concurrency fixture');
 r:=public.domain_begin_recovery_checkout_v2('00000000-0000-4000-8000-000000000001',c.order_id);
 PERFORM public.recovery_ci_assert(r->>'action'='create' AND r->'duration_minutes'='120'::jsonb AND (r->>'expires_at')::timestamptz=deadline,'checkout creation');
 s:=public.domain_begin_recovery_checkout_v2('00000000-0000-4000-8000-000000000001',c.order_id);PERFORM public.recovery_ci_assert(s->>'error'='CHECKOUT_RECONCILIATION_REQUIRED' AND (SELECT count(*) FROM public.domain_checkout_sessions WHERE order_id=c.order_id)=1,'no second creating claim');
 -- Simulate a saved response ONLY in the fixture. Never call Midtrans.
 UPDATE public.domain_checkout_sessions SET state='ready',snap_token='fixture-token-00000001',checkout_url='https://app.midtrans.com/snap/v2/vtweb/fixture-token-00000001' WHERE order_id=c.order_id;
 UPDATE public.domain_purchase_orders SET snap_token='fixture-token-00000001',checkout_url='https://app.midtrans.com/snap/v2/vtweb/fixture-token-00000001' WHERE order_id=c.order_id;
 s:=public.domain_begin_recovery_checkout_v2('00000000-0000-4000-8000-000000000001',c.order_id);PERFORM public.recovery_ci_assert(s->>'action'='reuse' AND s->>'attempt_id'=r->>'attempt_id' AND (s->>'expires_at')::timestamptz=deadline,'ready retry preserves attempt and deadline');
END $test$;
RESET ROLE;
-- Elapsed-time simulation is privileged fixture setup, not a production audit edit.
UPDATE public.domain_order_recoveries_v1 SET accepted_at=accepted_at-interval '3 hours',payment_window_expires_at=payment_window_expires_at-interval '3 hours',checkout_anchor_at=checkout_anchor_at-interval '3 hours',checkout_expires_at=checkout_expires_at-interval '3 hours' WHERE order_id=(SELECT order_id FROM public.recovery_ci_cases WHERE n=10);
SET LOCAL ROLE service_role;
SELECT public.recovery_ci_assert(public.domain_begin_recovery_checkout_v2('00000000-0000-4000-8000-000000000001',(SELECT order_id FROM public.recovery_ci_cases WHERE n=10))->>'error'='CHECKOUT_WINDOW_EXPIRED','expired window rejected');
COMMIT;
