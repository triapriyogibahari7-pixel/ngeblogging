BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='30s';

-- Existing orders remain unmarked. No backfill, token reset, or expiry extension.
ALTER TABLE public.domain_purchase_orders
 ADD COLUMN payment_window_policy text,
 ADD COLUMN payment_window_expires_at timestamptz,
 ADD CONSTRAINT domain_order_standard_window_v1 CHECK (
  (payment_window_policy IS NULL AND payment_window_expires_at IS NULL) OR
  (payment_window_policy IS NOT NULL AND payment_window_policy='standard-2h-v1' AND environment='production' AND payment_window_expires_at IS NOT NULL AND created_at=date_trunc('second',created_at) AND payment_window_expires_at=created_at+interval '2 hours')
 ),
 ADD CONSTRAINT domain_order_standard_snapshot_v1 UNIQUE(order_id,created_at,payment_window_expires_at,payment_window_policy);

CREATE FUNCTION public.domain_preserve_standard_window_v1() RETURNS trigger
 LANGUAGE plpgsql SET search_path='' AS $fn$
BEGIN
 IF NEW.payment_window_policy IS DISTINCT FROM OLD.payment_window_policy
 OR NEW.payment_window_expires_at IS DISTINCT FROM OLD.payment_window_expires_at
 OR (OLD.payment_window_policy='standard-2h-v1' AND NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
  RAISE EXCEPTION 'Payment policy and deadline are immutable';
 END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.domain_preserve_standard_window_v1() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER domain_preserve_standard_window_v1 BEFORE UPDATE ON public.domain_purchase_orders
 FOR EACH ROW EXECUTE FUNCTION public.domain_preserve_standard_window_v1();

ALTER TABLE public.domain_checkout_sessions
 ADD COLUMN order_created_at timestamptz,
 ADD COLUMN payment_window_expires_at timestamptz,
 ADD CONSTRAINT checkout_standard_snapshot_v1 FOREIGN KEY(order_id,order_created_at,payment_window_expires_at,payment_window_policy)
 REFERENCES public.domain_purchase_orders(order_id,created_at,payment_window_expires_at,payment_window_policy);

-- Retain both legacy branches verbatim; only add the new standard policy branch.
DO $migration$
DECLARE prior text;
BEGIN
 SELECT pg_get_constraintdef(oid) INTO prior FROM pg_constraint
 WHERE conrelid='public.domain_checkout_sessions'::regclass AND conname='checkout_recovery_window_v2';
 IF prior IS NULL OR position('standard-15m' in prior)=0 OR position('same-order-recovery-2h-v2' in prior)=0 OR position('standard-2h-v1' in prior)>0 THEN
  RAISE EXCEPTION 'Unexpected checkout constraint; stop and review';
 END IF;
 EXECUTE 'ALTER TABLE public.domain_checkout_sessions DROP CONSTRAINT checkout_recovery_window_v2';
 EXECUTE 'ALTER TABLE public.domain_checkout_sessions ADD CONSTRAINT checkout_recovery_window_v2 CHECK ('
 ||substring(prior from 7 for char_length(prior)-7)
 ||' OR (payment_window_policy=''standard-2h-v1'' AND environment=''production'' AND recovery_order_id IS NULL AND order_created_at IS NOT NULL AND payment_window_expires_at IS NOT NULL AND expiry_anchor_at=order_created_at AND expiry_anchor_at<=created_at AND created_at<expires_at AND expires_at=payment_window_expires_at AND expires_at=expiry_anchor_at+interval ''2 hours''))';
END $migration$;

-- Require the audited source fragments. Unexpected deployed definitions abort atomically.
DO $migration$
DECLARE src text; old text; replacement text;
BEGIN
 src:=pg_get_functiondef('public.domain_create_purchase_order(uuid,uuid,uuid,text)'::regprocedure);
 old:='INSERT INTO public.domain_purchase_orders(order_id,quote_id,user_id,environment,currency,amount_idr,quote_expires_at,idempotency_key)';
 replacement:='INSERT INTO public.domain_purchase_orders(order_id,quote_id,user_id,environment,currency,amount_idr,quote_expires_at,idempotency_key,created_at,payment_window_policy,payment_window_expires_at)';
 IF position(old in src)=0 THEN RAISE EXCEPTION 'Order insert signature changed; stop'; END IF;
 src:=replace(src,old,replacement);
 old:='VALUES(expected_id,q.id,p_user_id,p_environment,q.currency,q.sale_price_idr,q.expires_at,p_idempotency_key)';
 replacement:='VALUES(expected_id,q.id,p_user_id,p_environment,q.currency,q.sale_price_idr,q.expires_at,p_idempotency_key,CASE WHEN p_environment=''production'' THEN pg_catalog.date_trunc(''second'',pg_catalog.statement_timestamp()) ELSE pg_catalog.statement_timestamp() END,CASE WHEN p_environment=''production'' THEN ''standard-2h-v1'' ELSE NULL END,CASE WHEN p_environment=''production'' THEN pg_catalog.date_trunc(''second'',pg_catalog.statement_timestamp())+interval ''2 hours'' ELSE NULL END)';
 IF position(old in src)=0 THEN RAISE EXCEPTION 'Order insert values changed; stop'; END IF;
 src:=replace(src,old,replacement);
 old:='''quote_expires_at'',q.expires_at,';
 replacement:='''quote_expires_at'',q.expires_at,''payment_window_policy'',o.payment_window_policy,''payment_window_expires_at'',o.payment_window_expires_at,';
 IF position(old in src)=0 THEN RAISE EXCEPTION 'Order return contract changed; stop'; END IF;
 src:=replace(src,old,replacement);
 EXECUTE src;

 src:=pg_get_functiondef('public.domain_begin_production_checkout(uuid,text)'::regprocedure);
 old:=$old$anchor_at:=pg_catalog.date_trunc('second',now_at);
 limit_at:=LEAST(o.created_at+interval '15 minutes',q.fx_expires_at);
 minutes:=pg_catalog.floor(EXTRACT(EPOCH FROM (limit_at-anchor_at))/60)::integer;
 IF minutes<1 OR minutes>15 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','CHECKOUT_WINDOW_EXPIRED'); END IF;$old$;
 replacement:=$new$IF o.payment_window_policy='standard-2h-v1' THEN
  IF q.cost_basis->'merchant_absorbs_overrun' IS DISTINCT FROM 'true'::jsonb THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','PRODUCTION_QUOTE_UNVERIFIED'); END IF;
  anchor_at:=o.created_at;
  limit_at:=o.payment_window_expires_at;
  IF limit_at IS NULL OR limit_at IS DISTINCT FROM anchor_at+interval '2 hours' OR limit_at<=now_at+interval '30 seconds' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','CHECKOUT_WINDOW_EXPIRED'); END IF;
  minutes:=120;
 ELSE
  anchor_at:=pg_catalog.date_trunc('second',now_at);
  limit_at:=LEAST(o.created_at+interval '15 minutes',q.fx_expires_at);
  minutes:=pg_catalog.floor(EXTRACT(EPOCH FROM (limit_at-anchor_at))/60)::integer;
  IF minutes<1 OR minutes>15 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','CHECKOUT_WINDOW_EXPIRED'); END IF;
 END IF;$new$;
 IF position(old in src)=0 THEN RAISE EXCEPTION 'Checkout window source changed; stop'; END IF;
 src:=replace(src,old,replacement);
 old:='INSERT INTO public.domain_checkout_sessions(order_id,user_id,environment,currency,amount_idr,attempt_id,state,expiry_anchor_at,expires_at)';
 replacement:='INSERT INTO public.domain_checkout_sessions(order_id,user_id,environment,currency,amount_idr,attempt_id,state,expiry_anchor_at,expires_at,payment_window_policy,order_created_at,payment_window_expires_at)';
 IF position(old in src)=0 THEN RAISE EXCEPTION 'Checkout insert signature changed; stop'; END IF;
 src:=replace(src,old,replacement);
 old:='anchor_at,anchor_at+minutes*interval ''1 minute'') RETURNING * INTO s;';
 replacement:='anchor_at,anchor_at+minutes*interval ''1 minute'',COALESCE(o.payment_window_policy,''standard-15m''),CASE WHEN o.payment_window_policy=''standard-2h-v1'' THEN o.created_at ELSE NULL END,o.payment_window_expires_at) RETURNING * INTO s;';
 IF position(old in src)=0 THEN RAISE EXCEPTION 'Checkout insert values changed; stop'; END IF;
 src:=replace(src,old,replacement);
 old:='''expiry_anchor_at'',s.expiry_anchor_at';
 replacement:='''payment_window_policy'',s.payment_window_policy,''order_created_at'',s.order_created_at,''payment_window_expires_at'',s.payment_window_expires_at,''expiry_anchor_at'',s.expiry_anchor_at';
 IF position(old in src)=0 THEN RAISE EXCEPTION 'Checkout return contract changed; stop'; END IF;
 src:=replace(src,old,replacement);
 EXECUTE src;
END $migration$;

COMMENT ON COLUMN public.domain_purchase_orders.payment_window_policy IS 'NULL preserves historical orders. standard-2h-v1 applies only to newly created production orders; no automatic upgrade or recovery.';
COMMENT ON COLUMN public.domain_purchase_orders.payment_window_expires_at IS 'Immutable order-created-at plus two hours. Quote/FX freshness remains an admission-time check; approved merchant budget absorbs later cost changes. Not proof of payment.';
COMMIT;
