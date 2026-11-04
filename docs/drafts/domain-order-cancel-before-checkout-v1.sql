-- REVIEW DRAFT ONLY. Not applied to Supabase by committing this file.
-- Supports cancellation BEFORE any checkout/payment artifact exists.
-- Existing gateway checkouts require a separate reconciled cancellation flow.
BEGIN;
SET LOCAL lock_timeout='2s';
DO $preflight$
BEGIN
 IF to_regclass('public.domain_order_cancellations_v1') IS NOT NULL OR to_regprocedure('public.domain_cancel_before_checkout_v1(uuid,text)') IS NOT NULL THEN
  RAISE EXCEPTION 'Cancellation contract already exists; stop';
 END IF;
 IF to_regclass('public.domain_purchase_orders') IS NULL OR to_regclass('public.domain_checkout_sessions') IS NULL OR to_regclass('public.domain_payment_events') IS NULL OR to_regclass('public.domain_registration_jobs') IS NULL THEN
  RAISE EXCEPTION 'Required domain tables missing; stop';
 END IF;
END;
$preflight$;
CREATE TABLE public.domain_order_cancellations_v1 (
 order_id text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id),
 environment text NOT NULL CHECK (environment='production'),
 currency text NOT NULL CHECK (currency='IDR'),
 amount_idr bigint NOT NULL CHECK (amount_idr BETWEEN 1 AND 1000000000000),
 scope text NOT NULL CHECK (scope='before_checkout'),
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 FOREIGN KEY (order_id,environment,currency,amount_idr)
  REFERENCES public.domain_purchase_orders(order_id,environment,currency,amount_idr)
);
ALTER TABLE public.domain_order_cancellations_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.domain_order_cancellations_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON TABLE public.domain_order_cancellations_v1 TO service_role;
CREATE FUNCTION public.domain_cancel_before_checkout_v1(p_user_id uuid,p_order_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' SET lock_timeout='2s'
AS $cancel$
DECLARE o public.domain_purchase_orders%ROWTYPE; j public.domain_registration_jobs%ROWTYPE; reused boolean:=false; now_at timestamptz;
BEGIN
 IF current_user<>'service_role' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','SERVER_ONLY');END IF;
 IF p_user_id IS NULL OR p_order_id IS NULL OR p_order_id!~'^DOM-[a-f0-9]{40}$' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INVALID_CANCELLATION_REQUEST');END IF;
 SELECT * INTO o FROM public.domain_purchase_orders WHERE order_id=p_order_id AND user_id=p_user_id AND environment='production' FOR UPDATE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','DOMAIN_ORDER_NOT_FOUND');END IF;
 IF o.currency IS DISTINCT FROM 'IDR' OR o.amount_idr<1 OR o.amount_idr>1000000000000 OR o.payment_state NOT IN ('pending','cancelled') OR o.registration_state<>'not_started' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','ORDER_ALREADY_PROCESSED');END IF;
 IF o.review_reason IS NOT NULL OR o.paid_at IS NOT NULL OR o.registered_at IS NOT NULL OR o.registrar_domain_ref IS NOT NULL THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','ORDER_REVIEW_REQUIRED');END IF;
 IF o.midtrans_transaction_id IS NOT NULL OR o.snap_token IS NOT NULL OR o.checkout_url IS NOT NULL OR EXISTS(SELECT 1 FROM public.domain_checkout_sessions WHERE order_id=p_order_id) OR EXISTS(SELECT 1 FROM public.domain_payment_events WHERE order_id=p_order_id) THEN
  RETURN pg_catalog.jsonb_build_object('ok',false,'error','GATEWAY_CANCELLATION_REQUIRED');
 END IF;
 SELECT * INTO j FROM public.domain_registration_jobs WHERE order_id=p_order_id FOR UPDATE;
 IF FOUND AND (j.user_id IS DISTINCT FROM p_user_id OR j.quote_id IS DISTINCT FROM o.quote_id OR j.amount_idr IS DISTINCT FROM o.amount_idr OR j.state IS DISTINCT FROM 'prepared' OR j.attempt_id IS NOT NULL OR j.post_started_at IS NOT NULL) THEN
  RETURN pg_catalog.jsonb_build_object('ok',false,'error','REGISTRATION_DETAILS_LOCKED');
 END IF;
 IF o.payment_state='cancelled' THEN
  IF NOT EXISTS(SELECT 1 FROM public.domain_order_cancellations_v1 a WHERE a.order_id=p_order_id AND a.user_id=p_user_id AND a.environment='production' AND a.currency='IDR' AND a.amount_idr=o.amount_idr AND a.scope='before_checkout') THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','ORDER_ALREADY_PROCESSED');END IF;
  reused:=true;
 ELSE
  now_at:=pg_catalog.clock_timestamp();
  INSERT INTO public.domain_order_cancellations_v1(order_id,user_id,environment,currency,amount_idr,scope,created_at) VALUES(o.order_id,o.user_id,'production','IDR',o.amount_idr,'before_checkout',now_at);
  UPDATE public.domain_purchase_orders SET payment_state='cancelled',updated_at=now_at WHERE order_id=p_order_id AND user_id=p_user_id AND environment='production' AND payment_state='pending' AND registration_state='not_started' RETURNING * INTO o;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cancellation state changed; rollback';END IF;
 END IF;
 RETURN pg_catalog.jsonb_build_object('ok',true,'order_id',o.order_id,'environment','production','currency','IDR','amount_idr',o.amount_idr,'payment_state',o.payment_state,'registration_state',o.registration_state,'cancelled',true,'reused',reused,'scope','before_checkout','gateway_action_taken',false,'registration_action_taken',false);
END;
$cancel$;
REVOKE ALL ON FUNCTION public.domain_cancel_before_checkout_v1(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.domain_cancel_before_checkout_v1(uuid,text) TO service_role;
COMMIT;
