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

-- One-way implication: preserve transaction identity in pending/failure/refund states.
ALTER TABLE public.domain_customer_purchase_orders
 ADD CONSTRAINT reseller_paid_requires_transaction
 CHECK (payment_state <> 'paid' OR midtrans_transaction_id IS NOT NULL),
 ADD CONSTRAINT reseller_transaction_id_nonempty
 CHECK (midtrans_transaction_id IS NULL OR length(btrim(midtrans_transaction_id)) BETWEEN 1 AND 128),
 ADD CONSTRAINT reseller_transaction_identity_unique
 UNIQUE (environment, midtrans_transaction_id);

-- Existing UNIQUE(order_id,event_kind,source_event_id) cannot deduplicate NULL IDs.
ALTER TABLE public.domain_customer_order_events
 ADD CONSTRAINT reseller_webhook_requires_event_identity
 CHECK (actor_kind <> 'midtrans_webhook' OR
        (source_event_id IS NOT NULL AND length(btrim(source_event_id)) BETWEEN 1 AND 200));

COMMIT;

-- REQUIRED TEST CASES BEFORE APPROVAL:
-- paid + NULL transaction: reject; paid + valid transaction: accept.
-- pending/failed/refund_pending/refunded + retained transaction: accept.
-- blank transaction: reject; duplicate transaction within environment: reject.
-- webhook + NULL/blank source event: reject; identical event retry: conflict/no-op.
-- This does not deduplicate across the legacy Cloudflare and reseller tables.
-- A shared reservation/payment binding strategy remains a production blocker.
-- Registration transitions, refund reconciliation, pricing/consent snapshots,
-- transactional RPCs and PII retention remain outside this limited proposal.
-- Not database-tested; exact catalog definition guard intentionally fails closed.
