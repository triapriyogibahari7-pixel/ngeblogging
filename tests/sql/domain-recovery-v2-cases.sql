-- Synthetic data in disposable PostgreSQL only. Never install in Supabase.
CREATE TABLE public.recovery_ci_cases(n integer PRIMARY KEY,order_id text,old_quote uuid,new_quote uuid,request_id uuid,expected_updated timestamptz,original_created timestamptz,payload jsonb);
CREATE FUNCTION public.recovery_ci_seed(i integer) RETURNS void LANGUAGE plpgsql AS $fn$
DECLARE t timestamptz:=date_trunc('milliseconds',clock_timestamp());oq uuid:=gen_random_uuid();nq uuid:=gen_random_uuid();sid uuid:=gen_random_uuid();oid text:='DOM-'||lpad(to_hex(i),40,'0');dom text:='case'||CASE WHEN i=11 THEN '1' ELSE i::text END||'.test';p jsonb;c jsonb;stamp text;
BEGIN
 stamp:=to_char(t AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 c:='{"source_ref":"merchant-approved:reference-budget-20261103-v1","pricing_mode":"public_reference_budget","policy_version":"reference-budget-20261103-v1","actual_costs_verified":false,"net_margin_guaranteed":false,"merchant_absorbs_overrun":true,"fixture_only":false,"tax_status":"not_assessed","payment_fee_mode":"merchant_budget","registrar_reserve_basis_points":2000,"payment_reserve_basis_points":400,"payment_fixed_reserve_idr":5000,"target_margin_idr":25000,"rounding_increment_idr":1000,"provider_price_currency":"USD","provider_price_amount":"10","fx_cost_basis_verified":false,"usd_display_is_reference":true}'::jsonb||jsonb_build_object('provider_checked_at',stamp,'fx_retrieved_at',stamp,'fx_reference_date',to_char(t AT TIME ZONE 'UTC','YYYY-MM-DD'));
 INSERT INTO public.domain_sale_quotes(id,user_id,environment,currency,sale_price_idr,expires_at,domain,operation,checked_at,fx_expires_at) VALUES(oq,'00000000-0000-4000-8000-000000000001','production','IDR',200000,t-interval '30 minutes',dom,'registration',t-interval '31 minutes',t-interval '30 minutes');
 INSERT INTO public.domain_sale_quotes(id,user_id,environment,currency,sale_price_idr,expires_at,domain,operation,checked_at,pricing_version,cost_basis,registrar_cost_idr,other_direct_costs_idr,payment_cost_idr,sale_price_usd,fx_rate_usd_idr,fx_source,fx_observed_at,fx_expires_at) VALUES(nq,'00000000-0000-4000-8000-000000000001','production','IDR',257000,t+interval '55 seconds',dom,'registration',t,'reference-budget-20261103-v1',c,180000,36000,15280,14.28,18000,'ECB reference via Frankfurter',t,t+interval '5 minutes');
 INSERT INTO public.domain_purchase_orders(order_id,quote_id,user_id,environment,currency,amount_idr,quote_expires_at,created_at,updated_at) VALUES(oid,oq,'00000000-0000-4000-8000-000000000001','production','IDR',200000,t-interval '30 minutes',t-interval '1 hour',t-interval '55 minutes');
 INSERT INTO public.sites VALUES(sid,'00000000-0000-4000-8000-000000000001');
 INSERT INTO public.domain_order_site_bindings VALUES(oid,'00000000-0000-4000-8000-000000000001','production',sid);
 p:=jsonb_build_object('domain_name',dom,'years',1,'auto_renew',false,'privacy_mode','redaction','contacts',jsonb_build_object('registrant',jsonb_build_object('email','fixture@example.invalid','phone','+62.8123456789','postal_info',jsonb_build_object('name','Fixture Person','address',jsonb_build_object('street','Fixture street','city','Fixture city','state','Fixture state','postal_code','12345','country_code','ID')))));
 INSERT INTO public.domain_registration_jobs(order_id,user_id,quote_id,domain,amount_idr,expected_cost_usd,payload,payload_sha256,schema_sha256,terms_version,consent_at) VALUES(oid,'00000000-0000-4000-8000-000000000001',oq,dom,200000,9,p,encode(sha256(convert_to(p::text,'UTF8')),'hex'),repeat('b',64),'cloudflare-domain-registration-2026-08-20',t-interval '1 hour');
 INSERT INTO public.recovery_ci_cases VALUES(i,oid,oq,nq,gen_random_uuid(),t-interval '55 minutes',t-interval '1 hour',p);
END $fn$;
CREATE FUNCTION public.recovery_ci_evidence(i integer,stale boolean DEFAULT false) RETURNS void LANGUAGE plpgsql AS $fn$
DECLARE f public.recovery_ci_cases%ROWTYPE;t timestamptz:=clock_timestamp()-CASE WHEN stale THEN interval '1 minute' ELSE interval '0 seconds' END;
BEGIN
 SELECT * INTO STRICT f FROM public.recovery_ci_cases WHERE n=i;
 INSERT INTO public.domain_recovery_snap_reconciliations_v2(order_id,user_id,previous_quote_id,previous_amount_idr,order_updated_at,merchant_id,source,evidence_sha256,reviewer_id,verified_at,valid_until,no_snap_checkout_confirmed) VALUES(f.order_id,'00000000-0000-4000-8000-000000000001',f.old_quote,200000,f.expected_updated,'M190228985','merchant-dashboard-snap-reconciliation',repeat('c',64),'00000000-0000-4000-8000-000000000001',t,t+interval '15 seconds',true);
END $fn$;
CREATE FUNCTION public.recovery_ci_accept(i integer,p jsonb DEFAULT NULL,req uuid DEFAULT NULL,owner uuid DEFAULT '00000000-0000-4000-8000-000000000001') RETURNS jsonb LANGUAGE plpgsql AS $fn$
DECLARE f public.recovery_ci_cases%ROWTYPE;
BEGIN
 SELECT * INTO STRICT f FROM public.recovery_ci_cases WHERE n=i;
 RETURN public.domain_accept_order_recovery_v2(owner,f.order_id,COALESCE(req,f.request_id),f.old_quote,f.expected_updated,f.new_quote,257000,COALESCE(p,f.payload),repeat('a',64),'cloudflare-domain-registration-2026-08-20',true,clock_timestamp(),repeat('d',64));
END $fn$;
GRANT SELECT ON public.recovery_ci_cases TO service_role;
