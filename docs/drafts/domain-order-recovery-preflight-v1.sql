-- DRAFT ONLY. Not an automatic migration and not a complete recovery implementation.
-- No order updates, checkout creation, gateway requests or registration requests.
-- A successful preflight authorizes quote review only, never payment or recovery.
-- Final acceptance must recheck all evidence under a transaction locking the order.
-- The backend must derive p_user_id from a verified session, not browser input.
CREATE OR REPLACE FUNCTION public.domain_order_recovery_preflight_v1(p_user_id uuid,p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
SET lock_timeout TO '2s'
AS $function$
DECLARE
 o public.domain_purchase_orders%ROWTYPE;
 q public.domain_sale_quotes%ROWTYPE;
 b public.domain_order_site_bindings%ROWTYPE;
 j public.domain_registration_jobs%ROWTYPE;
 site_owner uuid;
 now_at timestamptz;
BEGIN
 IF current_user<>'service_role' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','SERVER_ONLY');END IF;
 IF p_user_id IS NULL OR p_order_id IS NULL OR p_order_id!~'^DOM-[a-f0-9]{40}$' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INVALID_RECOVERY_REQUEST');END IF;
 SELECT * INTO o FROM public.domain_purchase_orders WHERE order_id=p_order_id AND user_id=p_user_id AND environment='production' FOR SHARE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','DOMAIN_ORDER_NOT_FOUND');END IF;
 IF o.payment_state IS DISTINCT FROM 'pending' OR o.registration_state IS DISTINCT FROM 'not_started' OR o.currency IS DISTINCT FROM 'IDR' OR o.review_reason IS NOT NULL OR o.paid_at IS NOT NULL OR o.registered_at IS NOT NULL OR o.registrar_domain_ref IS NOT NULL THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','ORDER_RECOVERY_REVIEW_REQUIRED');END IF;
 IF o.midtrans_transaction_id IS NOT NULL OR o.snap_token IS NOT NULL OR o.checkout_url IS NOT NULL OR EXISTS(SELECT 1 FROM public.domain_checkout_sessions WHERE order_id=p_order_id) OR EXISTS(SELECT 1 FROM public.domain_payment_events WHERE order_id=p_order_id) THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','GATEWAY_RECONCILIATION_REQUIRED');END IF;
 IF EXISTS(SELECT 1 FROM public.domain_order_cancellations_v1 WHERE order_id=p_order_id) THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','ORDER_ALREADY_CANCELLED');END IF;
 SELECT * INTO b FROM public.domain_order_site_bindings WHERE order_id=p_order_id;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','ORDER_SITE_BINDING_REQUIRED');END IF;
 IF b.user_id IS DISTINCT FROM p_user_id OR b.environment IS DISTINCT FROM 'production' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','ORDER_SITE_BINDING_UNVERIFIED');END IF;
 SELECT owner_id INTO site_owner FROM public.sites WHERE id=b.site_id FOR SHARE;
 IF NOT FOUND OR site_owner IS DISTINCT FROM p_user_id THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','SITE_OWNER_REQUIRED');END IF;
 SELECT * INTO q FROM public.domain_sale_quotes WHERE id=o.quote_id AND user_id=p_user_id AND environment='production';
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','QUOTE_SNAPSHOT_MISMATCH');END IF;
 IF q.currency IS DISTINCT FROM o.currency OR q.sale_price_idr IS DISTINCT FROM o.amount_idr OR q.expires_at IS DISTINCT FROM o.quote_expires_at OR q.provider_id IS DISTINCT FROM 'cloudflare' OR q.operation IS DISTINCT FROM 'registration' OR q.years IS DISTINCT FROM 1 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','QUOTE_SNAPSHOT_MISMATCH');END IF;
 SELECT * INTO j FROM public.domain_registration_jobs WHERE order_id=p_order_id FOR SHARE;
 IF FOUND THEN
  IF j.user_id IS DISTINCT FROM p_user_id OR j.quote_id IS DISTINCT FROM o.quote_id OR j.domain IS DISTINCT FROM q.domain OR j.amount_idr IS DISTINCT FROM o.amount_idr OR j.state IS DISTINCT FROM 'prepared' OR j.attempt_id IS NOT NULL OR j.post_started_at IS NOT NULL OR j.provider_state IS NOT NULL OR j.provider_resource_ref IS NOT NULL OR j.evidence_sha256 IS NOT NULL OR j.review_code IS NOT NULL THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','REGISTRATION_RECONCILIATION_REQUIRED');END IF;
 END IF;
 now_at:=pg_catalog.clock_timestamp();
 IF o.created_at>now_at THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','CHECKOUT_CLOCK_UNAVAILABLE');END IF;
 IF now_at<o.created_at+interval '15 minutes' AND q.expires_at>now_at AND q.fx_expires_at>now_at THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','RECOVERY_NOT_REQUIRED');END IF;
 RETURN pg_catalog.jsonb_build_object('ok',true,'code','DOMAIN_ORDER_RECOVERY_QUOTE_REVIEW_REQUIRED','version','same-order-recovery-preflight-v1','environment','production','order_id',o.order_id,'site_id',b.site_id,'domain',q.domain,'quote_id',o.quote_id,'currency',o.currency,'amount_idr',o.amount_idr,'order_updated_at',o.updated_at,'checked_at',now_at,'quote_review_allowed',true,'fresh_quote_required',true,'price_consent_required',true,'registrant_revalidation_required',true,'gateway_status_verified',false,'recovery_allowed',false,'payment_allowed',false,'replacement_order_allowed',false,'order_changed',false,'checkout_created',false,'registration_action_taken',false);
END;
$function$;
REVOKE ALL ON FUNCTION public.domain_order_recovery_preflight_v1(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.domain_order_recovery_preflight_v1(uuid,text) TO service_role;
