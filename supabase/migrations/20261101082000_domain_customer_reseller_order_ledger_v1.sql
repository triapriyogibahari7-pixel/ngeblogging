DO $migration$
BEGIN
 SET LOCAL lock_timeout='2s';
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'Migration requires owner; stop'; END IF;
 IF pg_catalog.to_regclass('public.domain_customer_purchase_orders') IS NOT NULL THEN RAISE EXCEPTION 'Customer reseller order table already exists; audit current definition before continuing'; END IF;
 CREATE TABLE public.domain_customer_purchase_orders(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment text NOT NULL CHECK(environment='production'),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  site_id uuid NOT NULL REFERENCES public.sites(id),
  review_id uuid NOT NULL UNIQUE,
  quote_provider text NOT NULL CHECK(quote_provider='opensrs'),
  registrar_account_ref text NOT NULL CHECK(length(registrar_account_ref) BETWEEN 1 AND 120),
  domain text NOT NULL CHECK(domain=lower(domain) AND length(domain) BETWEEN 4 AND 253),
  years integer NOT NULL CHECK(years=1),
  currency text NOT NULL CHECK(currency='IDR'),
  amount_idr bigint NOT NULL CHECK(amount_idr BETWEEN 1 AND 1000000000000),
  provider_currency text NOT NULL CHECK(provider_currency='USD'),
  provider_cost_usd numeric(18,6) NOT NULL CHECK(provider_cost_usd>0 AND provider_cost_usd<=1000000000000),
  provider_fx_rate numeric(18,6) NOT NULL CHECK(provider_fx_rate>0 AND provider_fx_rate<=1000000000000),
  pricing_snapshot_version text NOT NULL CHECK(length(pricing_snapshot_version) BETWEEN 1 AND 100),
  price_reviewed_at timestamptz NOT NULL,
  price_expires_at timestamptz NOT NULL,
  review_receipt_sha256 text NOT NULL CHECK(review_receipt_sha256~'^[a-f0-9]{64}$'),
  registrant_payload jsonb NOT NULL CHECK(jsonb_typeof(registrant_payload)='object' AND octet_length(registrant_payload::text)<=16384),
  registrant_payload_sha256 text NOT NULL CHECK(registrant_payload_sha256~'^[a-f0-9]{64}$'),
  terms_version text NOT NULL CHECK(length(terms_version) BETWEEN 1 AND 100),
  terms_accepted_at timestamptz NOT NULL,
  payment_state text NOT NULL DEFAULT 'pending' CHECK(payment_state IN ('pending','paid','failed','expired','cancelled','review_required','refund_pending','refunded')),
  registration_state text NOT NULL DEFAULT 'not_started' CHECK(registration_state IN ('not_started','queued','processing','registered','failed','review_required')),
  order_state text NOT NULL DEFAULT 'awaiting_payment' CHECK(order_state IN ('awaiting_payment','payment_review','registration_review','complete','closed')),
  midtrans_transaction_id text CHECK(length(midtrans_transaction_id)<=128),
  checkout_idempotency_key uuid NOT NULL,
  registrar_attempt_id uuid,
  registrar_order_ref text CHECK(length(registrar_order_ref)<=200),
  registrar_domain_ref text CHECK(length(registrar_domain_ref)<=200),
  registrar_expires_at timestamptz,
  nameservers jsonb CHECK(nameservers IS NULL OR (jsonb_typeof(nameservers)='array' AND jsonb_array_length(nameservers)<=16)),
  review_reason text CHECK(review_reason IS NULL OR length(review_reason)<=120),
  version bigint NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(user_id,checkout_idempotency_key),
  CHECK(price_expires_at>price_reviewed_at),
  CHECK((payment_state='paid')=(midtrans_transaction_id IS NOT NULL)),
  CHECK((registration_state='registered')=(registrar_domain_ref IS NOT NULL AND registrar_expires_at IS NOT NULL)),
  CHECK(order_state<>'complete' OR (payment_state='paid' AND registration_state='registered')),
  CHECK(order_state<>'closed' OR payment_state IN ('failed','expired','cancelled','refunded'))
 );
 CREATE UNIQUE INDEX domain_customer_order_active_domain ON public.domain_customer_purchase_orders(domain) WHERE order_state NOT IN ('complete','closed');
 CREATE INDEX domain_customer_order_user_recent ON public.domain_customer_purchase_orders(user_id,created_at DESC);
 CREATE INDEX domain_customer_order_site_recent ON public.domain_customer_purchase_orders(site_id,created_at DESC);
 ALTER TABLE public.domain_customer_purchase_orders ENABLE ROW LEVEL SECURITY;
 REVOKE ALL ON public.domain_customer_purchase_orders FROM PUBLIC,anon,authenticated;
 GRANT SELECT,INSERT,UPDATE ON public.domain_customer_purchase_orders TO service_role;

 CREATE TABLE public.domain_customer_order_events(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.domain_customer_purchase_orders(id),
  environment text NOT NULL CHECK(environment='production'),
  actor_kind text NOT NULL CHECK(actor_kind IN ('customer','midtrans_webhook','registrar_worker','operator')),
  event_kind text NOT NULL CHECK(event_kind IN ('order_created','registrant_confirmed','checkout_created','payment_paid','payment_failed','payment_review','registration_submitted','registration_processing','registration_succeeded','registration_failed','registration_review','nameservers_recorded','order_closed')),
  source_event_id text CHECK(source_event_id IS NULL OR length(source_event_id) BETWEEN 1 AND 200),
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(details)='object' AND octet_length(details::text)<=8192),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(order_id,event_kind,source_event_id)
 );
 ALTER TABLE public.domain_customer_order_events ENABLE ROW LEVEL SECURITY;
 REVOKE ALL ON public.domain_customer_order_events FROM PUBLIC,anon,authenticated;
 GRANT SELECT,INSERT ON public.domain_customer_order_events TO service_role;

 CREATE TABLE public.domain_customer_registrar_jobs(
  order_id uuid PRIMARY KEY REFERENCES public.domain_customer_purchase_orders(id),
  environment text NOT NULL CHECK(environment='production'),
  provider text NOT NULL CHECK(provider='opensrs'),
  account_ref text NOT NULL CHECK(length(account_ref) BETWEEN 1 AND 120),
  domain text NOT NULL CHECK(domain=lower(domain) AND length(domain) BETWEEN 4 AND 253),
  state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','preflight','submitted','processing','succeeded','failed','review_required','conflict')),
  attempt_id uuid,
  registrar_order_ref text CHECK(length(registrar_order_ref)<=200),
  registrar_domain_ref text CHECK(length(registrar_domain_ref)<=200),
  registrar_expires_at timestamptz,
  nameservers jsonb CHECK(nameservers IS NULL OR (jsonb_typeof(nameservers)='array' AND jsonb_array_length(nameservers)<=16)),
  request_sha256 text CHECK(request_sha256 IS NULL OR request_sha256~'^[a-f0-9]{64}$'),
  response_sha256 text CHECK(response_sha256 IS NULL OR response_sha256~'^[a-f0-9]{64}$'),
  observation_count integer NOT NULL DEFAULT 0 CHECK(observation_count BETWEEN 0 AND 100),
  next_check_at timestamptz,
  review_reason text CHECK(review_reason IS NULL OR length(review_reason)<=120),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK((state IN ('submitted','processing','succeeded','failed','review_required','conflict'))=(attempt_id IS NOT NULL)),
  CHECK(state<>'succeeded' OR (registrar_domain_ref IS NOT NULL AND registrar_expires_at IS NOT NULL))
 );
 CREATE UNIQUE INDEX domain_customer_registrar_active_domain ON public.domain_customer_registrar_jobs(domain) WHERE state NOT IN ('failed','conflict');
 CREATE INDEX domain_customer_registrar_due ON public.domain_customer_registrar_jobs(next_check_at) WHERE next_check_at IS NOT NULL;
 ALTER TABLE public.domain_customer_registrar_jobs ENABLE ROW LEVEL SECURITY;
 REVOKE ALL ON public.domain_customer_registrar_jobs FROM PUBLIC,anon,authenticated;
 GRANT SELECT,INSERT,UPDATE ON public.domain_customer_registrar_jobs TO service_role;
END;
$migration$;
