BEGIN;
ALTER TABLE public.nara_midtrans_orders
 DROP CONSTRAINT nara_midtrans_orders_plan_id_check,
 DROP CONSTRAINT nara_midtrans_orders_check,
 ADD CONSTRAINT nara_midtrans_orders_plan_id_check CHECK (plan_id IN ('pro_monthly','pro_yearly','max_monthly','max_yearly')),
 ADD CONSTRAINT nara_midtrans_orders_period_check CHECK ((plan_id IN ('pro_monthly','max_monthly') AND duration_days=31) OR (plan_id IN ('pro_yearly','max_yearly') AND duration_days=366));

CREATE OR REPLACE FUNCTION public.nara_apply_midtrans(p_order text,p_transaction text,p_amount text,p_environment text,p_state text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 o public.nara_midtrans_orders%ROWTYPE;
 v_plan text; v_target text; v_expiry timestamptz; v_end timestamptz;
BEGIN
 SELECT * INTO o FROM public.nara_midtrans_orders WHERE order_id=p_order FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','ORDER_NOT_FOUND'); END IF;
 IF p_environment IS DISTINCT FROM o.environment OR p_amount::numeric IS DISTINCT FROM o.amount
 OR p_transaction IS NULL OR length(p_transaction)=0 OR length(p_transaction)>128
 OR p_state IS NULL OR p_state NOT IN ('paid','pending','failed','review_required')
 OR (o.transaction_id IS NOT NULL AND o.transaction_id<>p_transaction) THEN
  RETURN jsonb_build_object('ok',false,'error','ORDER_MISMATCH');
 END IF;
 v_target:=CASE o.plan_id WHEN 'pro_monthly' THEN 'pro' WHEN 'pro_yearly' THEN 'pro' WHEN 'max_monthly' THEN 'business' WHEN 'max_yearly' THEN 'business' ELSE NULL END;
 IF v_target IS NULL THEN RETURN jsonb_build_object('ok',false,'error','INVALID_PLAN'); END IF;
 IF o.environment='sandbox' THEN
  UPDATE public.nara_midtrans_orders SET status='sandbox_'||p_state,transaction_id=p_transaction WHERE order_id=p_order;
  RETURN jsonb_build_object('ok',true,'completed',false,'sandbox',true);
 END IF;
 IF p_state='review_required' THEN
  UPDATE public.nara_midtrans_orders SET review_required=true,transaction_id=p_transaction WHERE order_id=p_order;
  RETURN jsonb_build_object('ok',true,'completed',false,'reviewRequired',true);
 END IF;
 IF o.review_required THEN RETURN jsonb_build_object('ok',true,'completed',false,'reviewRequired',true); END IF;
 IF o.activated_at IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'completed',true,'duplicate',true); END IF;
 IF p_state<>'paid' THEN
  UPDATE public.nara_midtrans_orders SET status=p_state,transaction_id=p_transaction WHERE order_id=p_order;
  RETURN jsonb_build_object('ok',true,'completed',false);
 END IF;
 SELECT plan,plan_expires_at INTO v_plan,v_expiry FROM public.profiles WHERE id=o.user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;
 IF v_plan IN ('pro','business') AND (v_expiry IS NULL OR (v_expiry>now() AND v_plan<>v_target)) THEN
  UPDATE public.nara_midtrans_orders SET review_required=true,transaction_id=p_transaction WHERE order_id=p_order;
  RETURN jsonb_build_object('ok',true,'completed',false,'reviewRequired',true,'reason','EXISTING_ENTITLEMENT_REQUIRES_REVIEW');
 END IF;
 v_end:=greatest(now(),CASE WHEN v_plan=v_target THEN coalesce(v_expiry,now()) ELSE now() END)+make_interval(days=>o.duration_days);
 UPDATE public.profiles SET plan=v_target,plan_expires_at=v_end WHERE id=o.user_id;
 UPDATE public.nara_midtrans_orders SET status='completed',activated_at=now(),expires_at=v_end,transaction_id=p_transaction WHERE order_id=p_order;
 RETURN jsonb_build_object('ok',true,'completed',true,'expiresAt',v_end,'accountPlan',v_target);
END;
$$;
REVOKE ALL ON FUNCTION public.nara_apply_midtrans(text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nara_apply_midtrans(text,text,text,text,text) TO service_role;
COMMIT;
