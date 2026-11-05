BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='30s';

-- Depends on domain_management_foundation_v1. No historical backfill or email delivery.
CREATE FUNCTION public.domain_notify_order_transition_v1() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE event_kind text;
BEGIN
 IF NEW.environment IS DISTINCT FROM 'production' OR NEW.payment_state IS DISTINCT FROM 'paid' OR NEW.paid_at IS NULL OR NEW.midtrans_transaction_id IS NULL OR NEW.review_reason IS NOT NULL THEN RETURN NEW;END IF;
 IF NOT EXISTS(SELECT 1 FROM public.domain_payment_events e WHERE e.order_id=NEW.order_id AND e.environment='production' AND e.provider='midtrans' AND e.currency='IDR' AND e.amount_idr=NEW.amount_idr AND e.transaction_id=NEW.midtrans_transaction_id AND e.verified_state='paid') THEN RETURN NEW;END IF;
 INSERT INTO public.domain_notifications_v1(order_id,user_id,event_key,kind,occurred_at) VALUES(NEW.order_id,NEW.user_id,'payment_verified','payment_verified',NEW.paid_at) ON CONFLICT(order_id,event_key) DO NOTHING;
 event_kind:=CASE NEW.registration_state WHEN 'queued' THEN 'registration_processing' WHEN 'processing' THEN 'registration_processing' WHEN 'registered' THEN 'registration_succeeded' WHEN 'failed' THEN 'registration_failed' ELSE NULL END;
 IF event_kind='registration_succeeded' AND (NEW.registered_at IS NULL OR NEW.registrar_domain_ref IS NULL) THEN event_kind:=NULL;END IF;
 IF event_kind IS NOT NULL THEN INSERT INTO public.domain_notifications_v1(order_id,user_id,event_key,kind,occurred_at) VALUES(NEW.order_id,NEW.user_id,event_kind,event_kind,CASE WHEN event_kind='registration_succeeded' THEN NEW.registered_at ELSE NEW.updated_at END) ON CONFLICT(order_id,event_key) DO NOTHING;END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.domain_notify_order_transition_v1() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER domain_notify_order_transition_v1 AFTER INSERT OR UPDATE ON public.domain_purchase_orders FOR EACH ROW EXECUTE FUNCTION public.domain_notify_order_transition_v1();

CREATE FUNCTION public.domain_read_owned_notifications_v1(p_user_id uuid,p_order_id text) RETURNS jsonb
 LANGUAGE plpgsql SET search_path='' SET lock_timeout='2s' AS $fn$
DECLARE items jsonb;
BEGIN
 IF current_user<>'service_role' THEN RETURN jsonb_build_object('ok',false,'error','SERVER_ONLY');END IF;
 IF p_user_id IS NULL OR p_order_id IS NULL OR p_order_id !~ '^DOM-[a-f0-9]{40}$' THEN RETURN jsonb_build_object('ok',false,'error','INVALID_DOMAIN_REQUEST');END IF;
 IF NOT EXISTS(SELECT 1 FROM public.domain_purchase_orders WHERE order_id=p_order_id AND user_id=p_user_id AND environment='production') THEN RETURN jsonb_build_object('ok',false,'error','DOMAIN_ORDER_NOT_FOUND');END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',n.id,'kind',n.kind,'occurredAt',n.occurred_at,'readAt',n.read_at) ORDER BY n.occurred_at DESC,n.id),'[]'::jsonb) INTO items FROM (SELECT id,kind,occurred_at,read_at FROM public.domain_notifications_v1 WHERE order_id=p_order_id AND user_id=p_user_id ORDER BY occurred_at DESC,id LIMIT 50) n;
 RETURN jsonb_build_object('ok',true,'orderId',p_order_id,'notifications',items);
END $fn$;
REVOKE ALL ON FUNCTION public.domain_read_owned_notifications_v1(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.domain_read_owned_notifications_v1(uuid,text) TO service_role;

CREATE FUNCTION public.domain_mark_owned_notification_read_v1(p_user_id uuid,p_notification_id uuid) RETURNS jsonb
 LANGUAGE plpgsql SET search_path='' SET lock_timeout='2s' AS $fn$
DECLARE n public.domain_notifications_v1%ROWTYPE;
BEGIN
 IF current_user<>'service_role' THEN RETURN jsonb_build_object('ok',false,'error','SERVER_ONLY');END IF;
 IF p_user_id IS NULL OR p_notification_id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','INVALID_NOTIFICATION_REQUEST');END IF;
 UPDATE public.domain_notifications_v1 x SET read_at=COALESCE(x.read_at,GREATEST(clock_timestamp(),x.created_at)) WHERE x.id=p_notification_id AND x.user_id=p_user_id AND EXISTS(SELECT 1 FROM public.domain_purchase_orders o WHERE o.order_id=x.order_id AND o.user_id=p_user_id AND o.environment='production') RETURNING x.* INTO n;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','NOTIFICATION_NOT_FOUND');END IF;
 RETURN jsonb_build_object('ok',true,'notificationId',n.id,'orderId',n.order_id,'readAt',n.read_at);
END $fn$;
REVOKE ALL ON FUNCTION public.domain_mark_owned_notification_read_v1(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.domain_mark_owned_notification_read_v1(uuid,uuid) TO service_role;

-- Caller must schedule this function explicitly; this migration installs no cron.
CREATE FUNCTION public.domain_generate_expiry_notifications_v1(p_limit integer DEFAULT 100) RETURNS jsonb
 LANGUAGE plpgsql SET search_path='' SET lock_timeout='2s' AS $fn$
DECLARE item record;added integer:=0;affected integer;at_time timestamptz:=clock_timestamp();
BEGIN
 IF current_user<>'service_role' THEN RETURN jsonb_build_object('ok',false,'error','SERVER_ONLY');END IF;
 IF p_limit IS NULL OR p_limit<1 OR p_limit>200 THEN RETURN jsonb_build_object('ok',false,'error','INVALID_LIMIT');END IF;
 FOR item IN
  SELECT m.order_id,m.user_id,m.registrar_expires_at,CASE WHEN m.registrar_expires_at<=at_time THEN 'domain_expired' ELSE 'expiry_reminder' END AS kind,
   'expiry:'||extract(epoch FROM m.registrar_expires_at)::text||':'||CASE WHEN m.registrar_expires_at<=at_time THEN 'expired' WHEN m.registrar_expires_at<=at_time+interval '1 day' THEN '1d' WHEN m.registrar_expires_at<=at_time+interval '7 days' THEN '7d' ELSE '30d' END AS event_key
  FROM public.domain_management_snapshots_v1 m JOIN public.domain_purchase_orders o ON o.order_id=m.order_id AND o.user_id=m.user_id
  WHERE o.environment='production' AND o.payment_state='paid' AND o.registration_state='registered' AND o.review_reason IS NULL AND m.registrar_expires_at IS NOT NULL AND m.registrar_checked_at BETWEEN at_time-interval '1 day' AND at_time AND m.registrar_expires_at<=at_time+interval '30 days'
   AND NOT EXISTS(SELECT 1 FROM public.domain_notifications_v1 n WHERE n.order_id=m.order_id AND n.event_key='expiry:'||extract(epoch FROM m.registrar_expires_at)::text||':'||CASE WHEN m.registrar_expires_at<=at_time THEN 'expired' WHEN m.registrar_expires_at<=at_time+interval '1 day' THEN '1d' WHEN m.registrar_expires_at<=at_time+interval '7 days' THEN '7d' ELSE '30d' END)
  ORDER BY m.registrar_expires_at,m.order_id LIMIT p_limit
 LOOP
  INSERT INTO public.domain_notifications_v1(order_id,user_id,event_key,kind,occurred_at) VALUES(item.order_id,item.user_id,item.event_key,item.kind,at_time) ON CONFLICT(order_id,event_key) DO NOTHING;
  GET DIAGNOSTICS affected=ROW_COUNT;added:=added+affected;
 END LOOP;
 RETURN jsonb_build_object('ok',true,'inserted',added,'providerActionTaken',false,'emailSent',false);
END $fn$;
REVOKE ALL ON FUNCTION public.domain_generate_expiry_notifications_v1(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.domain_generate_expiry_notifications_v1(integer) TO service_role;
COMMIT;
