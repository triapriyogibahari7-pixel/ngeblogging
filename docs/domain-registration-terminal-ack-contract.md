# Repeated registration success acknowledgement

## Finding

The original domain_observe_production_registration RPC has a short early return when the ledger state is succeeded. It omits environment and observation_recorded, while the registration processor's observe function requires both. A valid repeated successful workflow observation can consequently be treated as unverified. Earlier local mock-based processor tests did not reproduce this short SQL response and do not prove SQL/processor integration.

## Narrow change

The new migration replaces exactly that early-return acknowledgement using an anchor checked against the actual function definition. A different definition causes an exception and stops migration execution. The reply identifies production, acknowledges existing terminal evidence with observation_recorded=true and observation_reused=true, and only confirms registration when the order is registered and still paid. registration_action_taken stays false. No new ledger observation or provider request occurs in this terminal branch.

This does not change claim locks, registration permissions, grants, payment events, job creation, site associations or provider activation. It does not repair the separate stale_ignored response branch; that contract remains a release-review item.

## Verification limits

The added Node tests are source-contract checks only, not PostgreSQL execution. This migration has not been applied to Supabase or verified against live function definitions. Before application, test fresh and already-succeeded paths in isolated PostgreSQL, verify existing privileges, payment-state changes and concurrent observations, and run processor integration against real RPC responses. Never treat local mock tests as proof of live SQL behavior.

## Site installation remains separate

The inspected order handler accepts only quoteId and idempotencyKey; the inspected registration ledger records user and quote but no target site. Automatic installation requires a durable, server-authorized order-to-site binding and revalidation of site ownership. Do not infer the destination from the browser's currently selected site after payment. Registration confirmation alone is not proof of DNS, HTTPS, routing or installation success.
