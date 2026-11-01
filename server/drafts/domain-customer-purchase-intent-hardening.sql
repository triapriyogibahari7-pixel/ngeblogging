-- DRAFT ONLY. Apply after the base draft in an isolated test database first.
-- No production application is authorized by committing this file.
BEGIN;
CREATE FUNCTION public.domain_customer_intent_integer(v jsonb, low bigint, high bigint) RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path='' AS $fn$
 SELECT CASE WHEN pg_catalog.jsonb_typeof(v)='number' THEN COALESCE((v#>>'{}')::numeric BETWEEN low AND high AND (v#>>'{}')::numeric=pg_catalog.trunc((v#>>'{}')::numeric),false) ELSE false END;
$fn$;
REVOKE ALL ON FUNCTION public.domain_customer_intent_integer(jsonb,bigint,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.domain_customer_intent_integer(jsonb,bigint,bigint) TO service_role;
ALTER TABLE public.domain_customer_purchase_intents ADD CONSTRAINT customer_intent_strict_pricing CHECK ((
 public.domain_customer_intent_integer(pricing->'amountIdr',1,1000000000000) AND
 public.domain_customer_intent_integer(pricing->'registrarCostIdr',1,1000000000000) AND
 public.domain_customer_intent_integer(pricing->'otherDirectCostsIdr',0,1000000000000) AND
 public.domain_customer_intent_integer(pricing->'paymentCostIdr',0,1000000000000) AND
 public.domain_customer_intent_integer(pricing->'minimumMarginIdr',25000,1000000000000) AND
 jsonb_typeof(pricing->'pricingVersion')='string' AND length(pricing->>'pricingVersion') BETWEEN 1 AND 100 AND
 jsonb_typeof(pricing->'checkedAt')='string' AND jsonb_typeof(pricing->'expiresAt')='string' AND
 jsonb_typeof(pricing->'fx')='object' AND jsonb_typeof(pricing->'policy')='object'
) IS TRUE);
ALTER TABLE public.domain_customer_purchase_intents ADD CONSTRAINT customer_intent_strict_consent CHECK ((
 consent ?& ARRAY['accepted','version','domain','siteId','currency','amountIdr','years'] AND
 consent @> '{"accepted":true,"version":"domain-registration-v1","currency":"IDR","years":1}'::jsonb AND
 jsonb_typeof(consent->'domain')='string' AND consent->>'domain'=domain AND
 jsonb_typeof(consent->'siteId')='string' AND (consent->>'siteId')::uuid=site_id AND
 public.domain_customer_intent_integer(consent->'amountIdr',1,1000000000000) AND (consent->>'amountIdr')::bigint=amount_idr
) IS TRUE);
ALTER TABLE public.domain_customer_purchase_intents ADD CONSTRAINT customer_intent_fx_context CHECK ((
 pricing->'fx' @> '{"base":"USD","quote":"IDR","costBasisVerified":true}'::jsonb AND
 jsonb_typeof(pricing#>'{fx,rate}')='string' AND pricing#>>'{fx,rate}' ~ '^(0|[1-9][0-9]{0,11})([.][0-9]{1,6})?$' AND
 (pricing#>>'{fx,rate}')::numeric>0 AND (pricing#>>'{fx,rate}')::numeric<=1000000 AND
 jsonb_typeof(pricing#>'{fx,source}')='string' AND length(btrim(pricing#>>'{fx,source}')) BETWEEN 1 AND 200 AND
 (pricing#>>'{fx,observedAt}')::timestamptz<=(pricing->>'checkedAt')::timestamptz AND
 (pricing#>>'{fx,expiresAt}')::timestamptz>(pricing#>>'{fx,observedAt}')::timestamptz AND
 (pricing#>>'{fx,expiresAt}')::timestamptz<=(pricing#>>'{fx,observedAt}')::timestamptz+interval '24 hours' AND
 expires_at<=(pricing#>>'{fx,expiresAt}')::timestamptz
) IS TRUE);
ALTER TABLE public.domain_customer_purchase_intents ADD CONSTRAINT customer_intent_policy_context CHECK ((
 pricing->'policy' @> '{"taxStatus":"verified","costScope":"registration_year_1","paymentFeeMode":"conservative_ceiling"}'::jsonb AND
 pricing#>>'{policy,version}'=pricing->>'pricingVersion' AND
 public.domain_customer_intent_integer(pricing#>'{policy,paymentFeeBasisPoints}',0,9999) AND
 public.domain_customer_intent_integer(pricing#>'{policy,paymentFixedCostIdr}',0,1000000000000) AND
 public.domain_customer_intent_integer(pricing#>'{policy,otherDirectCostsIdr}',0,1000000000000) AND
 public.domain_customer_intent_integer(pricing#>'{policy,minimumMarginIdr}',25000,1000000000000) AND
 (pricing#>>'{policy,otherDirectCostsIdr}')::bigint=(pricing->>'otherDirectCostsIdr')::bigint AND
 (pricing#>>'{policy,minimumMarginIdr}')::bigint=(pricing->>'minimumMarginIdr')::bigint AND
 (pricing->>'paymentCostIdr')::numeric=(pricing#>>'{policy,paymentFixedCostIdr}')::numeric+ceil(amount_idr::numeric*(pricing#>>'{policy,paymentFeeBasisPoints}')::numeric/10000) AND
 length(btrim(pricing#>>'{policy,sourceRef}')) BETWEEN 1 AND 200 AND
 length(btrim(pricing#>>'{policy,taxSourceRef}')) BETWEEN 1 AND 200 AND
 length(btrim(pricing#>>'{policy,paymentFeeSourceRef}')) BETWEEN 1 AND 200 AND
 (pricing#>>'{policy,verifiedAt}')::timestamptz<=(pricing->>'checkedAt')::timestamptz AND expires_at<=(pricing#>>'{policy,expiresAt}')::timestamptz
) IS TRUE);
COMMIT;
