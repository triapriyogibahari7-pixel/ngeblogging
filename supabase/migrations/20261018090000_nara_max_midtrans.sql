BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_tier text NOT NULL DEFAULT 'free'
  CHECK (billing_tier IN ('free','pro','max'));

UPDATE public.profiles
SET billing_tier = CASE WHEN plan = 'business' THEN 'max' WHEN plan = 'pro' THEN 'pro' ELSE 'free' END
WHERE billing_tier = 'free' AND plan IN ('pro','business');

ALTER TABLE public.nara_midtrans_orders DROP CONSTRAINT IF EXISTS nara_midtrans_orders_plan_id_check;
ALTER TABLE public.nara_midtrans_orders DROP CONSTRAINT IF EXISTS nara_midtrans_orders_check;
ALTER TABLE public.nara_midtrans_orders
  ADD CONSTRAINT nara_midtrans_orders_plan_id_check CHECK (plan_id IN ('pro_monthly','pro_yearly','max_yearly')),
  ADD CONSTRAINT nara_midtrans_orders_duration_check CHECK (
    (plan_id='pro_monthly' AND duration_days=31) OR
    (plan_id IN ('pro_yearly','max_yearly') AND duration_days=366)
  );

CREATE OR REPLACE FUNCTION public.nara_apply_midtrans(p_order text,p_transaction text,p_amount text,p_environment text,p_state text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  o public.nara_midtrans_orders%ROWTYPE;
  v_plan text;
  v_tier text;
  v_expiry timestamptz;
  v_end timestamptz;
  v_target_tier text;
BEGIN
 SELECT * INTO o FROM public.nara_midtrans_orders WHERE order_id=p_order FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','ORDER_NOT_FOUND'); END IF;
 IF p_environment IS DISTINCT FROM o.environment OR p_amount::numeric IS DISTINCT FROM o.amount
 OR p_transaction IS NULL OR length(p_transaction)=0
 OR p_state IS NULL OR p_state NOT IN ('paid','pending','failed','review_required')
 OR (o.transaction_id IS NOT NULL AND o.transaction_id<>p_transaction) THEN
 RETURN jsonb_build_object('ok',false,'error','ORDER_MISMATCH'); END IF;
 IF o.environment='sandbox' THEN
  UPDATE public.nara_midtrans_orders SET status='sandbox_'||p_state,transaction_id=p_transaction WHERE order_id=p_order;
  RETURN jsonb_build_object('ok',true,'completed',false,'sandbox',true); END IF;
 IF p_state='review_required' THEN
  UPDATE public.nara_midtrans_orders SET status='review_required',review_required=true,transaction_id=p_transaction WHERE order_id=p_order;
  RETURN jsonb_build_object('ok',true,'reviewRequired',true); END IF;
 IF o.review_required THEN RETURN jsonb_build_object('ok',true,'reviewRequired',true); END IF;
 IF o.activated_at IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'completed',true,'duplicate',true); END IF;
 IF p_state<>'paid' THEN
  UPDATE public.nara_midtrans_orders SET status=p_state,transaction_id=p_transaction WHERE order_id=p_order;
  RETURN jsonb_build_object('ok',true,'completed',false); END IF;
 v_target_tier:=CASE WHEN o.plan_id='max_yearly' THEN 'max' ELSE 'pro' END;
 SELECT plan,billing_tier,plan_expires_at INTO v_plan,v_tier,v_expiry FROM public.profiles WHERE id=o.user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;
 IF v_plan IN ('pro','business') AND v_expiry IS NULL THEN RAISE EXCEPTION 'PERPETUAL_PLAN_REQUIRES_REVIEW'; END IF;
 IF v_tier='max' AND v_expiry>now() AND v_target_tier='pro' THEN
  UPDATE public.nara_midtrans_orders SET status='review_required',review_required=true,transaction_id=p_transaction WHERE order_id=p_order;
  RETURN jsonb_build_object('ok',true,'reviewRequired',true,'error','MAX_PLAN_ACTIVE'); END IF;
 v_end:=greatest(now(),coalesce(v_expiry,now()))+make_interval(days=>o.duration_days);
 UPDATE public.profiles SET plan='pro',billing_tier=v_target_tier,plan_expires_at=v_end WHERE id=o.user_id;
 UPDATE public.nara_midtrans_orders SET status='completed',activated_at=now(),expires_at=v_end,transaction_id=p_transaction WHERE order_id=p_order;
 RETURN jsonb_build_object('ok',true,'completed',true,'tier',v_target_tier,'expiresAt',v_end);
END;
$$;
REVOKE ALL ON FUNCTION public.nara_apply_midtrans(text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nara_apply_midtrans(text,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION private.consume_nara_quota(requested_model text, requested_intelligence text)
RETURNS TABLE (allowed boolean,account_plan text,remaining integer,daily_limit integer,reason text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  current_user_id uuid := auth.uid(); resolved_plan text; quota_limit integer; used_count integer; requires_pro boolean;
BEGIN
 IF current_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT CASE
   WHEN p.billing_tier='max' AND p.plan_expires_at>now() THEN 'business'
   WHEN p.plan IN ('pro','business') AND (p.plan_expires_at IS NULL OR p.plan_expires_at>now()) THEN p.plan
   ELSE 'free' END
 INTO resolved_plan FROM public.profiles p WHERE p.id=current_user_id;
 resolved_plan:=coalesce(resolved_plan,'free');
 quota_limit:=CASE resolved_plan WHEN 'business' THEN 1000 WHEN 'pro' THEN 250 ELSE 25 END;
 requires_pro:=requested_model IN ('nara-writer','nara-vision','nara-max') OR requested_intelligence IN ('high','xhigh');
 IF requires_pro AND resolved_plan NOT IN ('pro','business') THEN
  RETURN QUERY SELECT false,resolved_plan,quota_limit,quota_limit,'PLAN_REQUIRED'::text; RETURN; END IF;
 INSERT INTO public.nara_usage_daily(user_id,usage_date) VALUES(current_user_id,current_date) ON CONFLICT(user_id,usage_date) DO NOTHING;
 SELECT n.request_count INTO used_count FROM public.nara_usage_daily n WHERE n.user_id=current_user_id AND n.usage_date=current_date FOR UPDATE;
 IF used_count>=quota_limit THEN RETURN QUERY SELECT false,resolved_plan,0,quota_limit,'DAILY_LIMIT'::text; RETURN; END IF;
 UPDATE public.nara_usage_daily n SET request_count=n.request_count+1,last_model=requested_model,last_intelligence=requested_intelligence,updated_at=now()
 WHERE n.user_id=current_user_id AND n.usage_date=current_date RETURNING n.request_count INTO used_count;
 RETURN QUERY SELECT true,resolved_plan,greatest(quota_limit-used_count,0),quota_limit,'OK'::text;
END;
$$;
REVOKE ALL ON FUNCTION private.consume_nara_quota(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.consume_nara_quota(text,text) TO authenticated;

COMMIT;
