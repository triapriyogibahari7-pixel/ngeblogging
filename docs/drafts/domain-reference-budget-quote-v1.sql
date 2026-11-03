-- REVIEW CANDIDATE ONLY. Not installed automatically; requires separate migration approval.
-- No customer data, payment calls, registration calls or changes to ownership/RLS grants.
BEGIN;
SET LOCAL lock_timeout='2s';
DO $preflight$
DECLARE r record; actual text;
BEGIN
 FOR r IN SELECT * FROM (VALUES
 ('public.domain_begin_production_checkout(uuid,text)','d264a65ba492fdf8dfa1e7572af06a8ca8305ca17ff0511cdcb60a0f53c29404'),
 ('public.domain_begin_site_production_checkout(uuid,text)','8e280e9fe07e8f6c7acd274283bc9df39355c2ac0cfeac89f2fe1a3498cb88ac')
 ) approved(signature,sha256) LOOP
  IF to_regprocedure(r.signature) IS NULL THEN RAISE EXCEPTION 'Required checkout RPC missing';END IF;
  actual:=encode(sha256(convert_to(pg_get_functiondef(to_regprocedure(r.signature)::oid),'UTF8')),'hex');
  IF actual<>r.sha256 THEN RAISE EXCEPTION 'Checkout RPC changed since audit; stop';END IF;
 END LOOP;
 IF to_regprocedure('public.domain_reference_budget_quote_valid_v1(jsonb)') IS NOT NULL THEN RAISE EXCEPTION 'Reference validator already exists; stop';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.domain_sale_quotes') AND relrowsecurity) THEN RAISE EXCEPTION 'Quote RLS missing; stop';END IF;
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('public.domain_sale_quotes') AND NOT tgisinternal) THEN RAISE EXCEPTION 'Quote triggers changed since audit; stop';END IF;
 IF (SELECT pg_get_constraintdef(oid,true) FROM pg_constraint WHERE conrelid='public.domain_sale_quotes'::regclass AND conname='domain_quote_usd_idr_match_check') IS DISTINCT FROM $expected$CHECK (sale_price_idr::numeric = ceil(sale_price_usd * fx_rate_usd_idr))$expected$ THEN RAISE EXCEPTION 'USD/IDR constraint changed since audit; stop';END IF;
END;
$preflight$;
CREATE FUNCTION public.domain_reference_budget_quote_valid_v1(j jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE STRICT SECURITY INVOKER SET search_path='' SET timezone='UTC' SET datestyle='ISO, YMD'
AS $validator$
DECLARE c jsonb; r numeric; reserve numeric; sale numeric; fee numeric; rate numeric; amount_usd numeric; expected_sale numeric; checked timestamptz; expires timestamptz; observed timestamptz; fx_expires timestamptz; provider_checked timestamptz; reference_date date;
BEGIN
 c:=j->'cost_basis';
 IF jsonb_typeof(c) IS DISTINCT FROM 'object' OR NOT COALESCE(c @> '{"source_ref":"merchant-approved:reference-budget-20261103-v1","pricing_mode":"public_reference_budget","policy_version":"reference-budget-20261103-v1","actual_costs_verified":false,"net_margin_guaranteed":false,"merchant_absorbs_overrun":true,"fixture_only":false,"tax_status":"not_assessed","payment_fee_mode":"merchant_budget","registrar_reserve_basis_points":2000,"payment_reserve_basis_points":400,"payment_fixed_reserve_idr":5000,"target_margin_idr":25000,"rounding_increment_idr":1000,"provider_price_currency":"USD","fx_cost_basis_verified":false,"usd_display_is_reference":true}'::jsonb,false) THEN RETURN false;END IF;
 IF c ? 'fixtureOnly' OR c ? 'referenceOnly' OR c ? 'tax_source_ref' OR c ? 'payment_fee_source_ref' THEN RETURN false;END IF;
 IF j->>'environment' IS DISTINCT FROM 'production' OR j->>'provider_id' IS DISTINCT FROM 'cloudflare' OR j->>'operation' IS DISTINCT FROM 'registration' OR j->>'years' IS DISTINCT FROM '1' OR j->>'currency' IS DISTINCT FROM 'IDR' OR j->>'display_currency' IS DISTINCT FROM 'USD' OR j->>'pricing_version' IS DISTINCT FROM 'reference-budget-20261103-v1' OR j->>'fx_source' IS DISTINCT FROM 'ECB reference via Frankfurter' THEN RETURN false;END IF;
 IF NOT (COALESCE(c->>'provider_price_amount','') ~ '^(0|[1-9][0-9]{0,11})([.][0-9]{1,6})?$') OR NOT (COALESCE(c->>'fx_reference_date','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') THEN RETURN false;END IF;
 amount_usd:=(c->>'provider_price_amount')::numeric;rate:=(j->>'fx_rate_usd_idr')::numeric;
 IF amount_usd IS NULL OR rate IS NULL OR amount_usd<=0 OR rate<=0 OR rate>1000000 OR rate<>round(rate,6) THEN RETURN false;END IF;
 r:=ceil(amount_usd*rate);reserve:=ceil(r*2000/10000);
 expected_sale:=ceil(((r+reserve+25000+5000)*10000/9600)/1000)*1000;
 sale:=(j->>'sale_price_idr')::numeric;fee:=5000+ceil(sale*400/10000);
 IF sale IS NULL OR r<1 OR expected_sale>1000000000000 OR sale IS DISTINCT FROM expected_sale OR (j->>'registrar_cost_idr')::numeric IS DISTINCT FROM r OR (j->>'other_direct_costs_idr')::numeric IS DISTINCT FROM reserve OR (j->>'payment_cost_idr')::numeric IS DISTINCT FROM fee OR sale-r-reserve-fee<25000 OR (j->>'sale_price_usd')::numeric IS DISTINCT FROM round(sale/rate,2) THEN RETURN false;END IF;
 checked:=(j->>'checked_at')::timestamptz;expires:=(j->>'expires_at')::timestamptz;observed:=(j->>'fx_observed_at')::timestamptz;fx_expires:=(j->>'fx_expires_at')::timestamptz;provider_checked:=(c->>'provider_checked_at')::timestamptz;reference_date:=(c->>'fx_reference_date')::date;
 IF checked IS NULL OR expires IS NULL OR observed IS NULL OR fx_expires IS NULL OR provider_checked IS NULL OR NOT isfinite(checked) OR NOT isfinite(expires) OR NOT isfinite(observed) OR NOT isfinite(fx_expires) OR NOT isfinite(provider_checked) OR provider_checked>checked OR checked-provider_checked>=interval '60 seconds' OR expires<=checked OR expires>provider_checked+interval '60 seconds' OR observed>checked OR fx_expires<=observed OR fx_expires-observed>interval '5 minutes' OR expires>fx_expires OR (c->>'fx_retrieved_at')::timestamptz IS DISTINCT FROM observed OR reference_date>checked::date OR checked::date-reference_date>7 THEN RETURN false;END IF;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END;
$validator$;
REVOKE ALL ON FUNCTION public.domain_reference_budget_quote_valid_v1(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.domain_reference_budget_quote_valid_v1(jsonb) TO service_role;
ALTER TABLE public.domain_sale_quotes ADD CONSTRAINT domain_quote_versioned_amount_v1_check CHECK (
 CASE WHEN cost_basis->>'pricing_mode'='public_reference_budget' THEN
 public.domain_reference_budget_quote_valid_v1(jsonb_build_object('environment',environment,'provider_id',provider_id,'operation',operation,'years',years,'currency',currency,'display_currency',display_currency,'pricing_version',pricing_version,'sale_price_idr',sale_price_idr,'registrar_cost_idr',registrar_cost_idr,'other_direct_costs_idr',other_direct_costs_idr,'payment_cost_idr',payment_cost_idr,'sale_price_usd',sale_price_usd,'fx_rate_usd_idr',fx_rate_usd_idr,'fx_source',fx_source,'checked_at',checked_at,'expires_at',expires_at,'fx_observed_at',fx_observed_at,'fx_expires_at',fx_expires_at,'cost_basis',cost_basis)) IS TRUE
 ELSE sale_price_idr::numeric=ceil(sale_price_usd*fx_rate_usd_idr) END
) NOT VALID;
ALTER TABLE public.domain_sale_quotes VALIDATE CONSTRAINT domain_quote_versioned_amount_v1_check;
ALTER TABLE public.domain_sale_quotes DROP CONSTRAINT domain_quote_usd_idr_match_check;
DO $patch$
DECLARE source text; candidate text; needle text:=$old$ IF COALESCE(q.cost_basis->>'fixture_only'='true',false) OR q.cost_basis->>'tax_status' IS DISTINCT FROM 'verified' OR pg_catalog.jsonb_typeof(q.cost_basis->'tax_source_ref') IS DISTINCT FROM 'string' OR pg_catalog.btrim(COALESCE(q.cost_basis->>'tax_source_ref',''))='' OR pg_catalog.jsonb_typeof(q.cost_basis->'payment_fee_source_ref') IS DISTINCT FROM 'string' OR pg_catalog.btrim(COALESCE(q.cost_basis->>'payment_fee_source_ref',''))='' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','PRODUCTION_QUOTE_UNVERIFIED'); END IF;$old$;
BEGIN
 source:=pg_get_functiondef('public.domain_begin_production_checkout(uuid,text)'::regprocedure);
 IF encode(sha256(convert_to(source,'UTF8')),'hex')<>'d264a65ba492fdf8dfa1e7572af06a8ca8305ca17ff0511cdcb60a0f53c29404' OR (length(source)-length(replace(source,needle,'')))/length(needle)<>1 THEN RAISE EXCEPTION 'Checkout definition or guard anchor changed; stop';END IF;
 candidate:=replace(source,needle,$new$ IF q.cost_basis ? 'pricing_mode' THEN
  IF q.cost_basis->>'pricing_mode' IS DISTINCT FROM 'public_reference_budget' OR public.domain_reference_budget_quote_valid_v1(pg_catalog.to_jsonb(q)) IS NOT TRUE THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','PRODUCTION_QUOTE_UNVERIFIED');END IF;
 ELSE
$new$||needle||E'\n END IF;');
 EXECUTE candidate;
 IF pg_get_functiondef('public.domain_begin_site_production_checkout(uuid,text)'::regprocedure) IS NULL OR encode(sha256(convert_to(pg_get_functiondef('public.domain_begin_site_production_checkout(uuid,text)'::regprocedure),'UTF8')),'hex')<>'8e280e9fe07e8f6c7acd274283bc9df39355c2ac0cfeac89f2fe1a3498cb88ac' THEN RAISE EXCEPTION 'Site ownership wrapper changed; stop';END IF;
 IF has_function_privilege('anon','public.domain_begin_production_checkout(uuid,text)','EXECUTE') OR has_function_privilege('authenticated','public.domain_begin_production_checkout(uuid,text)','EXECUTE') OR NOT has_function_privilege('service_role','public.domain_begin_production_checkout(uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'Checkout execution permissions differ; stop';END IF;
END;
$patch$;
-- This preserves the existing payment window and registration/site/session guards.
-- Order creation, UI, endpoint wiring and isolated PostgreSQL acceptance remain release gates.
COMMIT;
