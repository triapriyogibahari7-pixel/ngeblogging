# OpenSRS registrant consent contract — proposal only

## Verified repository state

The existing reseller ledger proposal is present at docs/domain-customer-reseller-ledger.md. It explicitly describes an incomplete, non-production-ready snapshot. This contract does not apply or modify its SQL. Prior conversation statements that no draft had been saved were incorrect.

The existing src/domain-purchase-model.mjs pins Cloudflare terms and requires providerId=cloudflare. Its registrant policy and checkout functions must not be reused as OpenSRS authorization.

## Required policy response

A future authenticated backend must verify current site ownership and active state, then return a provider/account/environment/domain/extension-scoped policy. Bind the authenticated owner and site, registrar requirements schema and digest, policy expiry, and genuine applicable terms with version, URL and content digest. No fabricated local terms URL or client-selected terms version is acceptable. Unknown extension requirements fail closed. Do not expose service credentials or unrelated account data in prefill.

## Consent and order transaction

The browser may temporarily hold editable registrant fields in memory. Do not persist contact data in localStorage or sessionStorage. Reset acceptance when identity, site, domain, registrant fields, terms, schema, price or review changes. Browser validation is usability only, not proof of valid provider data or durable consent.

Before any order is created, the backend must independently verify receipt signature, owner/site/provider/account/domain/environment binding, quote and FX expiry, exact amount and pricing provenance, extension requirements, registrant payload, and explicit acceptance of the current applicable terms. Recheck ownership in the transaction. Atomically store immutable quote evidence, canonical registrant payload digest, schema digest, terms evidence, server consent timestamp, site binding, owner-scoped idempotency and a domain reservation. Retries with the same key and changed input must fail rather than overwrite consent. Coordinate reservations with existing provider ledgers; a separate table-local unique index alone is insufficient.

## Payment and reconciliation

Keep transaction identity independent of payment status; pending, failed or refunded transactions may still require their identifiers for reconciliation. Authenticate callbacks and independently verify gateway state and exact merchant/order/environment/currency/amount before recording payment. Event deduplication identifiers must be mandatory for external deliveries. Paid does not imply registered.

After an ambiguous registrar submission, reconcile the same attempt and provider reference; never automatically create a second registration. Keep failure, manual review and refund evidence. Do not enable checkout until transactional RPCs, privileges, PII retention, concurrency and recovery tests, migration drift checks and database-owner review pass.

## Implementation status

This document adds no endpoint, form, stored consent, checkout, payment, registration or database change. Experimental local code from the conversation was not committed or integration-tested and is not an implementation of this contract.
