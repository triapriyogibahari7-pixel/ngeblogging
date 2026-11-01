-- PROPOSAL ONLY. Not an automatic migration. Do not execute in production.
-- Requires the separately reviewed reseller ledger tables to exist first.
-- Does not enable checkout, verify payments, implement refunds, or create orders.
-- Review together with the original draft; do not apply either independently.
BEGIN;
SET LOCAL lock_timeout = '2s';

-- Replace only the exact faulty equivalence constraint, never a guessed name.
DO $guard$
DECLARE constraint_name text; matches integer;
BEGIN
 IF current_user <> 'postgres' THEN RAISE EXCEPTION 'Owner review required'; END IF;
 IF to_regclass('public.domain_customer_purchase_orders') IS NULL
    OR to_regclass('public.domain_customer_order_events') IS NULL THEN
  RAISE EXCEPTION 'Reviewed reseller tables are missing; stop';
 END IF;
 SELECT count(*), min(conname::text) INTO matches, constraint_name
 FROM pg_constraint
 WHERE conrelid = 'public.domain_customer_purchase_orders'::regclass
   AND contype = 'c'
   AND pg_get_constraintdef(oid) = 'CHECK (((payment_state = ''paid''::text) = (midtrans_transaction_id IS NOT NULL)))';
 IF matches <> 1 THEN RAISE EXCEPTION 'Payment constraint differs from reviewed draft; stop'; END IF;
 EXECUTE format('ALTER TABLE public.domain_customer_purchase_orders DROP CONSTRAINT %I', constraint_name);
END;
$guard$;

-- Preserve transaction identity in pending/failure/refund states.
-- Match the existing payment handler's ID alphabet; never trim or rewrite IDs.
ALTER TABLE public.domain_customer_purchase_orders
 ADD CONSTRAINT reseller_paid_requires_transaction
 CHECK (payment_state <> 'paid' OR midtrans_transaction_id IS NOT NULL),
 ADD CONSTRAINT reseller_transaction_id_format
 CHECK (midtrans_transaction_id IS NULL OR
        (length(midtrans_transaction_id) BETWEEN 1 AND 128
         AND midtrans_transaction_id ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
         AND midtrans_transaction_id !~ '[[:space:][:cntrl:]]')),
 ADD CONSTRAINT reseller_transaction_identity_unique
 UNIQUE (environment, midtrans_transaction_id);

-- Source IDs are opaque. Preserve exact case/value; reject whitespace/controls.
-- PostgreSQL locale behavior and provider ID compatibility require integration tests.
ALTER TABLE public.domain_customer_order_events
 ADD CONSTRAINT reseller_source_event_id_format
 CHECK (source_event_id IS NULL OR
        (length(source_event_id) BETWEEN 1 AND 200
         AND source_event_id !~ '[[:space:][:cntrl:]]')),
 ADD CONSTRAINT reseller_webhook_requires_event_identity
 CHECK (actor_kind <> 'midtrans_webhook' OR source_event_id IS NOT NULL);

COMMIT;

-- REQUIRED POSTGRESQL TESTS BEFORE APPROVAL:
-- paid + NULL transaction: reject; paid + valid transaction: accept.
-- pending/failed/refund_pending/refunded + retained transaction: accept.
-- Empty, whitespace-padded, tab/newline/control-containing IDs: reject.
-- Transaction IDs of lengths 1/128: accept when alphabet matches; 129: reject.
-- Non-NULL event IDs of lengths 1/200: accept without whitespace/controls; 201: reject.
-- NULL event ID: reject for midtrans_webhook, allowed for other actors.
-- Duplicate transaction within environment: reject.
-- Identical order/event-kind/source-ID retry: unique conflict, not automatic no-op.
-- Handler/RPC must explicitly turn only a verified identical retry into a no-op.
-- This does not deduplicate across the legacy Cloudflare and reseller tables.
-- Shared reservation/payment binding remains a production blocker.
-- Registration transitions, refunds, pricing/consent snapshots, transactional RPCs
-- and PII retention remain outside this limited proposal.
-- Not database-tested; exact catalog definition guard intentionally fails closed.
