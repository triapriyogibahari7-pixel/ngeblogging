-- DRAFT ONLY: not in automatic migrations; not executed by the CI gate.
-- Additive immutable intent ledger. No legacy quotes/orders or payment RPC changes.
-- Service callers must authenticate, verify NDR2 HMAC and prepare fresh pricing first.
-- An intent is not an order or registration permission. Fulfillment remains blocked.
BEGIN;
CREATE TABLE public.domain_customer_purchase_intents (
 intent_id text PRIMARY KEY CHECK (intent_id ~ '^DCI-[a-f0-9]{40}$'),
 user_id uuid NOT NULL REFERENCES auth.users(id), site_id uuid NOT NULL REFERENCES public.sites(id),
 domain text NOT NULL CHECK (domain=lower(domain) AND length(domain) BETWEEN 4 AND 253 AND domain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'),
 provider_id text NOT NULL CHECK (provider_id IN ('cloudflare','opensrs')),
 registrar_account_ref text NOT NULL CHECK (registrar_account_ref ~ '^[A-Za-z0-9_.:-]{1,120}$'),
 review_id uuid NOT NULL UNIQUE, review_digest text NOT NULL UNIQUE CHECK (review_digest ~ '^[a-f0-9]{64}$'),
 idempotency_key uuid NOT NULL, currency text NOT NULL CHECK (currency='IDR'),
 amount_idr bigint NOT NULL CHECK (amount_idr BETWEEN 1 AND 1000000000000),
 review_issued_at timestamptz NOT NULL, review_expires_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
 pricing jsonb NOT NULL, consent jsonb NOT NULL, payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'prepared_not_payable' CHECK (state='prepared_not_payable'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(user_id,idempotency_key),
 CHECK(review_issued_at<=created_at AND created_at<expires_at AND expires_at<=review_expires_at AND review_expires_at>review_issued_at AND review_expires_at<=review_issued_at+interval '2 minutes'),
 CHECK(jsonb_typeof(pricing)='object' AND octet_length(pricing::text)<=16384 AND pricing ?& ARRAY['currency','amountIdr','registrarCostIdr','otherDirectCostsIdr','paymentCostIdr','minimumMarginIdr','pricingVersion','checkedAt','expiresAt','fx','policy']),
 CHECK(pricing->>'currency'='IDR' AND (pricing->>'amountIdr')::bigint=amount_idr AND (pricing->>'expiresAt')::timestamptz=expires_at AND (pricing->>'checkedAt')::timestamptz<=created_at AND expires_at<=(pricing->>'checkedAt')::timestamptz+interval '5 minutes'),
 CHECK((pricing->>'registrarCostIdr')::bigint BETWEEN 1 AND 1000000000000 AND (pricing->>'otherDirectCostsIdr')::bigint BETWEEN 0 AND 1000000000000 AND (pricing->>'paymentCostIdr')::bigint BETWEEN 0 AND 1000000000000 AND (pricing->>'minimumMarginIdr')::bigint BETWEEN 25000 AND 1000000000000 AND amount_idr-(pricing->>'registrarCostIdr')::bigint-(pricing->>'otherDirectCostsIdr')::bigint-(pricing->>'paymentCostIdr')::bigint >= (pricing->>'minimumMarginIdr')::bigint),
 CHECK(jsonb_typeof(consent)='object' AND consent @> '{"accepted":true,"version":"domain-registration-v1","currency":"IDR","years":1}'::jsonb AND consent->>'domain'=domain AND (consent->>'siteId')::uuid=site_id AND (consent->>'amountIdr')::bigint=amount_idr)
);
ALTER TABLE public.domain_customer_purchase_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.domain_customer_purchase_intents FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON public.domain_customer_purchase_intents TO service_role;
CREATE FUNCTION public.domain_prepare_customer_purchase_intent(p_input jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' SET lock_timeout='2s' AS $fn$
DECLARE r public.domain_customer_purchase_intents%ROWTYPE; u uuid; s uuid; k uuid; v uuid; name text; fingerprint text; result_reused boolean:=false;
BEGIN
 IF current_user<>'service_role' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','SERVER_ONLY'); END IF;
 IF pg_catalog.jsonb_typeof(p_input) IS DISTINCT FROM 'object' OR pg_catalog.octet_length(p_input::text)>24576 THEN RAISE EXCEPTION 'INVALID_PURCHASE_INTENT'; END IF;
 IF NOT (p_input ?& ARRAY['intentId','idempotencyKey','userId','siteId','domain','providerId','registrarAccountRef','reviewId','reviewDigest','reviewIssuedAt','reviewExpiresAt','pricing','consent']) OR p_input-ARRAY['intentId','idempotencyKey','userId','siteId','domain','providerId','registrarAccountRef','reviewId','reviewDigest','reviewIssuedAt','reviewExpiresAt','pricing','consent']<>'{}'::jsonb THEN RAISE EXCEPTION 'INVALID_PURCHASE_INTENT'; END IF;
 u:=(p_input->>'userId')::uuid;s:=(p_input->>'siteId')::uuid;k:=(p_input->>'idempotencyKey')::uuid;v:=(p_input->>'reviewId')::uuid;
 IF u IS NULL OR s IS NULL OR k IS NULL OR v IS NULL OR NOT EXISTS(SELECT 1 FROM public.sites WHERE id=s AND owner_id=u) THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','SITE_OWNER_REQUIRED'); END IF;
 name:='DCI-'||pg_catalog.substr(pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to('production:domain-customer-intent:v1:'||u::text||':'||k::text,'UTF8')),'hex'),1,40);
 IF p_input->>'intentId' IS DISTINCT FROM name THEN RAISE EXCEPTION 'INVALID_INTENT_ID'; END IF;
 fingerprint:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_input::text,'UTF8')),'hex');
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('customer-intent-key:'||u::text||':'||k::text,0::bigint));
 SELECT * INTO r FROM public.domain_customer_purchase_intents WHERE user_id=u AND idempotency_key=k;
 IF FOUND THEN
  IF r.payload_hash IS DISTINCT FROM fingerprint THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','IDEMPOTENCY_CONFLICT'); END IF;
  IF r.expires_at<=pg_catalog.clock_timestamp() THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INTENT_EXPIRED'); END IF;
  result_reused:=true;
 ELSE
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('customer-intent-review:'||v::text,0::bigint));
  IF EXISTS(SELECT 1 FROM public.domain_customer_purchase_intents WHERE review_id=v OR review_digest=p_input->>'reviewDigest') THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','REVIEW_ALREADY_CONSUMED'); END IF;
  INSERT INTO public.domain_customer_purchase_intents(intent_id,user_id,site_id,domain,provider_id,registrar_account_ref,review_id,review_digest,idempotency_key,currency,amount_idr,review_issued_at,review_expires_at,expires_at,pricing,consent,payload_hash)
  VALUES(name,u,s,p_input->>'domain',p_input->>'providerId',p_input->>'registrarAccountRef',v,p_input->>'reviewDigest',k,'IDR',(p_input->'pricing'->>'amountIdr')::bigint,(p_input->>'reviewIssuedAt')::timestamptz,(p_input->>'reviewExpiresAt')::timestamptz,(p_input->'pricing'->>'expiresAt')::timestamptz,p_input->'pricing',p_input->'consent',fingerprint) RETURNING * INTO r;
 END IF;
 RETURN pg_catalog.jsonb_build_object('ok',true,'intentId',r.intent_id,'siteId',r.site_id,'domain',r.domain,'currency','IDR','amountIdr',r.amount_idr,'state',r.state,'expiresAt',r.expires_at,'reused',result_reused,'purchaseAllowed',false,'checkoutAvailable',false);
END;
$fn$;
REVOKE ALL ON FUNCTION public.domain_prepare_customer_purchase_intent(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.domain_prepare_customer_purchase_intent(jsonb) TO service_role;
COMMIT;
-- SQL execution, concurrency tests, RLS/policy/trigger audits and fulfillment
-- capability validation remain required before any deployment or payable state.
