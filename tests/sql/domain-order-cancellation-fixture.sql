-- Disposable PostgreSQL fixture schema slice; never install in Supabase.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
INSERT INTO auth.users VALUES ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
CREATE TABLE public.domain_cancel_test_guard(marker text PRIMARY KEY CHECK(marker='isolated-domain-order-cancellation-v1'));
INSERT INTO public.domain_cancel_test_guard VALUES ('isolated-domain-order-cancellation-v1');
CREATE TABLE public.domain_sale_quotes(
 id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id),environment text NOT NULL,currency text NOT NULL,sale_price_idr bigint NOT NULL,expires_at timestamptz NOT NULL,
 domain text NOT NULL DEFAULT 'example.test',provider_id text NOT NULL DEFAULT 'cloudflare',years integer NOT NULL DEFAULT 1,display_currency text NOT NULL DEFAULT 'USD',sale_price_usd numeric NOT NULL DEFAULT 15.71,
 pricing_version text NOT NULL DEFAULT 'isolated-legacy-fixture',cost_basis jsonb NOT NULL DEFAULT '{"fixture_only":false,"tax_status":"verified","tax_source_ref":"isolated-fixture","payment_fee_source_ref":"isolated-fixture"}',
 registrar_cost_idr bigint NOT NULL DEFAULT 202591,other_direct_costs_idr bigint NOT NULL DEFAULT 40519,payment_cost_idr bigint NOT NULL DEFAULT 16400,
 checked_at timestamptz NOT NULL DEFAULT clock_timestamp(),fx_rate_usd_idr numeric NOT NULL DEFAULT 18137,fx_source text NOT NULL DEFAULT 'isolated-fixture',fx_observed_at timestamptz NOT NULL DEFAULT clock_timestamp(),fx_expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '10 minutes',
 UNIQUE(id,user_id,environment,currency,sale_price_idr,expires_at));
CREATE TABLE public.domain_purchase_orders(
 order_id text PRIMARY KEY CHECK(order_id~'^DOM-[a-f0-9]{40}$'),quote_id uuid NOT NULL,user_id uuid NOT NULL REFERENCES auth.users(id),environment text NOT NULL CHECK(environment IN ('sandbox','production')),currency text NOT NULL CHECK(currency='IDR'),amount_idr bigint NOT NULL CHECK(amount_idr BETWEEN 1 AND 1000000000000),quote_expires_at timestamptz NOT NULL,idempotency_key uuid NOT NULL DEFAULT gen_random_uuid(),
 payment_state text NOT NULL DEFAULT 'pending' CHECK(payment_state IN ('pending','paid','failed','expired','cancelled','review_required','refund_pending','refunded')),
 registration_state text NOT NULL DEFAULT 'not_started' CHECK(registration_state IN ('not_started','queued','processing','registered','failed','review_required')),
 midtrans_transaction_id text,checkout_url text,snap_token text,paid_at timestamptz,registered_at timestamptz,registrar_domain_ref text,review_reason text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()-interval '1 second',updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(order_id,environment,currency,amount_idr),UNIQUE(environment,midtrans_transaction_id),UNIQUE(user_id,environment,idempotency_key),UNIQUE(quote_id),
 FOREIGN KEY(quote_id,user_id,environment,currency,amount_idr,quote_expires_at) REFERENCES public.domain_sale_quotes(id,user_id,environment,currency,sale_price_idr,expires_at),
 CHECK(created_at<quote_expires_at),CHECK(payment_state<>'paid' OR (paid_at IS NOT NULL AND midtrans_transaction_id IS NOT NULL)),CHECK(registration_state NOT IN ('queued','processing','registered') OR payment_state='paid'),CHECK(registration_state<>'registered' OR (registered_at IS NOT NULL AND registrar_domain_ref IS NOT NULL)));
CREATE TABLE public.domain_checkout_sessions(
 order_id text PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id),environment text NOT NULL CHECK(environment IN ('sandbox','production')),currency text NOT NULL CHECK(currency='IDR'),amount_idr bigint NOT NULL CHECK(amount_idr BETWEEN 1 AND 1000000000000),attempt_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),state text NOT NULL CHECK(state IN ('creating','ready','review_required')),
 expiry_anchor_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,snap_token text,checkout_url text,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(order_id,environment,currency,amount_idr) REFERENCES public.domain_purchase_orders(order_id,environment,currency,amount_idr),
 CHECK(expiry_anchor_at<=created_at AND created_at<expires_at AND expires_at>expiry_anchor_at AND expires_at<=expiry_anchor_at+interval '15 minutes'),
 CHECK((state='ready' AND snap_token IS NOT NULL AND checkout_url IS NOT NULL) OR (state IN ('creating','review_required') AND snap_token IS NULL AND checkout_url IS NULL)));
CREATE TABLE public.domain_payment_events(
 event_key text PRIMARY KEY CHECK(event_key~'^[a-f0-9]{64}$'),order_id text NOT NULL,environment text NOT NULL CHECK(environment IN ('sandbox','production')),provider text NOT NULL CHECK(provider='midtrans'),currency text NOT NULL CHECK(currency='IDR'),amount_idr bigint NOT NULL CHECK(amount_idr BETWEEN 1 AND 1000000000000),transaction_id text NOT NULL CHECK(length(transaction_id) BETWEEN 1 AND 128),verified_state text NOT NULL CHECK(verified_state IN ('pending','paid','failed','review_required')),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(order_id,environment,currency,amount_idr) REFERENCES public.domain_purchase_orders(order_id,environment,currency,amount_idr));
CREATE TABLE public.domain_registration_jobs(
 order_id text PRIMARY KEY REFERENCES public.domain_purchase_orders(order_id),user_id uuid NOT NULL REFERENCES auth.users(id),quote_id uuid NOT NULL REFERENCES public.domain_sale_quotes(id),amount_idr bigint NOT NULL,
 state text NOT NULL DEFAULT 'prepared' CHECK(state IN ('prepared','submitted','processing','blocked','action_required','succeeded','failed','review_required','conflict')),attempt_id uuid,post_started_at timestamptz,
 CHECK(state<>'prepared' OR (attempt_id IS NULL AND post_started_at IS NULL)));
ALTER TABLE public.domain_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_registration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_sale_quotes ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA public,auth TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.domain_purchase_orders,public.domain_checkout_sessions,public.domain_payment_events,public.domain_registration_jobs,public.domain_sale_quotes TO service_role;
