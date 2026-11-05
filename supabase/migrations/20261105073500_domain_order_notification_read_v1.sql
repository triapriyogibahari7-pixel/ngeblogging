BEGIN;
SET LOCAL lock_timeout='2s';
CREATE FUNCTION public.domain_mark_order_notification_read_v1(p_user_id uuid,p_order_id text,p_notification_id uuid) RETURNS jsonb LANGUAGE plpgsql SET search_path='' SET lock_timeout='2s' AS $fn$
DECLARE n public.domain_notifications_v1%ROWTYPE;
BEGIN
 IF current_user<>'service_role' THEN RETURN jsonb_build_object('ok',false,'error','SERVER_ONLY');END IF;
 IF p_user_id IS NULL OR p_order_id IS NULL OR p_order_id !~ '^DOM-[a-f0-9]{40}$' OR p_notification_id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','INVALID_NOTIFICATION_REQUEST');END IF;
 UPDATE public.domain_notifications_v1 x SET read_at=COALESCE(x.read_at,GREATEST(clock_timestamp(),x.created_at)) WHERE x.id=p_notification_id AND x.order_id=p_order_id AND x.user_id=p_user_id AND EXISTS(SELECT 1 FROM public.domain_purchase_orders o WHERE o.order_id=p_order_id AND o.user_id=p_user_id AND o.environment='production') RETURNING x.* INTO n;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','NOTIFICATION_NOT_FOUND');END IF;
 RETURN jsonb_build_object('ok',true,'notificationId',n.id,'orderId',n.order_id,'readAt',n.read_at);
END $fn$;
REVOKE ALL ON FUNCTION public.domain_mark_order_notification_read_v1(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.domain_mark_order_notification_read_v1(uuid,text,uuid) TO service_role;
COMMIT;
