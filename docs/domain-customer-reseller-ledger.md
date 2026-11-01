# Reseller order ledger design (proposal)

## Status and scope

This is a design proposal for a separate registrar-reseller lifecycle. Existing production migrations require `provider_id='cloudflare'` and existing registration jobs use Cloudflare-specific RPCs. Do not route OpenSRS quote receipts into those RPCs or create a second registration flow that claims to be compatible.

The adjacent `20261101082000_domain_customer_reseller_order_ledger_v1.sql` draft is **not production-ready**. It has static contract tests only. It has not been compared with the live Supabase schema, run in a migration dry-run, or reviewed by the database owner. It must not be applied without that review.

## Proposed immutable order snapshot

The customer order must bind, at a minimum:

- authenticated `user_id` and active `site_id`;
- provider ID, environment, reseller-account reference, and canonical domain;
- one-year registration operation, final IDR amount, provider-cost amount/currency, the verified FX snapshot and version, tax basis, direct costs, payment-fee policy, and pricing-policy version;
- review-receipt digest, quote expiry, registrant payload digest, terms version, and consent timestamp;
- an owner-scoped idempotency key and immutable Midtrans amount/currency.

The current draft stores only part of this snapshot. A later reviewed migration must add or normalize missing cost/tax/FX provenance before relying on the ledger for margin or accounting assertions.

## State model

Keep three axes separate:

1. Payment: pending, paid, failed/expired/cancelled, or refund/review handling.
2. Registrar registration: not started, queued/submitted, processing, registered, failed, or review required.
3. Order resolution: awaiting payment, payment review, registration review, complete, or closed.

A Midtrans callback alone must not mark a domain registered. A successful registrar response alone must not mark payment paid. Webhook delivery must be authenticated and idempotent; after an ambiguous registrar create timeout, query/reconcile the same registrar order before any retry. Do not issue an automatic second create request.

## Site binding and domain attachment

The active `site_id` is recorded in the order snapshot and cannot be replaced by a later browser request. Following a verified registration receipt, a separate server-side attach operation must recheck current ownership, site state, and domain reservation, then store the installed-domain mapping. Existing DNS/nameserver values must only be displayed when returned and validated; never manufacture branded nameservers.

Moving an installed domain between owned sites is a separate operation from moving a registrar registration between providers. Registrant transfer-in/out and renewal each require their own support, pricing, consent, and provider workflow.

## Checkout gate

Checkout remains disabled until:

- the reseller account, supported extensions, account currency and tax basis are verified;
- an approved pricing snapshot produces the exact displayed sale price and fee/margin calculation;
- a durable receipt/quote-to-order transaction has owner-scoped idempotency and unique domain reservation;
- registrant requirements and genuine provider terms are validated;
- Midtrans merchant credentials, callback verification, refund/review process, and the registrar billing balance are configured and reconciled;
- database migration dry-run, RLS/privilege review, API tests, browser tests, and rollback procedure pass.

The UI receipt token is not an order, payment intent, consent record, replay ledger, or authorization to provision. No checkout, payment, live registrar write, or database change is enabled by this proposal.
