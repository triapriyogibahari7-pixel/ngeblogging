-- Disposable PostgreSQL only, AFTER prerequisites and candidate SQL.
-- Catalog and negative-input checks, not transactional fixture coverage.
BEGIN;
DO $test$
DECLARE signature text;definition text;
BEGIN
 FOREACH signature IN ARRAY ARRAY['public.domain_accept_order_recovery_v2(uuid,text,uuid,uuid,timestamptz,uuid,bigint,jsonb,text,text,boolean,timestamptz,text)','public.domain_begin_recovery_checkout_v2(uuid,text)'] LOOP
  IF to_regprocedure(signature) IS NULL THEN RAISE EXCEPTION 'Missing candidate function: %',signature;END IF;
  IF has_function_privilege('anon',signature,'EXECUTE') OR has_function_privilege('authenticated',signature,'EXECUTE') OR NOT has_function_privilege('service_role',signature,'EXECUTE') THEN RAISE EXCEPTION 'RPC ACL invalid';END IF;
  IF (SELECT prosecdef FROM pg_proc WHERE oid=to_regprocedure(signature)) THEN RAISE EXCEPTION 'Unexpected security definer';END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.domain_checkout_sessions'::regclass AND conname='checkout_recovery_snapshot_v2' AND contype='f' AND convalidated) THEN RAISE EXCEPTION 'Missing validated recovery snapshot FK';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.domain_checkout_sessions'::regclass AND conname='checkout_recovery_window_v2' AND contype='c' AND convalidated) THEN RAISE EXCEPTION 'Missing bounded window constraint';END IF;
 definition:=pg_get_functiondef('public.domain_save_production_registration_details(uuid,text,jsonb,text,text,boolean)'::regprocedure);
 IF position('quote_id=EXCLUDED.quote_id,amount_idr=EXCLUDED.amount_idr,expected_cost_usd=EXCLUDED.expected_cost_usd' IN definition)=0 OR position('public.domain_recovery_deadline_v2' IN definition)=0 THEN RAISE EXCEPTION 'Registrant integration missing';END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.domain_recovery_snap_reconciliations_v2'::regclass) THEN RAISE EXCEPTION 'Evidence RLS missing';END IF;
END $test$;
SET LOCAL ROLE service_role;
DO $test$
DECLARE r jsonb;
BEGIN
 r:=public.domain_begin_recovery_checkout_v2(NULL,NULL);
 IF r->>'error' IS DISTINCT FROM 'INVALID_CHECKOUT_REQUEST' THEN RAISE EXCEPTION 'Invalid checkout input not rejected';END IF;
 r:=public.domain_accept_order_recovery_v2(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL);
 IF r->>'error' IS DISTINCT FROM 'INVALID_RECOVERY_ACCEPTANCE' THEN RAISE EXCEPTION 'Invalid acceptance input not rejected';END IF;
END $test$;
ROLLBACK;
