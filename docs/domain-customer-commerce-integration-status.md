# Customer domain commerce integration status

Status at this change: search and review display implementation is committed on the integration branch. Build, offline regression, live registrar behavior and production deployment are separate evidence categories. No result is claimed until its corresponding run is inspected.

## Current boundary

- Customer search and review keep `amountIdr` authoritative. USD is an indicative equivalent using the server pricing snapshot, rounded upward to a cent. It is not a second payment currency.
- The review endpoint rechecks the domain and returns an NDR2 receipt. Its signed claims bind owner, site, domain, registrar provider, opaque registrar account reference, IDR amount and lifetime.
- FX display metadata is outside the NDR2 claims. The browser checks consistency and expiry but does not authenticate the HMAC. Display metadata is never payment authorization.
- Review and search return purchase/checkout disabled flags. Selecting a name or changing display currency creates neither an order nor a payment.

## Checkout integration blockers found by source inspection

1. `server/domain-order-preview-handler.mjs` accepts `quoteId` and `idempotencyKey`, not an NDR2 review token. No receipt-to-persisted-quote bridge has been implemented by these display changes.
2. Its production order response validator explicitly requires `provider_id === 'cloudflare'`. This is not a provider-neutral checkout contract.
3. `server/domain-quote-preview-handler.mjs` creates a persisted sale quote through the Cloudflare check flow and uses a separate pricing snapshot binding. It is not the customer review flow.
4. `server/domain-checkout-preview-handler.mjs` starts from an existing order ID and uses storage RPCs. A valid review token alone cannot be substituted for that order.
5. The legacy sale quote contract rounds USD into IDR. Converting an already rounded IDR price to an upward-rounded USD display and back may change the amount. Do not feed the indicative USD equivalent into the legacy formula as if it preserves the reviewed IDR amount.

These are code-contract findings, not observations of production database contents, enabled bindings, registrar execution or successful payments.

## Required before connecting a payment button

- Authenticate the caller and revalidate site ownership; server-verify NDR2 with the expected provider and account reference.
- Recheck pricing, FX, costs and actual registration capability for that exact provider/account. A lookup-only capability is not permission to charge for registration.
- Define a persisted quote/order contract preserving authoritative IDR, site, provider/account, provenance, expiry and explicit customer consent. Inspect the real schema/RPC contract before choosing a migration.
- Consume review/quote authorizations atomically with an idempotency/replay ledger. Handle uncertain writes and payment outcomes without a new automatic purchase attempt.
- Verify payment notification, registration processing, order status and site attachment against the same provider/account and site. Do not silently reroute to another registrar.
- Keep checkout unavailable until the contract, storage and fulfillment path have been verified. Do not enable production bindings merely because a display build succeeds.

## Added regression gate

`tests/domain-customer-display-regression.test.mjs` uses deterministic offline fixtures, including an explicitly artificial FX rate. Those values are never production configuration or customer prices. It exercises exact currency arithmetic, expiry, malformed metadata, model distribution, coverage reporting, server HMAC bindings and browser payload consistency.

The dedicated GitHub Actions workflow runs the offline tests and application build on relevant branch pushes and pull requests. It has a read-only repository token, references no production secrets, and contains no deployment or live registrar/payment step. Dependency installation and checkout still require normal CI network access. This does not prove end-to-end checkout works.

At proposal time these new tests have not been executed manually. Inspect the CI run after the commit before reporting a pass or build success.
