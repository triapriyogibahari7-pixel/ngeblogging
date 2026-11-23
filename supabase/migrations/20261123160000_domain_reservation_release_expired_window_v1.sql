DO $migration$
DECLARE
 d text;
 a text:='EXISTS(SELECT 1 FROM public.domain_checkout_sessions s WHERE s.order_id=x.order_id)';
 b text:='EXISTS(SELECT 1 FROM public.domain_checkout_sessions s WHERE s.order_id=x.order_id AND (s.payment_window_expires_at IS NULL OR s.payment_window_expires_at+interval ''30 minutes''>clock_timestamp()))';
BEGIN
 SET LOCAL lock_timeout='2s';
 d:=pg_get_functiondef('public.domain_save_production_registration_details(uuid,text,jsonb,text,text,boolean)'::regprocedure);
 IF (length(d)-length(replace(d,a,'')))/length(a)<>1 THEN RAISE EXCEPTION 'Registration reservation anchor differs; stop'; END IF;
 EXECUTE replace(d,a,b);
 IF position('payment_window_expires_at' in pg_get_functiondef('public.domain_save_production_registration_details(uuid,text,jsonb,text,text,boolean)'::regprocedure))=0 THEN RAISE EXCEPTION 'Registration reservation update not applied; stop'; END IF;
END;
$migration$;
