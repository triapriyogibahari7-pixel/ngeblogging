-- DRAFT ONLY. Requires preflight-v1 and disposable PostgreSQL regression tests.
-- Do not apply or route until registrant revalidation and checkout integration are complete.
-- Caller must verify session, genuine displayed-price consent and authenticated gateway evidence.
-- HTTP 404 alone is not gateway evidence. These assertions must never come from browser input.
-- No gateway calls or checkout sessions are created here; created_at is never reset.
CREATE TABLE public.domain_order_recoveries_v1(
 order_id text PRIMARY KEY REFERENCES public.domain_purchase_orders(order_id),
 request_id uuid NOT NULL UNIQUE,
 user_id uuid NOT NULL REFERENCES auth.users(id),
 site_id uuid NOT NULL,
 previous_quote_id uuid NOT NULL REFERENCES public.domain_sale_quotes(id),
 accepted_quote_id uuid NOT NULL UNIQUE REFERENCES public.domain_sale_quotes(id),
 previous_amount_idr bigint NOT NULL CHECK(previous_amount_idr BETWEEN 1 AND 1000000000000),
 accepted_amount_idr bigint NOT NULL CHECK(accepted_amount_idr BETWEEN 1 AND 1000000000000),
 previous_order_updated_at timestamptz NOT NULL,
 previous_registrant_payload_sha256 text CHECK(previous_registrant_payload_sha256 IS NULL OR previous_registrant_payload_sha256~'^[a-f0-9]{64}$'),
 previous_registrant_consent_at timestamptz,
 gateway_checked_at timestamptz NOT NULL,
 gateway_evidence_sha256 text NOT NULL CHECK(gateway_evidence_sha256~'^[a-f0-9]{64}$'),
 consent_version text NOT NULL CHECK(consent_version='same-order-recovery-2h-v1'),
 accepted_at timestamptz NOT NULL,
 payment_window_expires_at timestamptz NOT NULL,
 CHECK(previous_quote_id<>accepted_quote_id),
 CHECK(payment_window_expires_at=accepted_at+interval '2 hours')
);
ALTER TABLE public.domain_order_recoveries_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.domain_order_recoveries_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.domain_order_recoveries_v1 TO service_role;

CREATE FUNCTION public.domain_accept_order_recovery_v1(
 p_user_id uuid,p_order_id text,p_request_id uuid,p_previous_quote_id uuid,
 p_expected_updated_at timestamptz,p_quote_id uuid,p_amount_idr bigint,
 p_accepted boolean,p_consent_version text,p_gateway_not_found boolean,
 p_gateway_checked_at timestamptz,p_gateway_evidence_sha256 text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' SET lock_timeout='2s' AS $accept$
DECLARE
 o public.domain_purchase_orders%ROWTYPE;
 q public.domain_sale_quotes%ROWTYPE;
 j public.domain_registration_jobs%ROWTYPE;
 a public.domain_order_recoveries_v1%ROWTYPE;
 pre jsonb;v_domain text;now_at timestamptz;
BEGIN
 IF current_user<>'service_role' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','SERVER_ONLY');END IF;
 IF p_user_id IS NULL OR p_order_id IS NULL OR p_order_id!~'^DOM-[a-f0-9]{40}$' OR p_request_id IS NULL OR p_previous_quote_id IS NULL OR p_quote_id IS NULL OR p_quote_id=p_previous_quote_id OR p_expected_updated_at IS NULL OR NOT pg_catalog.isfinite(p_expected_updated_at) OR p_amount_idr IS NULL OR p_amount_idr NOT BETWEEN 1 AND 1000000000000 OR p_accepted IS DISTINCT FROM true OR p_consent_version IS DISTINCT FROM 'same-order-recovery-2h-v1' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INVALID_RECOVERY_ACCEPTANCE');END IF;
 SELECT z.domain INTO v_domain FROM public.domain_purchase_orders x JOIN public.domain_sale_quotes z ON z.id=x.quote_id WHERE x.order_id=p_order_id AND x.user_id=p_user_id AND x.environment='production';
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','DOMAIN_ORDER_NOT_FOUND');END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('production-domain-registration:'||v_domain,0::bigint));
 SELECT * INTO o FROM public.domain_purchase_orders WHERE order_id=p_order_id AND user_id=p_user_id AND environment='production' FOR UPDATE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','DOMAIN_ORDER_NOT_FOUND');END IF;
 SELECT * INTO a FROM public.domain_order_recoveries_v1 WHERE order_id=p_order_id;
 IF FOUND THEN
  IF a.user_id IS DISTINCT FROM p_user_id OR a.request_id IS DISTINCT FROM p_request_id OR a.previous_quote_id IS DISTINCT FROM p_previous_quote_id OR a.previous_order_updated_at IS DISTINCT FROM p_expected_updated_at OR a.accepted_quote_id IS DISTINCT FROM p_quote_id OR a.accepted_amount_idr IS DISTINCT FROM p_amount_idr OR a.consent_version IS DISTINCT FROM p_consent_version OR o.quote_id IS DISTINCT FROM a.accepted_quote_id OR o.amount_idr IS DISTINCT FROM a.accepted_amount_idr THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','RECOVERY_ACCEPTANCE_CONFLICT');END IF;
  RETURN pg_catalog.jsonb_build_object('ok',true,'reused',true,'order_id',a.order_id,'environment','production','quote_id',a.accepted_quote_id,'amount_idr',a.accepted_amount_idr,'currency','IDR','accepted_at',a.accepted_at,'payment_window_expires_at',a.payment_window_expires_at,'registrant_revalidation_required',true,'payment_allowed',false,'checkout_created',false,'registration_action_taken',false);
 END IF;
 IF EXISTS(SELECT 1 FROM public.domain_order_recoveries_v1 WHERE request_id=p_request_id OR accepted_quote_id=p_quote_id) THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','RECOVERY_ACCEPTANCE_CONFLICT');END IF;
 IF o.quote_id IS DISTINCT FROM p_previous_quote_id OR o.updated_at IS DISTINCT FROM p_expected_updated_at THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','ORDER_CHANGED');END IF;
 pre:=public.domain_order_recovery_preflight_v1(p_user_id,p_order_id);
 IF pre->'ok' IS DISTINCT FROM 'true'::jsonb THEN RETURN pre;END IF;
 IF pre->>'order_id' IS DISTINCT FROM p_order_id OR pre->>'domain' IS DISTINCT FROM v_domain OR pre->>'quote_id' IS DISTINCT FROM p_previous_quote_id::text OR pre->>'code' IS DISTINCT FROM 'DOMAIN_ORDER_RECOVERY_QUOTE_REVIEW_REQUIRED' THEN RAISE EXCEPTION 'Recovery preflight contract differs';END IF;
 SELECT * INTO q FROM public.domain_sale_quotes WHERE id=p_quote_id AND user_id=p_user_id AND environment='production' FOR SHARE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','RECOVERY_QUOTE_UNVERIFIED');END IF;
 now_at:=pg_catalog.clock_timestamp();
 IF p_gateway_not_found IS DISTINCT FROM true OR p_gateway_checked_at IS NULL OR NOT pg_catalog.isfinite(p_gateway_checked_at) OR p_gateway_checked_at>now_at OR p_gateway_checked_at<now_at-interval '15 seconds' OR p_gateway_evidence_sha256 IS NULL OR p_gateway_evidence_sha256!~'^[a-f0-9]{64}$' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','GATEWAY_STATUS_UNVERIFIED');END IF;
 IF q.domain IS DISTINCT FROM v_domain OR q.currency IS DISTINCT FROM 'IDR' OR q.sale_price_idr IS DISTINCT FROM p_amount_idr OR q.operation IS DISTINCT FROM 'registration' OR q.provider_id IS DISTINCT FROM 'cloudflare' OR q.years IS DISTINCT FROM 1 OR q.pricing_version IS DISTINCT FROM 'reference-budget-20261103-v1' OR q.checked_at>now_at OR q.expires_at<=now_at+interval '30 seconds' OR q.fx_expires_at<=now_at OR q.cost_basis->'merchant_absorbs_overrun' IS DISTINCT FROM 'true'::jsonb THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','RECOVERY_QUOTE_UNVERIFIED');END IF;
 IF public.domain_reference_quote_valid_v1(q.environment,q.provider_id,q.years,q.sale_price_idr,q.registrar_cost_idr,q.other_direct_costs_idr,q.payment_cost_idr,q.pricing_version,q.cost_basis,q.checked_at,q.expires_at,q.sale_price_usd,q.fx_rate_usd_idr,q.fx_source,q.fx_observed_at,q.fx_expires_at) IS DISTINCT FROM true THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','RECOVERY_QUOTE_UNVERIFIED');END IF;
 IF EXISTS(SELECT 1 FROM public.domain_purchase_orders WHERE quote_id=p_quote_id) THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','RECOVERY_QUOTE_ALREADY_USED');END IF;
 SELECT * INTO j FROM public.domain_registration_jobs WHERE order_id=p_order_id FOR UPDATE;
 INSERT INTO public.domain_order_recoveries_v1(order_id,request_id,user_id,site_id,previous_quote_id,accepted_quote_id,previous_amount_idr,accepted_amount_idr,previous_order_updated_at,previous_registrant_payload_sha256,previous_registrant_consent_at,gateway_checked_at,gateway_evidence_sha256,consent_version,accepted_at,payment_window_expires_at) VALUES(o.order_id,p_request_id,p_user_id,(pre->>'site_id')::uuid,o.quote_id,q.id,o.amount_idr,q.sale_price_idr,o.updated_at,j.payload_sha256,j.consent_at,p_gateway_checked_at,p_gateway_evidence_sha256,p_consent_version,now_at,now_at+interval '2 hours') RETURNING * INTO a;
 UPDATE public.domain_purchase_orders SET quote_id=q.id,amount_idr=q.sale_price_idr,quote_expires_at=q.expires_at,updated_at=now_at WHERE order_id=o.order_id AND user_id=p_user_id AND environment='production';
 -- Keep the old prepared registrant job untouched: its quote mismatch blocks checkout.
 -- Revalidation must later update quote_id, amount, expected cost and genuine consent together.
 RETURN pg_catalog.jsonb_build_object('ok',true,'reused',false,'order_id',o.order_id,'environment','production','quote_id',q.id,'amount_idr',q.sale_price_idr,'currency','IDR','accepted_at',a.accepted_at,'payment_window_expires_at',a.payment_window_expires_at,'registrant_revalidation_required',true,'payment_allowed',false,'checkout_created',false,'registration_action_taken',false);
END;
$accept$;
REVOKE ALL ON FUNCTION public.domain_accept_order_recovery_v1(uuid,text,uuid,uuid,timestamptz,uuid,bigint,boolean,text,boolean,timestamptz,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.domain_accept_order_recovery_v1(uuid,text,uuid,uuid,timestamptz,uuid,bigint,boolean,text,boolean,timestamptz,text) TO service_role;
