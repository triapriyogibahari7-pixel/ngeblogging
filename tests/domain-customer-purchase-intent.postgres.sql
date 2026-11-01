\set ON_ERROR_STOP on
DO $$ BEGIN
 IF current_database()<>'domain_intent_ci' OR EXISTS(SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname='auth') THEN RAISE EXCEPTION 'ISOLATED_EMPTY_CI_DATABASE_REQUIRED'; END IF;
END $$;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE public.sites(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES auth.users(id));
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT ON public.sites TO service_role;
\ir ../server/drafts/domain-customer-purchase-intent.sql
\ir ../server/drafts/domain-customer-purchase-intent-hardening.sql
INSERT INTO auth.users VALUES('11111111-1111-4111-8111-111111111111'),('99999999-9999-4999-8999-999999999999');
INSERT INTO public.sites VALUES('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111'),('99999999-9999-4999-8999-999999999999','99999999-9999-4999-8999-999999999999');
-- Synthetic service-side payload factory: only installed in this throwaway DB.
CREATE FUNCTION public.domain_intent_ci_fixture(k uuid DEFAULT gen_random_uuid(),v uuid DEFAULT gen_random_uuid()) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE t timestamptz:=date_trunc('milliseconds',clock_timestamp()); u text:='11111111-1111-4111-8111-111111111111'; s text:='22222222-2222-4222-8222-222222222222';
BEGIN
 RETURN jsonb_build_object('intentId','DCI-'||substr(encode(sha256(convert_to('production:domain-customer-intent:v1:'||u||':'||k::text,'UTF8')),'hex'),1,40),'idempotencyKey',k,'userId',u,'siteId',s,'domain','example.com','providerId','opensrs','registrarAccountRef','offline-fixture-account','reviewId',v,'reviewDigest',encode(sha256(convert_to(v::text,'UTF8')),'hex'),'reviewIssuedAt',t,'reviewExpiresAt',t+interval '60 seconds',
 'pricing',jsonb_build_object('currency','IDR','amountIdr',128283,'registrarCostIdr',100000,'otherDirectCostsIdr',1000,'paymentCostIdr',2283,'minimumMarginIdr',25000,'pricingVersion','offline-v1','checkedAt',t-interval '1 second','expiresAt',t+interval '60 seconds',
 'fx',jsonb_build_object('base','USD','quote','IDR','rate','20000','source','offline-fixture','costBasisVerified',true,'observedAt',t-interval '2 seconds','expiresAt',t+interval '90 seconds'),
 'policy',jsonb_build_object('taxStatus','verified','costScope','registration_year_1','paymentFeeMode','conservative_ceiling','version','offline-v1','paymentFeeBasisPoints',100,'paymentFixedCostIdr',1000,'otherDirectCostsIdr',1000,'minimumMarginIdr',25000,'sourceRef','offline-fixture','taxSourceRef','offline-fixture','paymentFeeSourceRef','offline-fixture','verifiedAt',t-interval '2 seconds','expiresAt',t+interval '90 seconds')),
 'consent',jsonb_build_object('accepted',true,'version','domain-registration-v1','domain','example.com','siteId',s,'currency','IDR','amountIdr',128283,'years',1));
END $$;
REVOKE ALL ON FUNCTION public.domain_intent_ci_fixture(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.domain_intent_ci_fixture(uuid,uuid) TO service_role;
SET ROLE service_role;
DO $$
DECLARE p jsonb; q jsonb; r jsonb; field text;
BEGIN
 p:=public.domain_intent_ci_fixture();r:=public.domain_prepare_customer_purchase_intent(p);
 IF r->>'ok' IS DISTINCT FROM 'true' OR r->>'reused' IS DISTINCT FROM 'false' OR r->>'state' IS DISTINCT FROM 'prepared_not_payable' OR r->>'purchaseAllowed' IS DISTINCT FROM 'false' OR r->>'checkoutAvailable' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'FIRST_INTENT_FAILED: %',r; END IF;
 r:=public.domain_prepare_customer_purchase_intent(p);
 IF r->>'reused' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'REUSE_FAILED'; END IF;
 q:=jsonb_set(p,'{domain}','"different.example"');r:=public.domain_prepare_customer_purchase_intent(q);
 IF r->>'error' IS DISTINCT FROM 'IDEMPOTENCY_CONFLICT' THEN RAISE EXCEPTION 'CONFLICT_NOT_REJECTED'; END IF;
 q:=public.domain_intent_ci_fixture(gen_random_uuid(),(p->>'reviewId')::uuid);r:=public.domain_prepare_customer_purchase_intent(q);
 IF r->>'error' IS DISTINCT FROM 'REVIEW_ALREADY_CONSUMED' THEN RAISE EXCEPTION 'REPLAY_NOT_REJECTED'; END IF;
 FOREACH field IN ARRAY ARRAY['registrarCostIdr','otherDirectCostsIdr','paymentCostIdr','minimumMarginIdr'] LOOP
  q:=jsonb_set(public.domain_intent_ci_fixture(),ARRAY['pricing',field],'null');
  BEGIN PERFORM public.domain_prepare_customer_purchase_intent(q);RAISE EXCEPTION 'NULL_COST_ACCEPTED: %',field;EXCEPTION WHEN check_violation OR not_null_violation THEN NULL;END;
 END LOOP;
 q:=jsonb_set(public.domain_intent_ci_fixture(),'{pricing,registrarCostIdr}','99999.5');
 BEGIN PERFORM public.domain_prepare_customer_purchase_intent(q);RAISE EXCEPTION 'FRACTIONAL_COST_ACCEPTED';EXCEPTION WHEN check_violation THEN NULL;END;
 q:=public.domain_intent_ci_fixture();q:=jsonb_set(q,'{consent}',(q->'consent')-'domain');
 BEGIN PERFORM public.domain_prepare_customer_purchase_intent(q);RAISE EXCEPTION 'MISSING_CONSENT_DOMAIN_ACCEPTED';EXCEPTION WHEN check_violation THEN NULL;END;
 q:=jsonb_set(public.domain_intent_ci_fixture(),'{pricing,fx,costBasisVerified}','false');
 BEGIN PERFORM public.domain_prepare_customer_purchase_intent(q);RAISE EXCEPTION 'UNVERIFIED_FX_ACCEPTED';EXCEPTION WHEN check_violation THEN NULL;END;
 q:=jsonb_set(public.domain_intent_ci_fixture(),'{pricing,policy,paymentFeeBasisPoints}','0');
 BEGIN PERFORM public.domain_prepare_customer_purchase_intent(q);RAISE EXCEPTION 'FEE_MISMATCH_ACCEPTED';EXCEPTION WHEN check_violation THEN NULL;END;
 q:=jsonb_set(public.domain_intent_ci_fixture(),'{siteId}','"99999999-9999-4999-8999-999999999999"');r:=public.domain_prepare_customer_purchase_intent(q);
 IF r->>'error' IS DISTINCT FROM 'SITE_OWNER_REQUIRED' THEN RAISE EXCEPTION 'WRONG_SITE_OWNER_ACCEPTED'; END IF;
END $$;
RESET ROLE;
SET ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.domain_prepare_customer_purchase_intent('{}');RAISE EXCEPTION 'AUTHENTICATED_RPC_ACCESS';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM 1 FROM public.domain_customer_purchase_intents;RAISE EXCEPTION 'AUTHENTICATED_LEDGER_ACCESS';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
RESET ROLE;
SET ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.domain_prepare_customer_purchase_intent('{}');RAISE EXCEPTION 'ANON_RPC_ACCESS';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
RESET ROLE;
