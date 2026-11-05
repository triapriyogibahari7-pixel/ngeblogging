-- Candidate supplement AFTER integration-v2; no production execution authorized.
BEGIN;
GRANT UPDATE(acceptance_policy,checkout_anchor_at,checkout_expires_at,accepted_payload_sha256,accepted_schema_sha256,accepted_terms_version) ON public.domain_order_recoveries_v1 TO service_role;
-- Legacy acceptance timestamps, previous quote/amount and consent audit remain immutable to this role.
COMMIT;
