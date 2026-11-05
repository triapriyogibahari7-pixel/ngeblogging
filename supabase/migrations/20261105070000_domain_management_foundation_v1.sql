BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='30s';

-- Storage foundation only. No provider requests, registrations, DNS writes or backfill.
ALTER TABLE public.domain_purchase_orders ADD CONSTRAINT domain_order_owner_snapshot_v1 UNIQUE(order_id,user_id);

CREATE TABLE public.domain_management_snapshots_v1 (
 order_id text PRIMARY KEY,
 user_id uuid NOT NULL,
 nameservers text[] NOT NULL DEFAULT '{}',
 registrar_registered_at timestamptz,
 registrar_expires_at timestamptz,
 auto_renew boolean,
 registrar_checked_at timestamptz NOT NULL,
 evidence_sha256 text NOT NULL CHECK(evidence_sha256 ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(order_id,user_id) REFERENCES public.domain_purchase_orders(order_id,user_id),
 CHECK(cardinality(nameservers) BETWEEN 0 AND 13),
 CHECK(array_position(nameservers,NULL) IS NULL),
 CHECK(registrar_registered_at IS NULL OR isfinite(registrar_registered_at)),
 CHECK(registrar_expires_at IS NULL OR isfinite(registrar_expires_at)),
 CHECK(isfinite(registrar_checked_at)),
 CHECK(registrar_registered_at IS NULL OR registrar_expires_at IS NULL OR registrar_registered_at<registrar_expires_at)
);
ALTER TABLE public.domain_management_snapshots_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.domain_management_snapshots_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.domain_management_snapshots_v1 TO service_role;
COMMENT ON TABLE public.domain_management_snapshots_v1 IS 'Private server-written registrar observations. Backend must verify current order ownership, paid/registered state, exact provider account and domain, canonical nameservers, chronology and evidence before writing. Zone creation time is not a registration or expiry date. NULL means unknown; never synthesize expiry from purchase time. No provider adapter or user-facing endpoint is installed by this migration.';

CREATE TABLE public.domain_notifications_v1 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id text NOT NULL,
 user_id uuid NOT NULL,
 event_key text NOT NULL CHECK(length(event_key) BETWEEN 1 AND 200 AND event_key !~ '[[:cntrl:]]'),
 kind text NOT NULL CHECK(kind IN ('payment_verified','registration_processing','registration_succeeded','registration_failed','connection_verified','connection_failed','expiry_reminder','domain_expired')),
 occurred_at timestamptz NOT NULL CHECK(isfinite(occurred_at)),
 read_at timestamptz CHECK(read_at IS NULL OR isfinite(read_at)),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(order_id,user_id) REFERENCES public.domain_purchase_orders(order_id,user_id),
 UNIQUE(order_id,event_key),
 CHECK(read_at IS NULL OR read_at>=created_at)
);
CREATE INDEX domain_notifications_owner_time_v1 ON public.domain_notifications_v1(user_id,occurred_at DESC,id);
ALTER TABLE public.domain_notifications_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.domain_notifications_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.domain_notifications_v1 TO service_role;
COMMENT ON TABLE public.domain_notifications_v1 IS 'Private durable domain notifications. Trusted backend must derive events from verified state transitions, use deterministic event_key and INSERT ON CONFLICT DO NOTHING. No card, email, scheduler, delivery worker or read-marking endpoint is installed by this migration. Event kinds are not independent proof of payment or domain activation.';

CREATE FUNCTION public.domain_read_owned_management_v1(p_user_id uuid,p_order_id text) RETURNS jsonb
 LANGUAGE plpgsql SET search_path='' SET lock_timeout='2s' AS $fn$
DECLARE o public.domain_purchase_orders%ROWTYPE;q public.domain_sale_quotes%ROWTYPE;m public.domain_management_snapshots_v1%ROWTYPE;notes jsonb;
BEGIN
 IF current_user<>'service_role' THEN RETURN jsonb_build_object('ok',false,'error','SERVER_ONLY');END IF;
 IF p_user_id IS NULL OR p_order_id IS NULL OR p_order_id !~ '^DOM-[a-f0-9]{40}$' THEN RETURN jsonb_build_object('ok',false,'error','INVALID_DOMAIN_REQUEST');END IF;
 SELECT * INTO o FROM public.domain_purchase_orders WHERE order_id=p_order_id AND user_id=p_user_id AND environment='production';
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','DOMAIN_ORDER_NOT_FOUND');END IF;
 SELECT * INTO q FROM public.domain_sale_quotes WHERE id=o.quote_id AND user_id=p_user_id AND environment='production';
 IF NOT FOUND OR q.currency IS DISTINCT FROM o.currency OR q.sale_price_idr IS DISTINCT FROM o.amount_idr THEN RETURN jsonb_build_object('ok',false,'error','DOMAIN_SNAPSHOT_UNVERIFIED');END IF;
 SELECT * INTO m FROM public.domain_management_snapshots_v1 WHERE order_id=o.order_id AND user_id=p_user_id;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',n.id,'kind',n.kind,'occurredAt',n.occurred_at,'readAt',n.read_at) ORDER BY n.occurred_at DESC,n.id),'[]'::jsonb) INTO notes FROM (SELECT id,kind,occurred_at,read_at FROM public.domain_notifications_v1 WHERE order_id=o.order_id AND user_id=p_user_id ORDER BY occurred_at DESC,id LIMIT 50) n;
 RETURN jsonb_build_object('ok',true,'orderId',o.order_id,'domain',q.domain,'environment','production','paymentState',o.payment_state,'registrationState',o.registration_state,'paidAt',o.paid_at,'registeredAt',o.registered_at,'registrar',CASE WHEN o.payment_state='paid' AND o.registration_state='registered' AND o.review_reason IS NULL AND m.order_id IS NOT NULL THEN jsonb_build_object('nameservers',m.nameservers,'registeredAt',m.registrar_registered_at,'expiresAt',m.registrar_expires_at,'autoRenew',m.auto_renew,'checkedAt',m.registrar_checked_at) ELSE NULL END,'notifications',notes,'providerActionTaken',false);
END $fn$;
REVOKE ALL ON FUNCTION public.domain_read_owned_management_v1(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.domain_read_owned_management_v1(uuid,text) TO service_role;
COMMIT;
