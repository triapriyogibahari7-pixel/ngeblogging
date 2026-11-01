DO $production_migration$
BEGIN
SET LOCAL lock_timeout='2s';
DO $preflight$
DECLARE r record; v_source text;
BEGIN
 FOR r IN SELECT * FROM (VALUES
 ('public.domain_begin_sandbox_checkout(uuid,text)','f47521fd31715d49ebb56677783156187844083ff177bca99b0d3b56622dd49a'),
 ('public.domain_complete_sandbox_checkout(uuid,text,uuid,text,text)','b6f255bc0fedd1078e032c3506dca358f3ab8bbcd5317bfcd68a9477ec19e4e3'),
 ('public.domain_record_sandbox_payment(text,bigint,text)','d4788e280db1d0c2796d22ef2025c3277259be777851cf7e4b5957152356f852')
 ) AS approved(signature,sha256) LOOP
  IF pg_catalog.to_regprocedure(r.signature) IS NULL THEN RAISE EXCEPTION 'Required source RPC missing'; END IF;
  v_source:=pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure(r.signature)::oid);
  IF pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_source,'UTF8')),'hex')<>r.sha256 THEN RAISE EXCEPTION 'Source RPC differs from audited definition; stop'; END IF;
 END LOOP;
 IF pg_catalog.to_regprocedure('public.domain_begin_production_checkout(uuid,text)') IS NOT NULL OR pg_catalog.to_regprocedure('public.domain_complete_production_checkout(uuid,text,uuid,text,text)') IS NOT NULL OR pg_catalog.to_regprocedure('public.domain_review_production_checkout(uuid,text,uuid)') IS NOT NULL OR pg_catalog.to_regprocedure('public.domain_record_production_payment(text,bigint,text)') IS NOT NULL THEN RAISE EXCEPTION 'Production RPC already exists; no replacement allowed'; END IF;
 IF (SELECT pg_catalog.pg_get_constraintdef(oid,true) FROM pg_catalog.pg_constraint WHERE conrelid='public.domain_checkout_sessions'::regclass AND conname='domain_checkout_sessions_environment_check') IS DISTINCT FROM $oldenv$CHECK (environment = 'sandbox'::text)$oldenv$ THEN RAISE EXCEPTION 'Checkout environment constraint differs from audit'; END IF;
 IF (SELECT pg_catalog.pg_get_constraintdef(oid,true) FROM pg_catalog.pg_constraint WHERE conrelid='public.domain_checkout_sessions'::regclass AND conname='domain_checkout_sessions_check1') IS DISTINCT FROM $oldresult$CHECK (state = 'ready'::text AND snap_token IS NOT NULL AND checkout_url IS NOT NULL AND (checkout_url = ('https://app.sandbox.midtrans.com/snap/v2/vtweb/'::text || snap_token) OR checkout_url = ('https://app.sandbox.midtrans.com/snap/v4/redirection/'::text || snap_token)) OR (state = ANY (ARRAY['creating'::text, 'review_required'::text])) AND snap_token IS NULL AND checkout_url IS NULL)$oldresult$ THEN RAISE EXCEPTION 'Checkout result constraint differs from audit'; END IF;
END;
$preflight$;
ALTER TABLE public.domain_checkout_sessions ADD CONSTRAINT domain_checkout_sessions_environment_v2_check CHECK(environment IN ('sandbox','production'));
ALTER TABLE public.domain_checkout_sessions ADD CONSTRAINT domain_checkout_sessions_result_v2_check CHECK(
 (state='ready' AND snap_token IS NOT NULL AND checkout_url IS NOT NULL AND
  ((environment='sandbox' AND checkout_url IN ('https://app.sandbox.midtrans.com/snap/v2/vtweb/'||snap_token,'https://app.sandbox.midtrans.com/snap/v4/redirection/'||snap_token)) OR
   (environment='production' AND checkout_url IN ('https://app.midtrans.com/snap/v2/vtweb/'||snap_token,'https://app.midtrans.com/snap/v4/redirection/'||snap_token)))) OR
 (state IN ('creating','review_required') AND snap_token IS NULL AND checkout_url IS NULL));
ALTER TABLE public.domain_checkout_sessions DROP CONSTRAINT domain_checkout_sessions_environment_check;
ALTER TABLE public.domain_checkout_sessions DROP CONSTRAINT domain_checkout_sessions_check1;
DO $clone$
DECLARE r record; v_source text; v_target text;
BEGIN
 FOR r IN SELECT * FROM (VALUES
 ('public.domain_begin_sandbox_checkout(uuid,text)','f47521fd31715d49ebb56677783156187844083ff177bca99b0d3b56622dd49a','ad2b9a2658877ae69d29693a2f52164a8fe5a0cc4c35972a043db53b4212bc2a'),
 ('public.domain_complete_sandbox_checkout(uuid,text,uuid,text,text)','b6f255bc0fedd1078e032c3506dca358f3ab8bbcd5317bfcd68a9477ec19e4e3','453b87d71f5eb046caffaea74b9343a173dc8910dcaa264a18bfae842e23a97b'),
 ('public.domain_record_sandbox_payment(text,bigint,text)','d4788e280db1d0c2796d22ef2025c3277259be777851cf7e4b5957152356f852','ba7ff4928b9aa607d65f96e47ed30292b2b3178645e76cfd32dee463d9fd3c62')
 ) AS approved(signature,source_sha256,target_sha256) LOOP
  v_source:=pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure(r.signature)::oid);
  IF pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_source,'UTF8')),'hex')<>r.source_sha256 THEN RAISE EXCEPTION 'Source RPC changed during migration; stop'; END IF;
  v_target:=pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(v_source,'CREATE OR REPLACE FUNCTION','CREATE FUNCTION'),'sandbox','production'),'SANDBOX','PRODUCTION'),'https://app.production.midtrans.com/','https://app.midtrans.com/');
  IF r.signature='public.domain_begin_sandbox_checkout(uuid,text)' THEN
   v_target:=pg_catalog.replace(v_target,E' SELECT * INTO s FROM public.domain_checkout_sessions WHERE order_id=p_order_id FOR UPDATE;\n',
    $guard$ IF COALESCE(q.cost_basis->>'fixture_only'='true',false) OR q.cost_basis->>'tax_status' IS DISTINCT FROM 'verified' OR pg_catalog.jsonb_typeof(q.cost_basis->'tax_source_ref') IS DISTINCT FROM 'string' OR pg_catalog.btrim(COALESCE(q.cost_basis->>'tax_source_ref',''))='' OR pg_catalog.jsonb_typeof(q.cost_basis->'payment_fee_source_ref') IS DISTINCT FROM 'string' OR pg_catalog.btrim(COALESCE(q.cost_basis->>'payment_fee_source_ref',''))='' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','PRODUCTION_QUOTE_UNVERIFIED'); END IF;
$guard$||E' SELECT * INTO s FROM public.domain_checkout_sessions WHERE order_id=p_order_id FOR UPDATE;\n');
  END IF;
  IF pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_target,'UTF8')),'hex')<>r.target_sha256 THEN RAISE EXCEPTION 'Generated production RPC differs from reviewed body; stop'; END IF;
  EXECUTE v_target;
 END LOOP;
END;
$clone$;
CREATE FUNCTION public.domain_review_production_checkout(p_user_id uuid,p_order_id text,p_attempt_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' SET lock_timeout='2s' AS $review$
DECLARE o public.domain_purchase_orders%ROWTYPE; s public.domain_checkout_sessions%ROWTYPE;
BEGIN
 IF current_user<>'service_role' THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','SERVER_ONLY'); END IF;
 IF p_user_id IS NULL OR p_order_id IS NULL OR p_order_id!~'^DOM-[a-f0-9]{40}$' OR p_attempt_id IS NULL THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','INVALID_CHECKOUT_REQUEST'); END IF;
 SELECT * INTO o FROM public.domain_purchase_orders WHERE order_id=p_order_id AND user_id=p_user_id AND environment='production' FOR UPDATE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','DOMAIN_ORDER_NOT_FOUND'); END IF;
 SELECT * INTO s FROM public.domain_checkout_sessions WHERE order_id=p_order_id FOR UPDATE;
 IF NOT FOUND OR s.user_id IS DISTINCT FROM p_user_id OR s.environment<>'production' OR s.currency<>'IDR' OR s.amount_idr IS DISTINCT FROM o.amount_idr OR s.attempt_id IS DISTINCT FROM p_attempt_id THEN RETURN pg_catalog.jsonb_build_object('ok',false,'error','CHECKOUT_ATTEMPT_CONFLICT'); END IF;
 IF s.state='creating' THEN UPDATE public.domain_checkout_sessions SET state='review_required',updated_at=pg_catalog.clock_timestamp() WHERE order_id=p_order_id RETURNING * INTO s; END IF;
 RETURN pg_catalog.jsonb_build_object('ok',true,'order_id',o.order_id,'environment','production','state',s.state,'new_attempt_allowed',false,'registration_action_taken',false);
END;
$review$;
DO $acl$
DECLARE v_signature text; v_role text; v_oid oid;
BEGIN
 FOREACH v_signature IN ARRAY ARRAY['public.domain_begin_production_checkout(uuid,text)','public.domain_complete_production_checkout(uuid,text,uuid,text,text)','public.domain_review_production_checkout(uuid,text,uuid)','public.domain_record_production_payment(text,bigint,text)'] LOOP
  EXECUTE 'REVOKE ALL ON FUNCTION '||v_signature||' FROM PUBLIC,anon,authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION '||v_signature||' TO service_role';
  v_oid:=pg_catalog.to_regprocedure(v_signature)::oid;
  IF v_oid IS NULL OR EXISTS(SELECT 1 FROM pg_catalog.pg_proc WHERE oid=v_oid AND prosecdef) OR NOT pg_catalog.has_function_privilege('service_role'::name,v_oid,'EXECUTE') THEN RAISE EXCEPTION 'Unexpected production RPC permissions'; END IF;
  FOREACH v_role IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF pg_catalog.has_function_privilege(v_role::name,v_oid,'EXECUTE') THEN RAISE EXCEPTION 'Browser production RPC access detected'; END IF;
  END LOOP;
 END LOOP;
END;
$acl$;
COMMENT ON FUNCTION public.domain_record_production_payment(text,bigint,text) IS 'Trusted backend only: verify Midtrans production notification signature and independent production status GET before calling. Atomically records paid state and event; does not register domains or activate Nara.';
COMMENT ON FUNCTION public.domain_begin_production_checkout(uuid,text) IS 'Production-only checkout claim/reuse. Rejects fixture-tagged quotes and missing tax/fee provenance. Structural checks do not independently verify acquisition costs or merchant charges. Does not call Midtrans.';
END;
$production_migration$;
