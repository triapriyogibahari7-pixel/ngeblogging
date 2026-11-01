CREATE FUNCTION public.domain_observe_production_payment(p_order_id text,p_amount_idr bigint,p_transaction_id text,p_gateway_state text,p_review_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' SET lock_timeout='2s' AS $fn$
DECLARE
 o public.domain_purchase_orders%ROWTYPE; e public.domain_payment_events%ROWTYPE;
 target_state text; event_state text; event_id text; reason text; reused boolean:=false; changed boolean:=false;
BEGIN
 IF current_user<>'service_role' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','SERVER_ONLY'); END IF;
 IF p_order_id IS NULL OR p_order_id!~'^DOM-[a-f0-9]{40}$' OR p_gateway_state IS NULL OR p_gateway_state NOT IN ('pending','authorize','deny','failure','cancel','expire','review_required') THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INVALID_PAYMENT_OBSERVATION'); END IF;
 IF p_gateway_state='review_required' THEN
  IF p_review_reason IS NULL OR p_review_reason NOT IN ('status_unavailable','identity_mismatch','order_mismatch','refund_metadata','gateway_state','recorder_rejected','storage_unavailable','paid_order_gateway_conflict') THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INVALID_REVIEW_REASON'); END IF;
  reason:='midtrans:'||p_review_reason;
 ELSE
  IF p_review_reason IS NOT NULL THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INVALID_REVIEW_REASON'); END IF;
 END IF;
 IF p_transaction_id IS NULL THEN
  IF p_gateway_state<>'review_required' OR p_amount_idr IS NOT NULL THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INVALID_PAYMENT_OBSERVATION'); END IF;
 ELSE
  IF p_transaction_id!~'^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$' OR p_amount_idr IS NULL OR p_amount_idr<1 OR p_amount_idr>1000000000000 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INVALID_PAYMENT_OBSERVATION'); END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('production-domain-midtrans:'||p_transaction_id,0::bigint));
 END IF;
 SELECT * INTO o FROM public.domain_purchase_orders WHERE order_id=p_order_id AND environment='production' FOR UPDATE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','DOMAIN_ORDER_NOT_FOUND'); END IF;
 IF o.currency<>'IDR' OR (p_transaction_id IS NOT NULL AND o.amount_idr IS DISTINCT FROM p_amount_idr) THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','PAYMENT_AMOUNT_MISMATCH'); END IF;
 IF p_transaction_id IS NOT NULL AND ((o.midtrans_transaction_id IS NOT NULL AND o.midtrans_transaction_id IS DISTINCT FROM p_transaction_id) OR EXISTS(SELECT 1 FROM public.domain_purchase_orders WHERE environment='production' AND midtrans_transaction_id=p_transaction_id AND order_id<>p_order_id)) THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','PAYMENT_TRANSACTION_CONFLICT'); END IF;
 target_state:=CASE p_gateway_state WHEN 'pending' THEN 'pending' WHEN 'authorize' THEN 'pending' WHEN 'deny' THEN 'failed' WHEN 'failure' THEN 'failed' WHEN 'cancel' THEN 'cancelled' WHEN 'expire' THEN 'expired' ELSE 'review_required' END;
 event_state:=CASE WHEN target_state='pending' THEN 'pending' WHEN target_state='review_required' THEN 'review_required' ELSE 'failed' END;
 IF o.payment_state<>'pending' AND o.payment_state<>target_state THEN reason:=COALESCE(reason,'midtrans:gateway_state'); END IF;
 IF o.payment_state='pending' AND o.registration_state<>'not_started' THEN target_state:='review_required';reason:=COALESCE(reason,'midtrans:order_mismatch'); END IF;
 IF p_transaction_id IS NOT NULL THEN
  event_id:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.jsonb_build_array('domain-observation-v1','production','midtrans',p_order_id,p_transaction_id,p_gateway_state,p_review_reason)::text,'UTF8')),'hex');
  SELECT * INTO e FROM public.domain_payment_events WHERE event_key=event_id;
  IF FOUND THEN
   IF e.order_id IS DISTINCT FROM p_order_id OR e.environment IS DISTINCT FROM 'production' OR e.provider IS DISTINCT FROM 'midtrans' OR e.currency IS DISTINCT FROM 'IDR' OR e.amount_idr IS DISTINCT FROM p_amount_idr OR e.transaction_id IS DISTINCT FROM p_transaction_id OR e.verified_state IS DISTINCT FROM event_state THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','PAYMENT_EVENT_CONFLICT'); END IF;
   reused:=true;
  END IF;
 END IF;
 IF (o.payment_state='pending' AND o.payment_state IS DISTINCT FROM target_state) OR (reason IS NOT NULL AND o.review_reason IS NULL) OR (p_transaction_id IS NOT NULL AND o.midtrans_transaction_id IS NULL) THEN
  UPDATE public.domain_purchase_orders SET payment_state=CASE WHEN payment_state='pending' THEN target_state ELSE payment_state END,midtrans_transaction_id=COALESCE(midtrans_transaction_id,p_transaction_id),review_reason=COALESCE(review_reason,reason),updated_at=pg_catalog.clock_timestamp() WHERE order_id=p_order_id AND environment='production' RETURNING * INTO o;
  changed:=true;
 END IF;
 IF p_transaction_id IS NOT NULL AND NOT reused THEN
  INSERT INTO public.domain_payment_events(event_key,order_id,environment,provider,currency,amount_idr,transaction_id,verified_state) VALUES(event_id,p_order_id,'production','midtrans','IDR',p_amount_idr,p_transaction_id,event_state);
 END IF;
 RETURN pg_catalog.jsonb_build_object('ok',true,'order_id',o.order_id,'environment','production','currency','IDR','amount_idr',o.amount_idr,'payment_state',o.payment_state,'registration_state',o.registration_state,'review_required',o.review_reason IS NOT NULL OR o.payment_state='review_required','observation_recorded',true,'order_updated',changed,'event_key',event_id,'event_reused',reused,'registration_action_taken',false);
EXCEPTION WHEN unique_violation THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','PAYMENT_RECORD_CONFLICT');
END;
$fn$;
REVOKE ALL ON FUNCTION public.domain_observe_production_payment(text,bigint,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.domain_observe_production_payment(text,bigint,text,text,text) TO service_role;
COMMENT ON FUNCTION public.domain_observe_production_payment(text,bigint,text,text,text) IS 'Backend only. Non-review observations require independently verified Midtrans production status, matching identity and IDR amount. Review-only calls with null transaction and amount mark an existing production order without asserting a transaction. Preserves non-pending payment states, paid_at, registration state and prices. Does not call providers, issue refunds, or register domains.';