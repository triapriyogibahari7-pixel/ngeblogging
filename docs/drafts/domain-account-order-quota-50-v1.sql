-- Draft: maximum 50 unresolved production orders per account across devices.
-- Not a lifetime purchase cap. Apply only with separate database approval.
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='20s';
LOCK TABLE public.domain_purchase_orders IN SHARE ROW EXCLUSIVE MODE;
CREATE OR REPLACE FUNCTION public.domain_order_quota_active_v1(p_payment_state text,p_registration_state text,p_review_reason text)
RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path TO ''
AS $quota_active$
 SELECT NOT COALESCE(p_payment_state='refunded' OR (COALESCE(p_review_reason,'')='' AND (
  (p_payment_state IN ('failed','expired','cancelled') AND p_registration_state='not_started')
  OR (p_payment_state='paid' AND p_registration_state='registered'))),false);
$quota_active$;
REVOKE ALL ON FUNCTION public.domain_order_quota_active_v1(text,text,text) FROM PUBLIC,anon,authenticated;
DO $preflight$
BEGIN
 IF EXISTS(SELECT 1 FROM public.domain_purchase_orders WHERE environment='production'
  AND public.domain_order_quota_active_v1(payment_state,registration_state,review_reason)
  GROUP BY user_id HAVING count(*)>50) THEN
  RAISE EXCEPTION 'EXISTING_ACTIVE_ORDER_QUOTA_EXCEEDED_REVIEW_REQUIRED';
 END IF;
END;
$preflight$;
CREATE OR REPLACE FUNCTION public.domain_enforce_account_order_quota_v1()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO '' SET lock_timeout TO '2s'
AS $quota_trigger$
DECLARE active_count bigint;
BEGIN
 IF NEW.environment IS DISTINCT FROM 'production' OR NEW.user_id IS NULL THEN RETURN NEW;END IF;
 IF NOT public.domain_order_quota_active_v1(NEW.payment_state,NEW.registration_state,NEW.review_reason) THEN RETURN NEW;END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.environment='production' AND OLD.user_id IS NOT DISTINCT FROM NEW.user_id
   AND public.domain_order_quota_active_v1(OLD.payment_state,OLD.registration_state,OLD.review_reason) THEN RETURN NEW;END IF;
 END IF;
 IF pg_catalog.current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='DOMAIN_QUOTA_ISOLATION_UNSUPPORTED';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('domain-account-order-quota:v1:'||NEW.user_id::text,0::bigint));
 IF TG_OP='INSERT' AND EXISTS(SELECT 1 FROM public.domain_purchase_orders WHERE order_id=NEW.order_id) THEN RETURN NEW;END IF;
 SELECT count(*) INTO active_count FROM public.domain_purchase_orders
  WHERE user_id=NEW.user_id AND environment='production' AND order_id<>NEW.order_id
   AND public.domain_order_quota_active_v1(payment_state,registration_state,review_reason);
 IF active_count>=50 THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='DOMAIN_ACCOUNT_ORDER_LIMIT_REACHED';END IF;
 RETURN NEW;
END;
$quota_trigger$;
REVOKE ALL ON FUNCTION public.domain_enforce_account_order_quota_v1() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS domain_account_order_quota_v1 ON public.domain_purchase_orders;
CREATE TRIGGER domain_account_order_quota_v1 BEFORE INSERT OR UPDATE ON public.domain_purchase_orders
 FOR EACH ROW EXECUTE FUNCTION public.domain_enforce_account_order_quota_v1();
DO $rpc_patch$
DECLARE src text; suffix text:=E'\nEND;\n$function$\n'; replacement text;
BEGIN
 src:=pg_catalog.pg_get_functiondef('public.domain_create_purchase_order(uuid,uuid,uuid,text)'::regprocedure);
 replacement:=E'\nEXCEPTION WHEN SQLSTATE ''P0001'' THEN\n IF SQLERRM=''DOMAIN_ACCOUNT_ORDER_LIMIT_REACHED'' THEN\n  RETURN pg_catalog.jsonb_build_object(''ok'',false,''error'',''ORDER_LIMIT_REACHED'');\n END IF;\n RAISE;\nEND;\n$function$\n';
 IF position('DOMAIN_ACCOUNT_ORDER_LIMIT_REACHED' IN src)>0 THEN
  IF position(replacement IN src)=0 THEN RAISE EXCEPTION 'DOMAIN_QUOTA_RPC_BASELINE_CHANGED';END IF;RETURN;
 END IF;
 IF position('EXCEPTION' IN pg_catalog.upper(src))>0 OR pg_catalog.right(src,pg_catalog.length(suffix))<>suffix
  OR position('SERVER_ONLY' IN src)=0 OR position('IDEMPOTENCY_CONFLICT' IN src)=0
  OR position('domain-order-key:' IN src)=0 OR position('payment_window_expires_at' IN src)=0 THEN
  RAISE EXCEPTION 'DOMAIN_QUOTA_RPC_BASELINE_CHANGED';
 END IF;
 EXECUTE pg_catalog.left(src,pg_catalog.length(src)-pg_catalog.length(suffix))||replacement;
END;
$rpc_patch$;
